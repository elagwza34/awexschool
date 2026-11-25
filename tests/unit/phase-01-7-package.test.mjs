import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (name) => readFileSync(new URL(name, root), "utf8");
const optional = (name) => (existsSync(new URL(name, root)) ? read(name) : "");

const proposal = read("06_PHASE_01_7_REMEDIATION_PROPOSAL.sql");
const migration = optional("06_PHASE_01_7_MIGRATION.sql");
const verification = optional("07_PHASE_01_7_VERIFICATION.sql");
const rollback = optional("08_PHASE_01_7_ROLLBACK.sql");

const sqlBody = (sql) => sql.slice(sql.search(/^begin;/im));
const verifierCheck = (id) => {
  const start = verification.indexOf(`('${id}', $q$`);
  return start < 0 ? "" : verification.slice(start, verification.indexOf("$q$),", start));
};

test("all Phase 01.7 SQL artifacts exist and the migration retains the manual approval boundary", () => {
  assert.notEqual(migration.length, 0);
  assert.notEqual(verification.length, 0);
  assert.notEqual(rollback.length, 0);
  assert.match(migration, /MANUAL SUPABASE SQL EDITOR EXECUTION ONLY/i);
  assert.match(migration, /NOT APPROVED OR EXECUTED/i);
  assert.match(migration, /Do not rerun 20261124010000/i);
  assert.doesNotMatch(migration, /insert into supabase_migrations\.schema_migrations/i);
});

test("the executable migration body is identical to the independently audited proposal", () => {
  assert.equal(sqlBody(migration), sqlBody(proposal));
});

test("assertion blocks do not read a loop record before its first assignment", () => {
  for (const name of ["preflight", "final_assertions"]) {
    const start = proposal.search(new RegExp(`do \\$${name}\\$`, "i"));
    const body = start < 0 ? "" : proposal.slice(start, proposal.indexOf(`$${name};`, start));
    assert.notEqual(body.length, 0, `missing assertion block: ${name}`);
    const firstLoop = body.search(/for\s+expected\s+in\b/i);
    assert.notEqual(firstLoop, -1, `missing expected loop: ${name}`);
    assert.doesNotMatch(body.slice(0, firstLoop), /\bexpected\./i, `record read before assignment: ${name}`);
  }
});

test("final function assertions resolve type-only signatures instead of comparing named identity arguments", () => {
  const start = proposal.search(/do \$final_assertions\$/i);
  const assertions = start < 0 ? "" : proposal.slice(start, proposal.indexOf("$final_assertions$;", start));
  const functionLoop = assertions.slice(assertions.search(/for\s+expected\s+in/i), assertions.search(/if\s+has_function_privilege/i));
  assert.match(functionLoop, /p\.oid\s*=\s*to_regprocedure\(format\(\s*'%I\.%I\(%s\)',\s*expected\.schema_name,\s*expected\.function_name,\s*expected\.arguments\s*\)\)::oid/i);
  assert.doesNotMatch(functionLoop, /pg_get_function_identity_arguments\(p\.oid\)\s*=\s*expected\.arguments/i);
});

test("preflight verifies the canonical column-level teacher application update privilege", () => {
  const start = proposal.search(/do \$preflight\$/i);
  const preflight = start < 0 ? "" : proposal.slice(start, proposal.indexOf("$preflight$;", start));
  assert.match(preflight, /has_column_privilege\('service_role', 'public\.teacher_applications', 'status', 'UPDATE'\)/i);
  assert.doesNotMatch(preflight, /has_table_privilege\('service_role', 'public\.teacher_applications', 'UPDATE'\)/i);
});

test("preflight generates identity queries that also run on the canonical baseline", () => {
  const start = proposal.search(/do \$preflight\$/i);
  const preflight = start < 0 ? "" : proposal.slice(start, proposal.indexOf("$preflight$;", start));
  assert.match(preflight, /execute format\(\$preflight_members\$[\s\S]*?\$preflight_members\$/i);
  assert.match(preflight, /execute format\(\$preflight_requests\$[\s\S]*?\$preflight_requests\$/i);
  assert.match(preflight, /has_student_identity boolean/i);
  assert.match(preflight, /case when has_student_identity then 'e\.student_id' else 'null::uuid' end/i);
  const staticSql = preflight
    .replace(/\$preflight_members\$[\s\S]*?\$preflight_members\$/gi, "")
    .replace(/\$preflight_requests\$[\s\S]*?\$preflight_requests\$/gi, "");
  assert.doesNotMatch(staticSql.replace(/'[^']*'/g, "''"), /\be\.student_id\b/i);
});

test("the Phase 01.7 verifier is read-only and returns one isolated-error JSON result", () => {
  assert.match(verification, /^begin transaction read only;/im);
  assert.match(verification, /get stacked diagnostics/i);
  assert.match(verification, /set_config\('liveschool\.phase_01_7_verification_result'/i);
  assert.match(verification, /select current_setting\('liveschool\.phase_01_7_verification_result', true\)::jsonb/i);
  assert.match(verification, /commit;\s*$/i);
  assert.doesNotMatch(verification, /^\s*(insert|update|delete|alter|create|drop|grant|revoke|truncate)\b/im);
});

test("the verifier covers baseline, authorization, integrity, attendance, and history contracts", () => {
  for (const id of [
    "environment",
    "required_tables_and_rls",
    "identity_columns_and_indexes",
    "function_contracts",
    "privilege_contracts",
    "policy_contracts",
    "trigger_contracts",
    "enrollment_invariants",
    "group_invariants",
    "review_and_intake_contracts",
    "attendance_baseline_preserved",
    "history_and_account_counts",
    "catalog_fingerprints",
  ]) {
    assert.ok(verification.includes(`('${id}', $q$`), `missing verifier contract: ${id}`);
  }
  assert.match(verification, /approved_without_membership_or_reviewer/i);
  assert.match(verification, /supabase_migrations\.schema_migrations/i);
  assert.match(verification, /auth\.users/i);
});

test("the verifier does not present static catalog checks as real runtime authorization evidence", () => {
  assert.match(verification, /'real_jwt_rls_tested', false/i);
  assert.match(verification, /'postgrest_tested', false/i);
  assert.match(verification, /'concurrency_tested', false/i);
  assert.match(verification, /'browser_tested', false/i);
  assert.match(verification, /'manual_runtime_validation_required', true/i);
  assert.match(verification, /'overall_status', case[\s\S]*?'schema_checks_passed'/i);
});

test("rollback requires explicit operator approval and one exact mode", () => {
  assert.match(rollback, /liveschool\.phase_01_7_rollback_approval/i);
  assert.match(rollback, /phase_01_7_operator_approved/i);
  assert.match(rollback, /liveschool\.phase_01_7_rollback_mode/i);
  assert.match(rollback, /pre_write_inverse/i);
  assert.match(rollback, /post_write_forward/i);
  assert.match(rollback, /rollback_refused/i);
});

test("rollback refuses an inverse when authoritative identity or audit data exists", () => {
  assert.match(rollback, /rollback_refused_new_authoritative_enrollment/i);
  assert.match(rollback, /rollback_refused_new_intake_identity/i);
  assert.match(rollback, /rollback_refused_new_review_history/i);
  assert.match(rollback, /rollback_refused_new_intake_history/i);
  assert.match(rollback, /student_id is not null/i);
  assert.match(rollback, /requester_id is not null/i);
});

test("post-write recovery preserves identity, review, challenge, and rate-limit data", () => {
  assert.match(rollback, /forward_reconciliation_required/i);
  assert.match(rollback, /'data_removed', false/i);
  assert.match(rollback, /'preserve_authoritative_identity', true/i);
  assert.match(rollback, /'preserve_review_events', true/i);
  assert.match(rollback, /'preserve_intake_history', true/i);
  const forwardBranch = rollback.match(/if v_mode = 'post_write_forward' then[\s\S]*?\breturn;/i)?.[0] ?? "";
  assert.notEqual(forwardBranch.length, 0);
  assert.doesNotMatch(forwardBranch, /\b(drop|delete|truncate|alter)\b/i);
});

test("the pre-write inverse restores baseline RPC signatures and leaves the canonical baseline intact", () => {
  assert.match(rollback, /create or replace function public\.save_learning_group\(\s*p_actor uuid/i);
  assert.match(rollback, /create or replace function public\.complete_teacher_onboarding\(\s*p_actor uuid/i);
  assert.match(rollback, /drop function public\.request_course_enrollment\(uuid, uuid\)/i);
  assert.match(rollback, /create policy "Requesters can read their own course enrollments"/i);
  assert.match(rollback, /create policy "Read published lessons"/i);
  const reviewGrant = rollback.indexOf("grant execute on function public.review_course_enrollment_as_admin(uuid, uuid, text) to authenticated");
  const reviewRevoke = rollback.lastIndexOf("revoke all on function public.review_course_enrollment_as_admin(uuid, uuid, text)");
  const reviewCreate = rollback.indexOf("create or replace function public.review_course_enrollment_as_admin(");
  assert.ok(reviewCreate >= 0 && reviewRevoke > reviewCreate && reviewRevoke < reviewGrant, "recreated baseline RPC must revoke PUBLIC execution before its exact grant");
  for (const [name, signature] of [
    ["save_learning_group", "uuid, uuid, uuid, uuid, text, integer, bigint, integer, time, boolean, uuid[]"],
    ["complete_teacher_onboarding", "uuid, uuid, uuid, jsonb"],
  ]) {
    const create = rollback.indexOf(`create or replace function public.${name}(`);
    const revoke = rollback.lastIndexOf(`revoke all on function public.${name}(${signature})`);
    const grant = rollback.indexOf(`grant execute on function public.${name}(${signature})`);
    assert.ok(create >= 0 && revoke > create && revoke < grant, `${name} must revoke PUBLIC execution after recreation`);
  }
  assert.doesNotMatch(rollback, /delete from supabase_migrations\.schema_migrations/i);
  assert.doesNotMatch(rollback, /truncate/i);
});

test("the verifier checks the unique index structurally instead of matching formatted index text", () => {
  const check = verifierCheck("identity_columns_and_indexes");
  assert.match(check, /from pg_index i/i);
  assert.match(check, /i\.indisunique/i);
  assert.match(check, /i\.indpred is not null/i);
  assert.match(check, /pg_get_expr\(i\.indpred, i\.indrelid\)/i);
  assert.match(check, /unnest\(i\.indkey::smallint\[\]\)[\s\S]*?array_agg\([^\n]+order by/i);
  assert.doesNotMatch(check, /i\.indkey::smallint\[\]\s*=\s*array\[/i);
  assert.doesNotMatch(check, /pg_indexes/i);
  assert.doesNotMatch(check, /indexdef ilike/i);
});

test("policy contracts validate permissive expressions and cast policy roles", () => {
  const check = verifierCheck("policy_contracts");
  assert.match(check, /p\.roles = expected\.roles::name\[\]/i);
  assert.match(check, /p\.permissive = 'PERMISSIVE'/i);
  assert.match(check, /p\.with_check is null/i);
  assert.match(check, /regexp_replace\(coalesce\(p\.qual, ''\), '\\s\+', ' ', 'g'\)/i);
  assert.match(check, /missing_or_incorrect/i);
});

test("catalog fingerprints use independent catalog queries", () => {
  const check = verifierCheck("catalog_fingerprints");
  for (const name of ["columns_fingerprint", "policies_fingerprint", "functions_fingerprint", "constraints_fingerprint"]) {
    assert.match(check, new RegExp(`${name} as \\(`, "i"));
  }
  assert.doesNotMatch(check, /from \(select 1\) seed/i);
  assert.match(check, /length\(column_fingerprint\) = 32/i);
});

test("invariant pass conditions include review metadata and approved group membership", () => {
  const enrollment = verifierCheck("enrollment_invariants");
  const group = verifierCheck("group_invariants");
  assert.match(enrollment, /count\(\*\) filter \(\s*where status in \('active', 'declined'\)[\s\S]*?reviewed_by is null or reviewed_at is null[\s\S]*?\) = 0/i);
  assert.match(group, /where r\.status = 'approved' and \([\s\S]*?r\.reviewed_by is null or r\.reviewed_at is null[\s\S]*?\)\) = 0/i);
});

test("function contracts retain and report unsafe existing functions", () => {
  const check = verifierCheck("function_contracts");
  assert.match(check, /as valid\b/i);
  assert.match(check, /count\(\*\) filter \(where valid\)/i);
  assert.match(check, /filter \(where not valid\)/i);
  assert.doesNotMatch(check, /^\s*where p\.oid is null/im);
});

test("the public lesson RPC is exposed to authenticated callers and group teachers require an active group", () => {
  assert.match(proposal, /create or replace function public\.can_read_course_lessons\(p_course_id uuid\)/i);
  assert.match(proposal, /from public\.learning_groups lg[\s\S]*?lg\.active = true/i);
  assert.match(proposal, /grant execute on function public\.can_read_course_lessons\(uuid\) to authenticated/i);
  assert.match(verification, /has_function_privilege\('authenticated', 'public\.can_read_course_lessons\(uuid\)', 'EXECUTE'\)/i);
  assert.match(verification, /has_function_privilege\('anon', 'public\.can_read_course_lessons\(uuid\)', 'EXECUTE'\)/i);
});

test("rollback removes dependent policies before helpers and restores exact baseline grants", () => {
  const helperDrop = rollback.indexOf("drop function if exists liveschool_internal.has_active_role");
  for (const policy of [
    "Administrators can read course enrollments",
    "Administrators can read enrollment review events",
    "Administrators can read teacher applications",
  ]) {
    const policyDrop = rollback.indexOf(`drop policy if exists "${policy}"`);
    assert.ok(policyDrop >= 0 && policyDrop < helperDrop, `${policy} must be dropped before its helper`);
  }
  assert.match(rollback, /drop function if exists public\.can_read_course_lessons\(uuid\)/i);
  const reviewTriggerDrop = rollback.indexOf("drop trigger if exists enrollment_review_events_immutable");
  assert.ok(reviewTriggerDrop >= 0 && reviewTriggerDrop < helperDrop, "review-event trigger must be dropped before its helper");
  assert.match(rollback, /grant select, insert on public\.teacher_applications to service_role/i);
  assert.match(rollback, /grant select, insert on public\.course_enrollments to service_role/i);
  assert.doesNotMatch(rollback, /grant insert, update on public\.teacher_applications to service_role/i);
});

test("migration runtime evidence distinguishes PGlite success from Supabase validation", () => {
  assert.match(migration, /PGlite[\s\S]*PostgreSQL 19[\s\S]*succeeded/i);
  assert.match(migration, /PostgreSQL 17\.11[\s\S]*unverified/i);
  assert.match(migration, /PostgREST[\s\S]*unverified/i);
});
