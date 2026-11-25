import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const path = new URL("../../06_PHASE_01_7_REMEDIATION_PROPOSAL.sql", import.meta.url);
const proposal = existsSync(path) ? readFileSync(path, "utf8") : "";

const functionBody = (schema, name) => {
  const escaped = `${schema}.${name}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = proposal.match(new RegExp(`create or replace function ${escaped}\\([\\s\\S]*?as \\$function\\$([\\s\\S]*?)\\$function\\$;`, "i"));
  return match?.[1] ?? "";
};

test("the remediation proposal exists and is explicitly review-only", () => {
  assert.equal(existsSync(path), true);
  assert.match(proposal, /REVIEW ONLY/i);
  assert.match(proposal, /DO NOT EXECUTE/i);
  assert.match(proposal, /not an applied migration/i);
});

test("the remediation proposal is transactional with preflight and final assertions", () => {
  assert.match(proposal, /^begin;/im);
  assert.match(proposal, /preflight/i);
  assert.match(proposal, /raise exception/i);
  assert.match(proposal, /final assertions/i);
  assert.match(proposal, /commit;\s*$/i);
});

test("the proposal adds authoritative enrollment and intake identities without backfilling legacy rows", () => {
  assert.match(proposal, /alter table public\.course_enrollments\s+add column if not exists student_id uuid/i);
  assert.match(proposal, /alter table public\.teacher_applications\s+add column if not exists requester_id uuid/i);
  assert.match(proposal, /course_enrollments_student_course_active_idx/i);
  assert.doesNotMatch(proposal, /update public\.course_enrollments\s+set student_id/i);
  assert.doesNotMatch(proposal, /update public\.course_enrollments\s+set reviewed_by\s*=\s*coalesce/i);
});

test("new privileged RPCs bind actors to auth uid and replace caller supplied actor signatures", () => {
  assert.match(proposal, /create or replace function public\.save_learning_group\(\s*p_group uuid/i);
  assert.match(proposal, /create or replace function public\.complete_teacher_onboarding\(\s*p_user uuid/i);
  assert.match(proposal, /drop function public\.save_learning_group\(uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid\[\]\)/i);
  assert.match(proposal, /drop function public\.complete_teacher_onboarding\(uuid, uuid, uuid, jsonb\)/i);
  assert.match(proposal, /actor_id uuid := \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(proposal, /create or replace function public\.(?:save_learning_group|complete_teacher_onboarding)\([^)]*\bp_actor\b/i);
});

test("course archive and enrollment activation share a database owned guard", () => {
  assert.match(proposal, /prevent_course_archive_with_active_enrollments/i);
  assert.match(proposal, /before update of status on public\.courses/i);
  assert.match(proposal, /for update/i);
  assert.match(proposal, /course_archive_active_enrollments/i);
});

test("lesson bodies are authenticated and enrollment aware", () => {
  assert.match(proposal, /can_read_course_lessons/i);
  assert.match(proposal, /create policy "Read authorized course lessons" on public\.lessons/i);
  assert.match(proposal, /revoke select on public\.lessons from anon/i);
  assert.match(proposal, /grant select on public\.lessons to authenticated/i);
});

test("group membership and capacity include active enrollment and live holds", () => {
  assert.match(proposal, /has_active_course_enrollment/i);
  assert.match(proposal, /group_occupied_seats/i);
  assert.match(proposal, /status = 'paid' or \(status = 'reserved' and expires_at > p_at\)/i);
  assert.match(proposal, /enforce_group_capacity/i);
  assert.match(proposal, /validate_group_member_enrollment/i);
});

test("teacher intake uses one time server verified challenges and restricted tracking", () => {
  assert.match(proposal, /create table if not exists public\.teacher_intake_challenges/i);
  assert.match(proposal, /create or replace function public\.submit_teacher_application/i);
  assert.match(proposal, /create or replace function public\.track_teacher_application/i);
  assert.match(proposal, /consumed_at is null/i);
  assert.match(proposal, /email_confirmed_at/i);
  assert.match(proposal, /revoke insert, update on public\.teacher_applications from service_role/i);
});

test("legacy review provenance is preserved and acknowledged separately", () => {
  assert.match(proposal, /create table if not exists public\.course_enrollment_review_events/i);
  assert.match(proposal, /legacy_unreviewed/i);
  assert.match(proposal, /acknowledge_legacy_enrollment_as_admin/i);
  assert.match(proposal, /reject_enrollment_review_event_mutation/i);
});

test("the proposal does not activate disabled workflows or unrelated features", () => {
  assert.doesNotMatch(proposal, /create publication/i);
  assert.doesNotMatch(proposal, /insert into storage\.buckets/i);
  assert.doesNotMatch(proposal, /create table[^;]*direct_chat/i);
  assert.doesNotMatch(proposal, /create table[^;]*notifications/i);
  assert.match(proposal, /revoke all on function public\.reserve_group_seat/i);
  assert.match(proposal, /revoke all on function public\.approve_group_join_request_as_admin/i);
});

test("the security invoker audit view has restricted underlying read privileges", () => {
  assert.match(proposal, /create or replace view public\.course_enrollment_review_audit\s+with \(security_invoker = true\)/i);
  assert.match(proposal, /create policy "Administrators can read enrollment review events" on public\.course_enrollment_review_events/i);
  assert.match(proposal, /grant select on public\.course_enrollment_review_events to authenticated, service_role/i);
  assert.match(proposal, /grant insert, select on public\.teacher_intake_challenges to service_role/i);
});

test("teacher intake throttling commits denied attempts instead of rolling them back", () => {
  const submit = functionBody("public", "submit_teacher_application");
  const track = functionBody("public", "track_teacher_application");
  assert.match(submit, /consume_teacher_intake_limit\('submit', 'user:'/i);
  assert.match(submit, /consume_teacher_intake_limit\('submit', 'ip:'/i);
  assert.match(track, /consume_teacher_intake_limit\('track', 'user:'/i);
  assert.match(track, /consume_teacher_intake_limit\('track', 'ip:'/i);
  assert.doesNotMatch(submit, /raise exception 'teacher_intake_rate_limited'/i);
  assert.doesNotMatch(track, /raise exception 'teacher_tracking_rate_limited'/i);
  assert.match(submit, /then\s+return null;\s+end if;/i);
  assert.match(track, /then\s+return null;\s+end if;/i);
});

test("group requests revalidate enrollment and exact succeeded payment evidence", () => {
  const requestGuard = functionBody("liveschool_internal", "prepare_group_request_write");
  assert.match(requestGuard, /group_student_enrollment_required/i);
  assert.match(requestGuard, /has_active_course_enrollment\(new\.student_id, group_course\)/i);
  assert.match(requestGuard, /gp\.status = 'succeeded'/i);
  assert.match(requestGuard, /gp\.amount_minor = new\.fee_minor/i);
  assert.match(requestGuard, /gp\.currency = 'EGP'/i);
});

test("enrollment requests surface unresolved legacy identity collisions", () => {
  const request = functionBody("public", "request_course_enrollment");
  assert.match(request, /enrollment_identity_unresolved/i);
  assert.match(request, /exception\s+when unique_violation then\s+return false;/i);
});

test("final assertions preserve null legacy identities and enable new table RLS", () => {
  assert.match(proposal, /remediation_final_legacy_identity_backfilled/i);
  assert.match(proposal, /remediation_final_intake_identity_backfilled/i);
  assert.match(proposal, /remediation_final_rls_disabled/i);
  assert.match(proposal, /relrowsecurity/i);
});

test("policy helpers remain executable while direct service role application updates are revoked", () => {
  assert.match(proposal, /grant execute on function liveschool_internal\.has_active_role\(uuid, text\[\]\) to authenticated;/i);
  assert.match(proposal, /revoke update \(status\) on public\.teacher_applications from service_role;/i);
  assert.match(proposal, /has_column_privilege\('service_role', 'public\.teacher_applications', 'status', 'UPDATE'\)/i);
});

test("group approval revalidates payment and protects request review metadata", () => {
  const requestGuard = functionBody("liveschool_internal", "prepare_group_request_write");
  assert.match(requestGuard, /if new\.status in \('paid', 'approved'\) and not exists/i);
  assert.match(proposal, /before insert or update of status, expires_at, group_id, student_id, fee_minor, reviewed_by, reviewed_at/i);
});

test("preflight and final assertions reject invalid approved requests and missing intake tables", () => {
  assert.match(proposal, /r\.status in \('reserved', 'paid', 'approved'\)/i);
  assert.match(proposal, /r\.status in \('paid', 'approved'\)/i);
  assert.match(proposal, /r\.status = 'approved'[\s\S]*?r\.reviewed_by is null[\s\S]*?r\.reviewed_at is null/i);
  assert.match(proposal, /to_regclass\('public\.course_enrollment_review_events'\) is null/i);
  assert.match(proposal, /to_regclass\('public\.teacher_intake_challenges'\) is null/i);
  assert.match(proposal, /to_regclass\('public\.teacher_intake_rate_limits'\) is null/i);
});

test("authoritative enrollment policies remove the legacy requester read bypass", () => {
  assert.match(proposal, /drop policy if exists "Requesters can read their own course enrollments" on public\.course_enrollments;/i);
});

test("teacher review rejects null status and final assertions verify complete security contracts", () => {
  const review = functionBody("public", "review_teacher_application_as_admin");
  assert.match(review, /if p_status is null or p_status not in \('accepted', 'rejected'\) then/i);
  assert.match(proposal, /column_name = 'requester_id'[\s\S]*?data_type = 'uuid'/i);
  assert.match(proposal, /column_name = 'email_verified_at'[\s\S]*?data_type = 'timestamp with time zone'/i);
  assert.match(proposal, /\('liveschool_internal', 'has_active_role', 'uuid, text\[\]'\)/i);
  assert.match(proposal, /\('liveschool_internal', 'enforce_enrollment_review_audit', ''\)/i);
  assert.match(proposal, /\('public', 'course_enrollments', 'enrollment_review_audit', 'BEFORE', 23, 'liveschool_internal\.enforce_enrollment_review_audit\(\)'\)/i);
  assert.match(proposal, /t\.tgenabled = 'O'/i);
  assert.match(proposal, /t\.tgfoid = to_regprocedure\(expected\.function_signature\)/i);
});
