import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const migration = read("01_FULL_DATABASE_MIGRATION.sql");
const verification = read("02_DATABASE_VERIFICATION.sql");
const rollback = read("03_DATABASE_ROLLBACK.sql");
const report = read("04_DATABASE_IMPLEMENTATION_REPORT.md");

test("the unified migration is transactional and guarded before and after changes", () => {
  assert.match(migration, /^begin;/im);
  assert.match(migration, /preflight/i);
  assert.match(migration, /raise exception/i);
  assert.match(migration, /final assertions/i);
  assert.match(migration, /commit;\s*$/i);
  assert.match(migration, /create table if not exists public\.session_roster_snapshots/i);
  assert.match(migration, /create or replace function public\.record_session_attendance/i);
  assert.match(migration, /create or replace function public\.review_course_enrollment_as_admin/i);
});

test("the unified migration does not activate direct chat, attachments, notifications, payments, or realtime", () => {
  assert.doesNotMatch(migration, /create table[^;]*direct_chat/i);
  assert.doesNotMatch(migration, /create table[^;]*notifications/i);
  assert.doesNotMatch(migration, /insert into storage\.buckets/i);
  assert.doesNotMatch(migration, /create publication/i);
  assert.doesNotMatch(migration, /add column[^;]*attachment_name/i);
  assert.match(migration, /attachment_key is null/i);
  assert.match(migration, /group_id set not null/i);
});

test("the repository migration is synchronized with the SQL Editor migration", () => {
  assert.equal(
    read("supabase/migrations/20261124010000_unified_database_reconciliation.sql"),
    migration,
  );
});

test("unapplied legacy migrations cannot reintroduce direct chat or the weak enrollment RPC", () => {
  for (const name of [
    "20261123123000_add_chat_thread_insert_policies.sql",
    "20261123130000_restore_direct_chat.sql",
    "20261123140000_fix_chat_rls_participant_check.sql",
    "20261124000000_atomic_enrollment_review.sql",
  ]) {
    const sql = read(`supabase/migrations/${name}`);
    assert.doesNotMatch(sql, /create table[^;]*direct_chat/i);
    assert.doesNotMatch(sql, /create function public\.review_course_enrollment\s*\(/i);
    assert.doesNotMatch(sql, /insert into storage\.buckets/i);
    assert.match(sql, /superseded by 20261124010000_unified_database_reconciliation/i);
  }
});

test("verification is read-only and returns one consolidated JSON document", () => {
  assert.match(verification, /^begin transaction read only;/im);
  assert.match(verification, /set_config\('liveschool\.verification_result'/i);
  assert.match(verification, /select current_setting\('liveschool\.verification_result', true\)::jsonb/i);
  assert.match(verification, /commit;\s*$/i);
  assert.doesNotMatch(verification, /\b(insert|update|delete|alter|create|drop|grant|revoke|truncate)\b/i);
});

test("rollback refuses to destroy populated attendance or review history", () => {
  assert.match(rollback, /rollback_refused/i);
  assert.match(rollback, /session_attendance_events/i);
  assert.match(rollback, /reviewed_by is not null/i);
  assert.match(rollback, /commit;\s*$/i);
});

test("the implementation report distinguishes verified and unverified evidence", () => {
  assert.match(report, /runtime-unverified/i);
  assert.match(report, /production-observed/i);
  assert.match(report, /migration history/i);
  assert.match(report, /direct chat/i);
  assert.match(report, /rollback/i);
});

test("the migration directory contains only SQL migrations", () => {
  const directory = new URL("supabase/migrations/", root);
  const names = readdirSync(directory).filter((name) => !name.endsWith(".sql"));
  assert.deepEqual(names, []);
});

test("account creation preserves server-assigned application roles", () => {
  assert.match(migration, /new\.raw_app_meta_data ->> 'liveschool_role' in \(/i);
  assert.match(migration, /then new\.raw_app_meta_data ->> 'liveschool_role'/i);
  assert.match(migration, /when new\.raw_user_meta_data ->> 'account_kind' = 'parent'\s+then 'parent'\s+else 'student'/i);
});

test("parent attendance and public group filters have matching database privileges", () => {
  assert.match(migration, /create policy "Guardians can read their links" on public\.guardian_links/i);
  assert.match(migration, /create policy "Guardians can read linked student profiles" on public\.profiles/i);
  assert.match(migration, /public\.guardian_links,\s+public\.course_enrollments/i);
  assert.match(migration, /public\.chat_threads, public\.chat_participants, public\.chat_messages to authenticated/i);
  assert.match(migration, /grant select \(id, name, weekday, starts_at_local, timezone, course_id, active\)/i);
});

test("historical attendance authorization uses the frozen roster", () => {
  const helper = migration.match(/create or replace function liveschool_internal\.can_access_attendance_session[\s\S]*?\$function\$;/i)?.[0] ?? "";
  assert.match(helper, /from public\.session_roster_entries re/i);
  assert.match(helper, /re\.session_id = s\.id/i);
  assert.doesNotMatch(helper, /from public\.group_members gm/i);
});

test("unexpected public policies abort reconciliation instead of remaining permissive", () => {
  assert.match(migration, /unexpected_policies/i);
  assert.match(migration, /Unexpected public policies detected/i);
});

test("table and column grants use separate valid PostgreSQL statements", () => {
  assert.doesNotMatch(migration, /grant\s+[^;]*\bselect\b[^;]*\bupdate\s*\([^;]*to\s+service_role/i);
  assert.match(migration, /grant select, insert on public\.teacher_applications to service_role/i);
  assert.match(migration, /grant update \(status\) on public\.teacher_applications to service_role/i);
  assert.match(migration, /grant select, insert on public\.course_assignment_submissions to service_role/i);
  assert.match(migration, /grant update \(feedback\) on public\.course_assignment_submissions to service_role/i);
});

test("the public teacher directory uses a privileged helper and column checks", () => {
  assert.match(migration, /create or replace function liveschool_internal\.is_active_teacher\(p_user_id uuid\)/i);
  assert.match(migration, /using \(liveschool_internal\.is_active_teacher\(teacher_profiles\.user_id\)\)/i);
  assert.match(migration, /grant usage on schema liveschool_internal to anon, authenticated/i);
  assert.match(migration, /grant execute on function liveschool_internal\.is_active_teacher\(uuid\) to anon, authenticated/i);
  assert.match(verification, /has_column_privilege\('anon', 'public\.teacher_profiles', 'portrait_path', 'SELECT'\)/i);
  assert.doesNotMatch(verification, /has_table_privilege\([^\n]*SELECT\(/i);
});

test("reviewer identity and review metadata cannot be erased or rewritten", () => {
  assert.match(migration, /course_enrollments_reviewed_by_fkey[\s\S]*?on delete restrict/i);
  assert.match(migration, /new\.reviewed_by is distinct from old\.reviewed_by/i);
  assert.match(migration, /new\.reviewed_at is distinct from old\.reviewed_at/i);
  assert.match(migration, /if tg_op = 'INSERT' then[\s\S]*?new\.status <> 'pending'/i);
  assert.match(migration, /before insert or update of status, reviewed_by, reviewed_at on public\.course_enrollments/i);
});

test("disabled feature guards cover realtime and provider artifacts before commit", () => {
  assert.match(migration, /pg_publication_tables[\s\S]*?supabase_realtime/i);
  assert.match(migration, /Unapproved Realtime publication membership detected/i);
  assert.match(migration, /Unapproved notification, payment-provider, or meeting-provider artifacts detected/i);
  assert.match(verification, /notification_table_present/i);
  assert.match(verification, /payment_provider_table_present/i);
  assert.match(verification, /meeting_provider_columns_present/i);
});

test("realtime guards use publication view schema and table columns", () => {
  for (const sql of [migration, verification]) {
    assert.doesNotMatch(sql, /\bpt\.relid\b/i);
    assert.match(sql, /from pg_publication_tables pt[\s\S]*?pt\.schemaname = 'public'/i);
    assert.match(sql, /pt\.tablename = any\(/i);
  }
  assert.match(
    verification,
    /jsonb_agg\(pt\.schemaname \|\| '\.' \|\| pt\.tablename order by pt\.schemaname \|\| '\.' \|\| pt\.tablename/i,
  );
});

test("verification distinguishes the allowed chat insert from other writes", () => {
  assert.match(verification, /v_insert_policy_command text := 'IN' \|\| 'SERT'/i);
  assert.match(verification, /policy\.cmd = v_insert_policy_command/i);
  assert.match(verification, /tablename = 'chat_threads'[\s\S]*?cmd = any\(v_write_commands\)/i);
});

test("owner role assignment and anonymous settings have their required grants", () => {
  assert.match(migration, /grant update \(role_code\) on public\.account_roles to service_role/i);
  assert.match(migration, /grant select \(demo_enabled, social_links\) on public\.site_settings to anon/i);
  assert.match(verification, /has_column_privilege\('service_role', 'public\.account_roles', 'role_code', 'UP' \|\| 'DATE'\)/i);
  assert.match(verification, /has_column_privilege\('anon', 'public\.site_settings', 'social_links', 'SELECT'\)/i);
});

test("rollback removes every additive public catalog grant it claims to remove", () => {
  assert.match(rollback, /revoke select \(id, name, weekday, starts_at_local, timezone, course_id, active\)/i);
  assert.match(rollback, /revoke select \(demo_enabled, social_links\) on public\.site_settings from anon, authenticated/i);
  assert.match(rollback, /revoke execute on function liveschool_internal\.is_active_teacher\(uuid\)/i);
  assert.match(rollback, /revoke usage on schema liveschool_internal from anon/i);
});

test("required extensions are checked independently from unrelated installed extensions", () => {
  assert.match(
    verification,
    /count\(distinct extname\) from pg_extension\s+where extname in \('pgcrypto', 'uuid-ossp'\)\) = 2/i,
  );
  assert.doesNotMatch(verification, /bool_and\(extname in \('pgcrypto', 'uuid-ossp'\)\)/i);
});

test("function catalog checks use type-only identity arguments and schema-bound joins", () => {
  assert.match(verification, /'public', 'review_course_enrollment_as_admin', 'uuid, uuid, text'/i);
  assert.match(
    verification,
    /'public', 'save_learning_group', 'uuid, uuid, uuid, uuid, text, integer, bigint, integer, time without time zone, boolean, uuid\[\]'/i,
  );
  assert.match(verification, /left join pg_namespace ns on ns\.nspname = expected\.schema_name/i);
  assert.match(verification, /p\.pronamespace = ns\.oid/i);
  assert.doesNotMatch(verification, /'(?:p_course|p_session|account_id|p_actor|p_user_id|p_session_id) uuid(?:,|')/i);
});

test("function configuration checks use valid exact search_path array comparisons", () => {
  for (const sql of [migration, verification]) {
    const invalidPredicates = sql.match(/\bis\s+distinct\s+from\s+any\s*\(/gi) ?? [];
    assert.equal(invalidPredicates.length, 0, "IS DISTINCT FROM ANY is not valid PostgreSQL syntax");
  }
  const functionContract = verification.match(
    /with expected\(schema_name, function_name, arguments, definer\) as \(values[\s\S]*?into v_data, v_passed/i,
  )?.[0] ?? "";
  assert.notEqual(functionContract.length, 0, "the function configuration check must be present");
  assert.equal(
    functionContract.match(/coalesce\(p\.proconfig, '\{\}'::text\[\]\) = array\['search_path=""'\]/gi)?.length ?? 0,
    2,
    "matching count and overall status must require the exact function settings array",
  );
  assert.equal(
    functionContract.match(/coalesce\(p\.proconfig, '\{\}'::text\[\]\) <> array\['search_path=""'\]/gi)?.length ?? 0,
    1,
    "mismatch reporting must reject extra or missing function settings",
  );
});

test("catalog and constraint checks are schema-bound and compare complete foreign keys", () => {
  assert.doesNotMatch(verification, /left join pg_constraint con on con\.conname = expected\.constraint_name/i);
  assert.match(verification, /left join pg_constraint con on con\.conrelid = rel\.oid/i);
  assert.match(verification, /con\.contype = expected\.constraint_type/i);
  assert.match(
    verification,
    /FOREIGN KEY \(session_id, student_id\) REFERENCES session_roster_entries\(session_id, student_id\) ON DE' \|\| 'LETE RESTRICT/i,
  );
  assert.match(verification, /normalized_definition = regexp_replace\(expected\.definition/i);
});

test("canonical checks compare normalized complete expressions instead of fragments", () => {
  assert.match(verification, /pg_get_expr\(con\.conbin, con\.conrelid\)/i);
  assert.match(verification, /normalized_expression = expected\.normalized_expression/i);
  assert.doesNotMatch(verification, /missing_fragments/i);
});

test("canonical check expectations use PostgreSQL expanded range deparsing", () => {
  const contract = verification.match(
    /with expected\(table_name, constraint_name, normalized_expression\) as \(values[\s\S]*?\n\s*\)\n\s*select jsonb_build_object\(/i,
  )?.[0] ?? "";
  assert.notEqual(contract.length, 0, "the canonical check expectation values must be present");
  assert.match(
    contract,
    /'chat_messages', 'chat_messages_text_only_check', '\(\(attachment_keyISNULL\)AND\(\(char_length\(btrim\(body\)\)>=1\)AND\(char_length\(btrim\(body\)\)<=2000\)\)\)'/i,
  );
  assert.match(
    contract,
    /'courses', 'courses_title_length_check', '\(\(char_length\(btrim\(title\)\)>=3\)AND\(char_length\(btrim\(title\)\)<=160\)\)'/i,
  );
  assert.doesNotMatch(contract, /BETWEEN1AND2000/i);
  assert.doesNotMatch(contract, /BETWEEN3AND160/i);
});

test("RLS verification validates roles commands permissiveness and expressions", () => {
  assert.match(verification, /required\(table_name, policy_name, commands, roles,\s+using_null, check_null,\s+using_fragments, check_fragments, forbidden_fragments\)/i);
  assert.match(verification, /policy\.cmd = required\.commands/i);
  assert.match(verification, /policy\.permissive = 'PERMISSIVE'/i);
  assert.match(verification, /array_agg\(role order by role\)/i);
  assert.match(verification, /missing_using_fragments = '\[\]'::jsonb/i);
  assert.match(verification, /missing_check_fragments = '\[\]'::jsonb/i);
  assert.match(verification, /forbidden_fragments = '\[\]'::jsonb/i);
});

test("RLS expectations match pg_policies deparsed columns and expanded ranges", () => {
  const contract = verification.match(
    /with package_tables\(name\)[\s\S]*?'id', 'rls_policy_inventory'/i,
  )?.[0] ?? "";
  assert.notEqual(contract.length, 0, "the RLS policy contract must be present");
  assert.match(
    contract,
    /'chat_messages', 'Send messages to joined threads'[\s\S]*?array\[[^\]]*'char_length\(btrim\(body\)\) >= 1'[^\]]*'char_length\(btrim\(body\)\) <= 2000'[^\]]*'thread_id'\]/i,
  );
  for (const qualifiedColumn of [
    "chat_messages.thread_id",
    "chat_threads.id",
    "class_sessions.id",
    "session_attendance.session_id",
    "session_attendance_events.session_id",
    "session_roster_entries.session_id",
    "session_roster_snapshots.session_id",
    "teacher_profiles.user_id",
  ]) {
    assert.doesNotMatch(contract, new RegExp(`'${qualifiedColumn.replaceAll(".", "\\.")}'`, "i"));
  }
  assert.doesNotMatch(contract, /'between 1 and 2000'/i);
});

test("attendance rows require corresponding append-only event coverage", () => {
  assert.match(migration, /Existing attendance rows lack corresponding append-only events/i);
  assert.match(migration, /Attendance integrity assertions failed: missing markers, roster entries, or event coverage/i);
  assert.match(verification, /\(v_data->>'attendance_without_event'\)::integer = 0/i);
});

test("attendance verification compares current rows with their latest event", () => {
  assert.match(verification, /'attendance_event_mismatch'/i);
  assert.match(verification, /order by ae\.marked_at desc, ae\.id desc\s+limit 1/i);
  assert.match(verification, /sa\.status <> latest\.new_status/i);
  assert.match(verification, /sa\.marked_by <> latest\.marked_by/i);
  assert.match(verification, /sa\.marked_at <> latest\.marked_at/i);
  assert.match(verification, /\(v_data->>'attendance_event_mismatch'\)::integer = 0/i);
});

test("authenticated settings access is column-limited and verified", () => {
  assert.match(migration, /grant select \(demo_enabled, social_links\) on public\.site_settings to anon, authenticated/i);
  assert.match(migration, /revoke all \(id, demo_enabled, social_links\) on public\.site_settings/i);
  assert.doesNotMatch(migration, /grant select on public\.profiles, public\.account_roles, public\.roles, public\.site_settings/i);
  assert.match(verification, /authenticated_demo_enabled/i);
  assert.match(verification, /authenticated_social_links/i);
  assert.match(verification, /authenticated_full_table_select/i);
  assert.match(verification, /not has_table_privilege\('authenticated', 'public\.site_settings', 'SELECT'\)/i);
  assert.match(migration, /Settings read privileges do not match the public-column contract/i);
});

test("the disabled attachment helper cannot retain executable privileges", () => {
  const executableGuard = verification.match(/direct_chat_functions_executable[\s\S]*?\n\s*\)\n\s*\)/i)?.[0] ?? "";
  assert.match(executableGuard, /can_access_chat_attachment/i);
});

test("rollback is repeatable and guards every meaningful enrollment review state", () => {
  assert.doesNotMatch(rollback, /revoke execute on function liveschool_internal\.can_access_attendance_session/i);
  assert.match(rollback, /drop function if exists liveschool_internal\.can_access_attendance_session\(uuid\)/i);
  assert.match(rollback, /reviewed_at is not null/i);
  assert.match(rollback, /status <> 'pending'/i);
});

test("canonical check comparisons qualify the lateral expression column", () => {
  const contract = verification.match(
    /with expected\(table_name, constraint_name, normalized_expression\)[\s\S]*?into v_data, v_passed/i,
  )?.[0] ?? "";
  assert.notEqual(contract.length, 0, "the canonical check contract must be present");
  assert.equal(
    contract.match(/expression\.normalized_expression = expected\.normalized_expression/gi)?.length ?? 0,
    2,
    "matching count and overall status must qualify the lateral expression",
  );
  assert.match(contract, /'normalized_expression', expression\.normalized_expression/i);
  assert.doesNotMatch(contract, /and normalized_expression = expected\.normalized_expression/i);
});

test("RLS policy checks keep every CTE reference inside its defining statement", () => {
  const contract = verification.match(
    /with package_tables\(name\)[\s\S]*?'id', 'rls_policy_inventory'/i,
  )?.[0] ?? "";
  assert.notEqual(contract.length, 0, "the RLS policy contract must be present");
  const selectEnd = contract.indexOf(") contract;");
  assert.notEqual(selectEnd, -1, "the RLS policy contract must terminate its CTE-backed statement");
  assert.doesNotMatch(contract.slice(selectEnd + ") contract;".length), /\b(package_tables|required)\b/i);

  const booleanContract = contract.match(/bool_and\(policy\.policyname[\s\S]*?into v_data, v_passed/i)?.[0] ?? "";
  assert.match(booleanContract, /join package_tables/i);
  assert.match(booleanContract, /'public' = any\(policy\.roles::text\[\]\)/i);
  assert.match(booleanContract, /'authenticated' = any\(policy\.roles::text\[\]\)/i);
});

test("enrollment integrity aggregates qualify enrollment and course status columns", () => {
  const contract = verification.match(
    /begin\s+select jsonb_build_object\(\s+'total'[\s\S]*?'id', 'enrollment_integrity'/i,
  )?.[0] ?? "";
  assert.notEqual(contract.length, 0, "the enrollment integrity contract must be present");
  assert.match(contract, /count\(\*\) filter \(where e\.status = 'pending'\)/i);
  assert.match(contract, /count\(\*\) filter \(where e\.status = 'active'/i);
  assert.match(contract, /count\(\*\) filter \(where e\.status = 'declined'\)/i);
  assert.match(contract, /c\.status <> 'published'/i);
  assert.doesNotMatch(contract, /count\(\*\) filter \(where status =/i);
});

test("function catalog joins compare type-only signatures instead of parameter names", () => {
  assert.equal(
    verification.match(/oidvectortypes\(p\.proargtypes\) = expected\.arguments/gi)?.length ?? 0,
    2,
    "both function catalog checks must compare type-only signatures",
  );
  assert.doesNotMatch(
    verification,
    /pg_get_function_identity_arguments\(p\.oid\) = expected\.arguments/i,
  );
});

test("verification enforces the reconciled migration history instead of always passing", () => {
  const contract = verification.match(
    /begin\s+select jsonb_build_object\(\s+'history_count'[\s\S]*?'id', 'migration_history'[\s\S]*?'error', null\s*\);/i,
  )?.[0] ?? "";
  assert.notEqual(contract.length, 0, "the migration history contract must be present");
  assert.match(contract, /'repository_expected_latest', '20261124010000'/i);
  assert.match(contract, /v_passed\s*:=\s*\(?v_data->>'unified_migration_recorded'\)::boolean/i);
  assert.match(contract, /v_data->>'latest_version'\s*=\s*'20261124010000'/i);
  assert.match(contract, /not \(v_data->>'manual_history_reconciliation_required'\)::boolean/i);
  assert.match(contract, /'status', case when v_passed then 'ok' else 'failed' end/i);
  assert.doesNotMatch(contract, /v_passed\s*:=\s*true/i);
});

test("migration history reconciliation is fingerprint-guarded and metadata-only", () => {
  const path = new URL("05_MIGRATION_HISTORY_RECONCILIATION.sql", root);
  assert.ok(existsSync(path), "the manual history reconciliation script must exist");
  const sql = readFileSync(path, "utf8");
  assert.match(sql, /^begin;/im);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /migration_history_reconciliation_refused/i);
  assert.match(sql, /is distinct from/i);
  assert.match(sql, /insert into supabase_migrations\.schema_migrations/i);
  assert.match(sql, /on conflict \(version\) do nothing/i);
  assert.match(sql, /20261124010000/i);
  assert.match(sql, /20261123110000/i);
  assert.match(sql, /reconciliation_result/i);
  assert.equal(sql.match(/insert into/gi)?.length, 1, "only migration history may be inserted");
  assert.doesNotMatch(sql, /\b(create|alter|drop|truncate|update|delete)\b/i);
  assert.doesNotMatch(sql, /01_FULL_DATABASE_MIGRATION|\\i\s*20261124010000/i);
  for (const fingerprint of [
    "8b00fff1860ba25e3a79fe060e5721ec",
    "b529cac1bd9ba3fdd172c5fd1a6ea687",
    "0befec1ffafc97123db06399ab9150df",
    "a2c0e84702e5a52f4400a27f2a20a659",
  ]) {
    assert.ok(sql.includes(fingerprint), `the observed ${fingerprint} baseline must be guarded`);
  }
  assert.match(sql, /production_rls_auto_enable_present/i);
});
