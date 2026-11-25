# LiveSchool Database Audit and Unified SQL Migration Report

Date: 2026-11-25
Workspace: `D:\Projects-code\liveschool-phase-01`
Branch: `remediation/phase-01-core-stabilization`
Scope: full source-tree and database-contract audit, production-diagnostic reconciliation, and a controlled SQL package. No agent production database access, deployment, push, merge, or Phase 02 work was performed; the operator manually executed the supplied diagnostics and SQL.

## 1. Executive summary

The repository contained 19 Supabase migrations, 30 application tables in `public`, handwritten TypeScript query contracts, privileged server actions, JWT-aware RPCs, RLS policies, and several fixture-only modules. Production diagnostics showed PostgreSQL 17.11, migration history ending at `20261123110000_unify_teacher_onboarding`, one owner, one active enrollment on a published course, and no sessions, attendance rows, chat threads, messages, or participants.

The safe target is the existing application plus the three manually applied attendance-history tables. The package does not activate direct chat, attachments, notifications, payment providers, meeting providers, Realtime, or other unapproved modules.

Five deliverables were prepared:

1. `01_FULL_DATABASE_MIGRATION.sql` — one transactional, idempotent reconciliation script.
2. `02_DATABASE_VERIFICATION.sql` — strictly read-only verification returning one JSON document.
3. `03_DATABASE_ROLLBACK.sql` — conservative rollback with populated-history refusal guards.
4. `04_DATABASE_IMPLEMENTATION_REPORT.md` — this report.
5. `05_MIGRATION_HISTORY_RECONCILIATION.sql` — fingerprint-guarded, metadata-only reconciliation for `20261124010000`; it does not execute schema SQL or modify application data.

The canonical repository migration is `supabase/migrations/20261124010000_unified_database_reconciliation.sql`. It is byte-identical to the root SQL Editor migration. The four never-applied legacy migrations that could reintroduce direct chat or the weak enrollment RPC are now explicit compatibility no-ops.

## 2. Evidence classification

The report uses four evidence classes:

- **Repository-verified:** confirmed by source files, migration text, unit tests, type checking, lint, or build output.
- **Production-observed:** confirmed only by the diagnostic output supplied by the operator.
- **Static SQL review:** confirmed by inspection and package-contract tests, but not executed against PostgreSQL in this environment.
- **Runtime-unverified:** requires an approved PostgreSQL/Supabase execution environment and synthetic JWT tests.

No production result is inferred from static review. No local test is represented as a production test.

## 3. Audit coverage

The audit covered:

- Every file under `supabase/migrations`.
- Supabase client factories, server actions, API routes, RPC calls, and direct table queries.
- Authentication, account creation, role assignment, owner bootstrap, proxy route access, and portal authorization.
- Courses, enrollment review, teacher onboarding, groups, members, join requests, sessions, attendance, roster snapshots, and attendance events.
- Group chat, direct-chat remnants, attachment remnants, Storage, and Realtime.
- Assignments, submissions, guardian links, finance, support, settings, public catalog, teacher intake, and public content.
- TypeScript presentation and query contracts.
- The supplied production diagnostics and all manually applied Step 12, Step 13A, Step 13B, and Step 14 SQL.

The audit did not repeat the earlier whole-project UI audit. It used those results only where they affected database contracts or disabled functionality.

## 4. Production-observed baseline

The supplied diagnostics established:

- PostgreSQL `17.11`.
- SQL Editor executor role `postgres`.
- Diagnostic transaction `READ ONLY`.
- Diagnostic summary: 34 successful checks and 6 expected missing-object errors.
- Latest recorded migration: `20261123110000_unify_teacher_onboarding`.
- Extensions: `pg_stat_statements 1.11`, `pgcrypto 1.3`, and `uuid-ossp 1.1`.
- One active owner.
- One active enrollment on a published course.
- The active enrollment is legacy data without review metadata: diagnostics reported one active enrollment and zero rows with reviewer metadata. The migration preserves it and does not fabricate a historical review decision.
- Zero sessions, attendance rows, chat threads, messages, and participants.
- No direct-chat table, direct-chat RPC, attachment bucket, or `attachment_name` column.
- No account-integrity anomalies, stale group participants, or invalid constraints reported.
- RLS enabled on existing core tables.
- Critical existing security-definer functions had empty search paths.
- `public.rls_auto_enable()` exists as a production-only event-trigger function. It is not repository-owned and is preserved.

The six diagnostic errors were expected drift checks for absent direct-chat objects and the absent attachment column. They are not evidence that those features should be enabled.

The operator's first unified-migration execution reported PostgreSQL error `42703` because the Realtime guard referenced nonexistent `pg_publication_tables.relid`. The error occurred inside the opening preflight transaction before any schema change. The operator subsequently executed the corrected unified migration successfully and then supplied the 19/19 read-only verifier pass documented in section 12.6. The successful migration must not be rerun.

## 5. Migration-history reconciliation

Production history is behind the remediation branch. In addition to the new canonical migration, these four repository migrations were not recorded in production:

- `20261123123000_add_chat_thread_insert_policies.sql`
- `20261123130000_restore_direct_chat.sql`
- `20261123140000_fix_chat_rls_participant_check.sql`
- `20261124000000_atomic_enrollment_review.sql`

Their former contents were unsafe or superseded:

- They allowed client-created direct threads and arbitrary participant insertion.
- They created direct-chat mapping, RPCs, attachments, and a Storage bucket.
- One revision weakened message RLS to thread existence.
- The enrollment RPC was service-role-only and lacked JWT actor validation and review audit fields.

Each file is now a no-op containing:

```text
superseded by 20261124010000_unified_database_reconciliation
```

This preserves chronological migration ordering without allowing a future push to recreate superseded behavior.

The canonical migration does not write `supabase_migrations.schema_migrations`. SQL Editor execution and migration tooling are separate concerns. The production-observed verifier found 15 history records, latest version `20261123110000`, and no record for `20261124010000`; the four compatibility no-op predecessor versions also remained unrecorded. The applied schema nevertheless matches the canonical catalog fingerprints.

`05_MIGRATION_HISTORY_RECONCILIATION.sql` closes only the required target-history gap after the operator confirms that the fingerprints remain unchanged. It:

- Runs in one transaction with lock and statement timeouts.
- Refuses a read-only transaction, a missing history table, schema fingerprint drift, or an unexpected history baseline.
- Inserts only the missing `20261124010000` history row with `ON CONFLICT (version) DO NOTHING`.
- Never executes `01_FULL_DATABASE_MIGRATION.sql`, never changes schema or application rows, and never fabricates a nonempty `statements` payload.
- Supplies `statements = []` only when the actual history table requires a non-null value without a default; otherwise it supplies no synthetic migration statements.
- Verifies the terminal history postcondition before `COMMIT`.

The script intentionally does not claim that the four compatibility no-op predecessors were applied. They contain no executable SQL and cannot recreate the superseded behavior. If a future Supabase CLI operation reports those four local files as pending, they are safe no-ops; do not use DB Push to rerun `20261124010000`. Exact manual steps and expected first-run and repeat-run results are in section 14.2.

## 6. Unified migration design

`01_FULL_DATABASE_MIGRATION.sql` has the following properties:

- Starts with `BEGIN`.
- Sets transaction-local lock and statement timeouts.
- Runs read-only preflight assertions before any schema change.
- Uses `CREATE ... IF NOT EXISTS`, additive `ALTER ... ADD COLUMN IF NOT EXISTS`, guarded constraints, `CREATE OR REPLACE`, named policy replacement, and explicit privilege reset.
- Seeds only missing role, stage, grade, subject, and settings reference rows with `ON CONFLICT DO NOTHING`.
- Preserves all existing application rows.
- Runs final catalog, privilege, RLS, chat, attendance, and disabled-feature assertions before `COMMIT`.
- Aborts the entire transaction if a precondition or final assertion fails.
- Does not use service-role credentials to simulate ordinary user authorization.
- Does not access Storage credentials or create a bucket.
- Does not modify Supabase-managed Storage ACLs globally.
- Does not create application views or enable Storage, attachment, or Realtime features; no approved view or file/realtime contract was found that required them.
- Does not remove `public.rls_auto_enable()`.

### 6.1 Preflight refusal conditions

The migration refuses to proceed when:

- PostgreSQL is older than 17.
- `auth.users` or required PostgreSQL roles are unavailable.
- Direct-chat thread rows already exist.
- Chat attachment references already exist.
- The direct-chat schema or `chat-attachments` bucket already exists.
- Known chat attachment Storage policies already exist.
- Existing attendance rows lack `marked_by`, roster entries, or corresponding append-only attendance events.
- Existing `reviewed_by` values reference missing profiles before the restrictive reviewer foreign key is added.
- Any LiveSchool-owned table belongs to the `supabase_realtime` publication.
- Unapproved notification, payment-provider, or meeting-provider tables, columns, or routines already exist.
- Required final definitions cannot be validated.

No automatic backfill or deletion is attempted. Such states require a separately approved data plan.

### 6.2 Table coverage

The migration reconciles 33 application tables:

- Identity and access: `profiles`, `roles`, `permissions`, `account_roles`, `role_permissions`, `guardian_links`.
- Catalog: `stages`, `grades`, `subjects`, `teacher_profiles`, `courses`, `course_units`, `lessons`.
- Groups and scheduling: `learning_groups`, `group_members`, `group_join_requests`, `group_payments`, `class_sessions`.
- Teachers and finance: `teacher_earnings`, `teacher_applications`.
- Support: `support_requests`, `support_replies`.
- Chat: `chat_threads`, `chat_participants`, `chat_messages`.
- Settings: `site_settings`.
- Enrollment and assignments: `course_enrollments`, `course_assignments`, `course_assignment_submissions`.
- Attendance history: `session_attendance`, `session_roster_snapshots`, `session_roster_entries`, `session_attendance_events`.

The three attendance-history tables were already applied manually. The unified migration validates and hardens them rather than assuming repository history proves their existence.

### 6.3 Additive columns and constraints

The migration reconciles:

- `courses.teacher_id`.
- `teacher_profiles.portrait_path` and `onboarding_details`.
- `teacher_applications.teacher_user_id`.
- `site_settings.social_links`.
- `course_enrollments.reviewed_by` and `reviewed_at`.
- `session_attendance.marked_by NOT NULL`.
- Non-null, unique `chat_threads.group_id`.
- Text-only chat constraints.
- Course title and description length checks.
- Teacher portrait and JSON-object checks.
- Settings JSON-object checks.
- Validated restrictive foreign keys for enrollment, submissions, support replies, roster snapshots, roster entries, attendance events, and attendance rows.

Existing reference data is not rewritten. Package-owned named check constraints are explicitly dropped and recreated with canonical definitions, so a same-name weaker constraint cannot be silently accepted. New checks fail closed if existing rows violate them.

### 6.4 Indexes

The migration creates missing indexes for:

- Role and permission lookup.
- Guardian/student lookup.
- Teacher subject lookup.
- Catalog filtering and teacher assignment.
- Group course/teacher lookup and membership lookup.
- Join-request queues and one open request per group/student.
- Payment request lookup.
- Session group/teacher schedules.
- Teacher application queues.
- Support queues and replies.
- Chat thread/message/sender lookup.
- Enrollment course lookup.
- Assignment and submission lookup.
- Attendance and frozen roster lookup.
- Attendance event history by session, student, and time.

## 7. Functions and RPC contracts

The migration replaces or validates these routines with schema-qualified references and controlled search paths:

- `liveschool_internal.create_account_profile()`.
- `public.assign_created_account_role(uuid, text)`.
- `public.assign_owner_role(uuid)`.
- `public.save_learning_group(...)`.
- `public.complete_teacher_onboarding(...)`.
- `public.review_course_enrollment_as_admin(uuid, uuid, text)`.
- `liveschool_internal.capture_session_roster_on_insert()`.
- `public.record_session_attendance(uuid, uuid, text)`.
- `liveschool_internal.can_access_group_chat(uuid)`.
- `liveschool_internal.can_access_attendance_session(uuid)`.
- `liveschool_internal.is_active_teacher(uuid)`.
- Enrollment audit, session validation, group-history protection, and attendance-history immutability trigger functions.

### 7.1 Enrollment review

`review_course_enrollment_as_admin`:

- Uses `auth.uid()` rather than a caller-supplied administrator UUID.
- Requires an active authenticated owner or admin.
- Locks actor profile, actor roles, course, and enrollment.
- Accepts only `active` or `declined`.
- Requires a pending enrollment.
- Requires a published course for activation.
- Records reviewer and review time.
- Supports same-actor/same-decision response idempotency.
- Returns `false` for invalid, missing, stale, or unauthorized state transitions.
- Raises an authorization error for a missing or unauthorized JWT actor.
- Is executable by `authenticated`, not `anon` or `service_role`.

The application now calls this RPC through `sessionClient(true)`.

### 7.2 Attendance recording

`record_session_attendance`:

- Uses `auth.uid()`.
- Requires an active teacher.
- Locks the session and verifies teacher assignment.
- Rejects cancelled or future sessions.
- Requires a frozen roster snapshot and matching roster entry.
- Locks the attendance row.
- Returns `true` without another event when the status is unchanged.
- Writes `marked_by` and `marked_at`.
- Appends an attendance event with previous and new status.
- Is executable by `authenticated`, not `anon` or `service_role`.

The application action now calls this RPC through `sessionClient(true)`. The teacher loader requires a snapshot and reads frozen roster entries instead of current group membership.

### 7.3 Roster capture

A future scheduled session insertion captures:

- Session ID.
- Snapshot source.
- Capture time.
- Authenticated actor when available.
- Active student members.
- Snapshot display names.
- Membership enrollment time.

The capture trigger locks the group and rejects an unavailable or inactive group. Roster snapshots, entries, and attendance events are immutable through triggers.

### 7.4 Chat containment

`can_access_group_chat` requires:

- A non-null group thread.
- An active group.
- An active actor.
- Either the assigned group teacher with the teacher role or a current student member with the student role.

Policies use this helper for thread, message, and participant reads and for sender-bound, attachment-free, 1–2000 character message insertion. Client thread and participant creation remains disabled.

### 7.5 Account roles and public teacher lookup

`create_account_profile` preserves a server-assigned `raw_app_meta_data->>'liveschool_role'` when it is one of the supported application roles, maps parent account metadata to `parent`, and otherwise defaults to `student`. It does not allow signup metadata to assign privileged roles.

`assign_created_account_role` remains `SECURITY INVOKER`; the trusted server path therefore has only the required column-level `UPDATE (role_code)` privilege on `account_roles`.

The public teacher-directory policy uses the empty-search-path `SECURITY DEFINER` helper `is_active_teacher`. Anonymous and authenticated callers receive schema usage and function execution only for this helper; the directory exposes an explicit column allowlist rather than private onboarding or pricing fields.

## 8. RLS and privilege model

### 8.1 RLS

RLS is enabled on all 33 application tables. Named policies are replaced transactionally so stale permissive policies with the same names cannot survive.

Public read contracts are limited to:

- Stages, grades, and subjects.
- Published courses.
- Published course units and lessons.
- Active public groups on published courses.
- A column-limited active teacher directory.
- Only `site_settings.demo_enabled` and `site_settings.social_links` for anonymous and authenticated site configuration; neither role receives full-table SELECT.

Key authenticated read contracts include:

- Own profile and own roles.
- Role labels and public settings.
- Own enrollments.
- Guardian links and linked student profiles for parent attendance access.
- Accessible sessions, roster snapshots, roster entries, attendance, and attendance events.
- Group-contained chat.

There are no anonymous or PUBLIC write policies. Client chat writes are limited to sender-bound group-message insertion; thread and participant creation remain disabled.

### 8.2 Minimum application privileges

The migration resets application-table privileges and grants only required operations.

`service_role` retains only the server operations needed by existing trusted server actions, such as profile administration, teacher/application management, course administration, settings, enrollment creation, assignments, submissions, and read access to operational tables.

The service role does not receive direct DML access to roster snapshots, roster entries, attendance, or attendance events. Those writes occur through security-definer functions or triggers.

Platform-managed Storage ACLs are not globally rewritten. Application function and table privileges are tightened independently.

### 8.3 Privilege-inventory reconciliation

The completed read-only application/privilege inventory found and fixed two contract gaps:

- `assign_created_account_role` is invoker-security and updates `account_roles.role_code`, but `service_role` lacked that column UPDATE privilege. The migration adds only `UPDATE (role_code)`.
- Anonymous settings queries had RLS coverage but lacked SELECT on `site_settings.demo_enabled` and `site_settings.social_links`. Authenticated settings reads were also broader than the public-column contract.
- The migration explicitly revokes stale settings column grants, grants only `demo_enabled` and `social_links` to both `anon` and `authenticated`, denies full-table SELECT to both roles, and asserts the final ACL before commit. The verifier checks both roles independently.

No other current application operation required a grant change. `support_replies` has no current service-role SELECT operation; no speculative grant was added. The verifier uses `has_column_privilege` for column contracts and explicit denial checks for non-public teacher and settings columns.

## 9. Business rules and data integrity

Implemented or reinforced:

- Enrollment review audit metadata for new decisions.
- Pending-only enrollment insertion and immutable reviewer/time metadata after a decision.
- Active owner/admin reviewer identity with `ON DELETE RESTRICT`.
- Published-course requirement for enrollment activation.
- Server-assigned account-role preservation during profile creation.
- Frozen per-session rosters.
- Append-only attendance events.
- Attendance marker identity.
- Roster-backed attendance foreign keys.
- Group-only, text-only chat.
- Session teacher consistency with the group teacher.
- Protection against changing group course/teacher after session history exists.
- Restrictive foreign keys that protect enrollment, submission, support, roster, and attendance history.
- Group capacity checks in the administrative save RPC.
- Active teacher and published-course checks in the group save RPC.
- One open join request per group/student.
- Course title/description limits.

Not implemented because it would change unapproved product behavior or require a data model decision:

- Effective-dated group membership history.
- Historical roster backfill.
- A canonical learner identity replacing free-text `learner_name`.
- Guardian-link provisioning UI.
- Mandatory active course enrollment for group membership.
- Reservation consumption of group capacity.
- Payment-provider, webhook, refund, payout, or reconciliation workflows.
- Notification queue/provider/preferences.
- Meeting-provider integration.
- Direct messaging or attachments.
- Realtime chat.
- Assignment scoring, attachments, resubmission, or advanced review.

These remain explicit residual gaps rather than silently activated features.

The independent review confirmed that `save_learning_group` validates the active student profile and role but does not require an active enrollment in the group's course. The migration does not silently change that product rule. The verifier reports `members_without_active_enrollment` as a residual metric so the risk remains visible until the enrollment requirement is explicitly approved.

## 10. Cascade decisions

The migration changes history-bearing relationships from cascading deletion to restrictive deletion where deletion would erase enrollment, submission, support, roster, or attendance history.

Content structures such as course units and lessons retain content cascades. Chat participant membership retains thread cascade because it is membership metadata, not message history. Attendance and roster history are protected by both foreign keys and immutability triggers.

Auth-user deletion may now be prevented when protected history references the profile. That is intentional. Account erasure requires a separately approved archival or anonymization process; it must not silently delete educational or audit history.

## 11. Application/database synchronization

Critical query contracts were synchronized:

- `catalog-mutations.ts` now calls `review_course_enrollment_as_admin`.
- `catalog-admin-actions.ts` performs enrollment review through the user JWT client after application role validation.
- `live-attendance-actions.ts` now calls `record_session_attendance` through the user JWT client.
- `attendance-data.ts` reads `session_roster_snapshots` and `session_roster_entries` and fails closed when the snapshot is absent.
- Attendance RPC outcomes map to `saved`, `not_found`, or `failed`.
- Unit tests cover the new RPC arguments, frozen roster loader, missing snapshot, query errors, and mutation outcomes.
- Existing public-group queries filter on `learning_groups.active`, and the matching anonymous/authenticated column grant is present.
- Existing anonymous settings reads have matching grants limited to `demo_enabled` and `social_links`.
- Owner-created account role assignment has the required service-role column UPDATE without granting unrestricted row updates.

The final application-side contract audit added seven narrow integration corrections, each covered by a failing regression before the implementation change:

1. Public catalog reads use the JWT/session client instead of bypassing RLS with the service-role client.
2. Public teacher directory and detail reads use the session client and therefore enforce the active-teacher RLS policy and column boundary.
3. Anonymous settings reads select only `demo_enabled` or `social_links` with a singleton terminal operation; they no longer filter on the ungranted `site_settings.id` column.
4. Parent assignment scope includes active published enrollments requested by the parent as well as enrollments requested by linked students.
5. Teacher assignment scope and the teacher course dashboard include published courses assigned through active `learning_groups`, merged with directly owned courses.
6. Group-course relation results are normalized for the untyped Supabase SDK's object-or-array representation before deduplication.
7. The disabled chat-attachment endpoint returns a bare 404 and contains no authentication, bucket, signed-URL, or redirect logic.

The preview Playwright web-server timeout now allows 180 seconds for its combined cold test build and server startup; this changes the startup budget, not any test assertion. The complete local suite passed after these corrections.

### 11.1 Final application integration correction pass

The independent whole-branch review and final contract revalidation added seven application-side corrections and two verifier-only corrections:

| Area | Correction | Evidence |
| --- | --- | --- |
| Parent assignment privacy | A parent with no resolved linked children no longer executes an unfiltered submission query; executed reads are restricted to verified child IDs. | Behavioral regression observed RED, then GREEN. |
| Course enrollment | Missing service-role configuration redirects to the existing failure state instead of dereferencing a null client. | Runtime regression observed RED, then GREEN. |
| Owner callback | Both normalized emails must be nonempty before owner bootstrap; a missing user cannot match. | Runtime regression observed RED, then GREEN. |
| Public groups and teacher application references | Public reads use the RLS-bearing session client instead of bypassing public RLS with the service role. | Static boundary regression observed RED, then GREEN. |
| Enrolled course lessons | The existing enrollment gate is retained, followed by an RLS-bearing session read and an unavailable state when no client exists. | Runtime regression observed RED, then GREEN. |
| Course archival | Normal archival is blocked while an active enrollment exists. | Behavioral regression observed RED, then GREEN. |
| Migration-history verification | The verifier now fails unless the unified row is recorded, the latest version is `20261124010000`, and manual reconciliation is not required. | SQL contract regression observed RED, then GREEN. |
| Attendance verification | Current attendance rows must match the latest append-only event ordered by `marked_at, id`. | SQL contract regression observed RED, then GREEN. |
| Independent review disposition | All four review findings were verified and processed; no second review cycle was initiated. | Findings and dispositions recorded in sections 11.1, 12.9, and 17. |

The course-archive check is an application-side precheck, not a transactionally atomic database guard. A concurrent enrollment activation between the precheck and archive remains a narrow residual race; a database-owned guard requires separate production-schema approval.

No generated `database.types.ts` exists. Browser, SSR, and privileged Supabase clients remain untyped. Presentation contracts still contain known drift, including camelCase catalog fields, assignment fields absent from the schema, an unsupported content status, and an incomplete session-status union. Those contracts are documented residuals; they were not broadly rewritten as part of this database package.

Direct-chat and attachment UI code remains present, but writable direct-chat behavior is disabled and the database does not expose the required RPCs, mapping table, column, or bucket.

## 12. Verification script

`02_DATABASE_VERIFICATION.sql`:

- Starts with `BEGIN TRANSACTION READ ONLY`.
- Uses no temporary tables or persistent functions.
- Captures each check independently with `GET STACKED DIAGNOSTICS`.
- Returns one JSON object through a transaction-local GUC.
- Reports overall status and per-check counts.
- Covers environment, extensions, required tables, RLS, constraints, columns, functions, search paths, RPC privileges, policy inventory, enrollment integrity, attendance/roster integrity, chat containment, public catalog access, group/session invariants, Storage, Realtime, migration history, aggregate row counts, and catalog fingerprints.
- Matches required policies by schema, table, and policy name; validates command, role set, permissiveness, `USING`/`WITH CHECK` nullability, required expression fragments, and forbidden fragments; and rejects unexpected policies on all package-owned public tables.
- Counts only the two required extensions instead of aggregating over unrelated installed extensions.
- Uses type-only function identity arguments and schema-bound catalog joins.
- Validates complete normalized foreign-key definitions and complete canonical check expressions.
- Requires every attendance row to have `marked_by`, a frozen roster entry, and corresponding append-only event coverage.
- Checks anonymous and authenticated settings column privileges independently and rejects full-table SELECT or extra public columns.
- Checks required and forbidden source fragments for critical authorization and integrity functions instead of relying on function hashes alone.
- Validates public/private column boundaries, disabled provider artifacts, package-scoped Realtime membership, and non-executability of legacy direct-chat routines, including `can_access_chat_attachment`.
- Returns counts, booleans, metadata, and hashes rather than user identifiers or customer content.

### 12.1 Independent-review correction pass

The final independent SQL review identified ten issues. The dispositions are:

| Finding | Disposition |
| --- | --- |
| Required-extension aggregation could reject a correct database | Fixed; only `pgcrypto` and `uuid-ossp` are counted. |
| Parameterized function checks used named arguments instead of type-only identities | Fixed; both catalog joins compare `oidvectortypes(p.proargtypes)` against type-only expected signatures. |
| RLS checks validated names but not policy semantics | Fixed; all 24 required policies now validate command, roles, permissiveness, and expressions. |
| Group membership can bypass active course enrollment | Retained as an explicit product-policy residual; no unapproved behavior change. |
| Attendance rows without append-only events could pass | Fixed in migration preflight, final assertions, and verification. |
| Catalog, foreign-key, and canonical-check comparisons could false-pass | Fixed with schema-bound joins and complete normalized definitions. |
| Authenticated settings access exceeded the public-column contract | Fixed with stale column-grant revocation, two-column grants, and final ACL assertions. |
| Disabled attachment helper escaped the executable-function guard | Fixed; `can_access_chat_attachment` is included. |
| Rollback helper removal was not repeatable | Fixed by dropping the function without a preceding revoke on a possibly missing routine. |
| Reviewed-enrollment rollback guard was incomplete | Fixed to protect reviewer ID, review timestamp, and every non-pending final state. |

The package regressions were observed failing before the corresponding corrections and passing afterward. These are static/package-verified corrections; database execution remains runtime-unverified.

### 12.2 Production-reported preflight correction

The operator-reported `42703` error exposed an additional catalog-contract defect: PostgreSQL 17's `pg_publication_tables` view provides `pubname`, `schemaname`, and `tablename`, not `relid`. Both unified-migration Realtime guards and the verifier incorrectly joined through `pt.relid`.

All three queries now filter `pt.schemaname = 'public'` and `pt.tablename` directly. The verifier reports qualified table names through `schemaname || '.' || tablename`. A regression was observed failing on `pt.relid` and passing after the correction; the canonical migration was resynchronized. The operator subsequently completed the corrected migration and supplied the production-observed verifier passes in sections 12.6 and 12.8. The successful migration must not be rerun.

### 12.3 Production-reported verifier syntax correction

After the `relid` correction, the operator ran the verifier and received `42601: syntax error at or near "any"` at the function-configuration mismatch filter. The predicate used `'search_path=""' IS DISTINCT FROM ANY(...)`, which is not valid PostgreSQL grammar.

The verifier now compares the complete configuration array: matching count and overall status require `coalesce(p.proconfig, '{}'::text[]) = array['search_path=""']`, while mismatch reporting requires the corresponding `<>` comparison. This matches the unified migration's final security assertion and rejects missing or additional function settings instead of merely detecting that one setting exists somewhere in the array.

A regression was observed failing on the invalid predicate before the SQL change and passing afterward. The operator subsequently completed the corrected migration and verifier successfully, as recorded in sections 12.6 and 12.8; the migration must not be rerun.

### 12.4 Production-observed consolidated verifier result

The operator supplied the first complete consolidated verifier result, generated at `2026-11-24T19:23:04Z`. It confirms `strictly_read_only: true` and reports 14 `ok` checks, three query errors, and two failed checks out of 19.

Production-observed passing evidence includes PostgreSQL 17.11; all 33 package tables with RLS enabled; all 19 expected foreign-key/cascade constraints; all 16 expected column contracts; RPC privilege checks; attendance/roster integrity; group-only text-only chat containment; public catalog, settings, and teacher-directory privileges; disabled-feature and Realtime guards; and catalog fingerprints. Observed row counts are 36 courses, nine profiles, six teachers, one enrollment, and zero groups, sessions, attendance records, chat threads, messages, or participants. Migration history contains 15 records with latest version `20261123110000`; the unified migration is not recorded and manual history reconciliation remains required.

The three query errors are verifier defects, not schema-change evidence:

| Error | Root cause | Correction |
| --- | --- | --- |
| `42702: column reference "normalized_expression" is ambiguous` | The expected CTE and lateral relation exposed the same unqualified column name. | Qualify all actual-expression reads and comparisons as `expression.normalized_expression`. |
| `42P01: relation "package_tables" does not exist` | PostgreSQL CTEs were referenced in later PL/pgSQL statements after their defining SELECT ended. | Fold the unexpected-policy and write-policy checks into the same CTE-backed SELECT and keep the result fail-closed with `coalesce(bool_and(...), false)`. |
| `42702: column reference "status" is ambiguous` | Both `course_enrollments e` and `courses c` expose `status`. | Qualify enrollment aggregates as `e.status` and course publication as `c.status`. |

The two failed checks reported nine parameterized functions as missing while all six zero-argument functions matched. The same run passed privilege checks for several supposedly missing routines. The mismatch was caused by comparing type-only expected strings with `pg_get_function_identity_arguments()`, which includes parameter names; the operator's earlier metadata already showed values such as `p_course uuid, p_requester uuid, p_status text`. Both function-catalog joins now compare `oidvectortypes(p.proargtypes)` instead. The operator's follow-up diagnostic returned `42883` because an attempted `array_to_string()` wrapper treated that function's text result as an array; the unnecessary wrapper was removed. This removes the parameter-name false mismatch but does not prove function bodies, security settings, or runtime authorization until the corrected verifier is rerun.

Four regressions were observed failing for these exact defects and passing after the corrections. The package suite is now 34/34, targeted tests are 55/55, and the full suite is 129/129. The migration and canonical migration were not changed by this verifier-only correction; database execution remains runtime-unverified.

### 12.5 Production-observed verifier normalization correction

The operator's next complete verifier run, generated at `2026-11-24T19:56:12Z`, executed without SQL errors and reported `strictly_read_only: true`, 17 `ok` checks, two failed checks, and zero errors. All 15 expected functions and all eight critical function contracts now match, confirming that the earlier parameter-name and `array_to_string()` defects are resolved.

The two remaining failures are verifier expectation defects rather than schema-change evidence:

| Check | Production-observed evidence | Root cause | Correction |
| --- | --- | --- | --- |
| `canonical_check_constraints` | Four of six complete expressions matched; the chat body and course title constraints were present and validated. | PostgreSQL 17 deparses `BETWEEN` as separate `>=` and `<=` comparisons, while the verifier expected source-style `BETWEEN` text. | Expect the exact normalized PostgreSQL expressions, including both expanded range comparisons. |
| `rls_policy_inventory` | All 24 required policies were present with correct commands, roles, and permissiveness; no unexpected or unapproved write policies were found. | `pg_policies` deparses same-table column references without table qualifiers and expands `BETWEEN`; the verifier expected qualified source identifiers and source-style range text. | Expect deparsed `id`, `session_id`, `thread_id`, and `user_id` references plus separate body-length comparisons. |

The policy command, role, permissiveness, nullability, missing/unexpected-policy, forbidden-fragment, and write-policy guards remain unchanged. Two regressions were observed failing before these verifier-only corrections and passing afterward; the package suite is 36/36, targeted tests are 57/57, and the full suite is 131/131. The unified migration and canonical migration were not changed. The corrected verifier's production rerun is documented in section 12.6.

### 12.6 Production-observed verifier pass

The operator's corrected verifier run, generated at `2026-11-24T20:07:32Z`, reports `strictly_read_only: true`, `overall_status: passed`, 19 `ok` checks, zero failed checks, and zero query errors. The JSON was parsed locally and every check was confirmed to have status `ok`.

The production-observed evidence now confirms:

- All 33 required tables exist with RLS enabled.
- All 19 expected validated constraints and all six canonical check expressions match.
- All 16 column contracts match.
- All 15 expected functions match their type-only signatures, security mode, and exact `search_path=""` configuration; all eight critical function contracts match.
- RPC and helper privilege contracts match.
- All 24 required RLS policies match their command, roles, permissiveness, and semantic fragments, with no missing, unexpected, anonymous/public-write, or unapproved authenticated-write policies.
- Enrollment, attendance/roster, group/session, public catalog, and disabled-feature guards report no violations.
- No direct-chat schema, chat attachment bucket, notification table, payment-provider object, meeting-provider column, or LiveSchool table in `supabase_realtime` was observed.
- Production retains the known legacy active enrollment without reviewer metadata; this remains a documented product-policy residual rather than a verifier failure.
- At the time of that verifier run, migration history contained 15 records with latest version `20261123110000` and no `20261124010000` record; the later reconciliation result is documented in section 12.7.
- The verifier returned catalog fingerprints for future comparison; the operator's later summary omitted their raw values.

That revision of the production verifier is therefore runtime-verified. The result does not justify rerunning the unified migration solely for the earlier verifier false negatives, and it does not replace synthetic JWT, concurrency, controlled integration, or live workflow verification. The locally corrected verifier revision is classified separately in section 12.9.

### 12.7 Production-observed migration-history reconciliation

The operator subsequently executed `05_MIGRATION_HISTORY_RECONCILIATION.sql` and returned:

```json
{
  "name": "unified_database_reconciliation",
  "status": "already_recorded",
  "version": "20261124010000",
  "history_count": 16,
  "latest_version": "20261124010000",
  "schema_fingerprints": {
    "column_fingerprint": "8b00fff1860ba25e3a79fe060e5721ec",
    "policy_fingerprint": "b529cac1bd9ba3fdd172c5fd1a6ea687",
    "function_fingerprint": "0befec1ffafc97123db06399ab9150df",
    "constraint_fingerprint": "a2c0e84702e5a52f4400a27f2a20a659",
    "production_rls_auto_enable_present": true
  },
  "schema_sql_executed": false,
  "production_data_modified": false
}
```

This production-observed result confirms that `20261124010000` was already present, the terminal history contains 16 records, every guarded fingerprint still matches, and the script executed no schema SQL and modified no production application data. It runtime-verifies the script's fingerprint/history guards and `already_recorded` path. The first-run insertion branch was not exercised because the target row already existed. A fresh `02_DATABASE_VERIFICATION.sql` run remains required to confirm the complete post-reconciliation contract.

### 12.8 Production-observed post-reconciliation verifier pass

On 2026-11-25 the operator reported a fresh post-reconciliation production verification with `overall_status: passed`, 19/19 successful checks, zero failed checks, and zero SQL errors. The reported contract evidence includes 33/33 required tables, 33/33 RLS-enabled tables, 24/24 required RLS policies, 19/19 verified constraints, and 15/15 functions. Migration history reports 16 records, latest version `20261124010000`, `unified_migration_recorded: true`, and `manual_history_reconciliation_required: false`.

The operator's initial summary did not include the four returned catalog fingerprint values or the raw consolidated JSON. The subsequent current-verifier attachment, generated at `2026-11-25T00:14:36.827547+00:00`, supplies the complete JSON and all four values. Local parsing confirmed the document and compared every fingerprint with the baseline:

| Fingerprint | Previous verified baseline | Current verifier value | Status |
| --- | --- | --- | --- |
| `column_fingerprint` | `8b00fff1860ba25e3a79fe060e5721ec` | `8b00fff1860ba25e3a79fe060e5721ec` | Exact match |
| `policy_fingerprint` | `b529cac1bd9ba3fdd172c5fd1a6ea687` | `b529cac1bd9ba3fdd172c5fd1a6ea687` | Exact match |
| `function_fingerprint` | `0befec1ffafc97123db06399ab9150df` | `0befec1ffafc97123db06399ab9150df` | Exact match |
| `constraint_fingerprint` | `a2c0e84702e5a52f4400a27f2a20a659` | `a2c0e84702e5a52f4400a27f2a20a659` | Exact match |

The post-reconciliation schema/history result is production-observed. The current-verifier evidence is recorded in section 12.10. No production migration, schema change, synthetic record creation, or application-data modification was performed.

### 12.9 Current verifier revision and remaining production evidence

After the operator's 19/19 result, local review corrected two verifier defects without changing the canonical migration or production schema:

- Migration history had always passed; it now enforces the recorded unified version and reconciled terminal state.
- Attendance verification had checked event coverage but not current-row consistency; it now compares status, marker, and timestamp with the latest append-only event.

Both corrections have failing-then-passing package regressions. The current database-package suite passes 39/39 and the full unit suite passes 150/150. These are repository/static-contract results only; production execution is classified separately in section 12.10.

The targeted read-only execution requested for this revision has now been completed by the operator. The required evidence was:

| Check ID | Required evidence |
| --- | --- |
| `catalog_fingerprints` | All four values for exact comparison with the baseline in section 12.8. |
| `migration_history` | 16 records, latest `20261124010000`, unified row present, manual reconciliation false, current check status `ok`. |
| `attendance_and_roster_integrity` | `attendance_event_mismatch = 0` and current check status `ok`. |
| Overall document | `strictly_read_only: true`, `overall_status: passed`, zero failed checks, zero query errors. |

### 12.10 Production-observed current verifier pass

The operator supplied the complete current-verifier JSON generated at `2026-11-25T00:14:36.827547+00:00`. Local parsing confirmed:

- `strictly_read_only: true` and `overall_status: passed`.
- 19 total checks, 19 `ok`, zero failed checks, and zero query errors.
- Every check has `status: "ok"` and `error: null`.
- 33/33 required tables with RLS enabled, 24/24 required policies, 19/19 constraints, six canonical checks, 16 column contracts, 15/15 functions, and eight critical function contracts.
- Migration history contains 16 records, latest version `20261124010000`, the unified migration is recorded, and manual reconciliation is not required.
- `attendance_event_mismatch` is `0`; all attendance/roster integrity counters are zero.
- All four catalog fingerprints exactly match the baseline in section 12.8.
- The known legacy active enrollment without review metadata remains visible as a residual metric, not a verifier failure.

The attachment's SHA-256 is `f2cd22b9a2155a9a45d1b69395851dc961701fad7f972a6458983ce746c5925f`. This closes the current-verifier production evidence and direct fingerprint-comparison gaps. It does not execute synthetic JWT/RLS/concurrency workflows and does not authorize another migration or any production write.

## 13. Rollback script

`03_DATABASE_ROLLBACK.sql` is intentionally conservative.

It refuses rollback when any of the following contain records:

- Roster snapshots.
- Roster entries.
- Attendance events.
- Attendance rows.
- Class sessions.
- Enrollment rows with reviewer metadata or any non-pending final state. This includes the production-observed legacy active enrollment, which is meaningful history even though it has no reviewer metadata.

The operator subsequently observed `rollback_refused: 1 reviewed enrollments contain audit history`, consistent with that protected active enrollment. The exception occurred before any rollback DDL, so the script aborted without removing policies or grants; this confirms the guard rather than indicating a failed forward migration.

When guards pass, it removes only the unified migration's additive read contracts:

- Public catalog policies and grants, including `learning_groups.active`.
- Anonymous and authenticated settings column grants.
- Anonymous teacher-directory helper privileges.
- Attendance read policies.
- The attendance read helper routine and its privileges.

It retains security and data-protection controls, including JWT-aware enrollment and attendance RPCs, frozen roster/event schema, group-chat containment, restrictive history foreign keys, immutability triggers, the minimum service-role `account_roles.role_code` UPDATE needed by the trusted account-role RPC, other minimum service-role privileges, and `rls_auto_enable`.

The rollback does not delete data and does not restore weaker historical policies. A full return to a pre-remediation schema is deliberately not automated.

## 14. Operator execution sequence

### 14.1 Before history reconciliation

1. Confirm the target Supabase project and SQL Editor role is `postgres`.
2. Confirm the most recent `02_DATABASE_VERIFICATION.sql` result remains `overall_status: passed`, with the four fingerprints listed in section 12.6.
3. Do not run `01_FULL_DATABASE_MIGRATION.sql` again. Its production execution already succeeded.
4. Review the complete `05_MIGRATION_HISTORY_RECONCILIATION.sql` before execution. It changes migration metadata only.

### 14.2 Migration-history reconciliation

1. Open the Supabase SQL Editor for the verified production project.
2. Confirm the executor role is `postgres`.
3. Open `05_MIGRATION_HISTORY_RECONCILIATION.sql`, copy the entire file, and paste it into one SQL Editor execution.
4. Run it once. The script starts and commits its own transaction.
5. Confirm the returned `reconciliation_result` matches the expected first-run values:

```json
{
  "status": "reconciled",
  "version": "20261124010000",
  "name": "unified_database_reconciliation",
  "history_count": 16,
  "latest_version": "20261124010000",
  "schema_fingerprints": {
    "column_fingerprint": "8b00fff1860ba25e3a79fe060e5721ec",
    "constraint_fingerprint": "a2c0e84702e5a52f4400a27f2a20a659",
    "function_fingerprint": "0befec1ffafc97123db06399ab9150df",
    "policy_fingerprint": "b529cac1bd9ba3fdd172c5fd1a6ea687",
    "production_rls_auto_enable_present": true
  },
  "schema_sql_executed": false,
  "production_data_modified": false
}
```

6. If the script is accidentally repeated before any other history write, expect the same terminal history values with `status: "already_recorded"`. The operator's supplied result matched this branch and is recorded in section 12.7.
7. If any fingerprint or history precondition differs, the transaction raises `migration_history_reconciliation_refused` and rolls back. Capture the exact error; do not bypass the guard or rerun the schema migration.
8. Return the complete JSON result. The `already_recorded` path is now production-observed; the first-run insertion path remains runtime-unverified.

The script inserts one migration-history row only. It does not execute schema SQL, create synthetic records, or change production application data. The history-table shape is inspected at runtime; `statements` is not fabricated as a copy of the already-applied migration.

### 14.3 Post-reconciliation verification

1. The current `02_DATABASE_VERIFICATION.sql` was executed once in a separate read-only SQL Editor operation on 2026-11-25; the complete result is recorded in section 12.10.
2. The result confirms `strictly_read_only: true`, `overall_status: passed`, 19/19 successful checks, and zero query errors.
3. Migration history contains 16 records, latest version `20261124010000`, the unified migration is recorded, and manual reconciliation is not required.
4. `attendance_and_roster_integrity.attendance_event_mismatch` is `0`.
5. All four catalog fingerprints exactly match section 12.8.
6. No further verifier run, unified migration, or history reconciliation is required unless later schema drift is suspected. Do not run the unified migration to correct a history-only discrepancy.

### 14.4 Synthetic runtime checks

The following remain runtime-unverified and require an approved disposable PostgreSQL/Supabase environment with synthetic accounts and real JWTs; they must not be run against production:

- Anonymous catalog reads return only published courses and active public teacher fields.
- Student, parent, teacher, manager, support, admin, and owner enrollment-review attempts.
- Concurrent review requests for the same pending enrollment.
- Review versus course archive concurrency.
- Future scheduled session roster capture.
- Teacher attendance for own session only.
- Student/parent attendance reads for linked sessions only.
- Unauthorized attendance attempts.
- Repeated identical attendance status produces no duplicate event.
- Concurrent different attendance statuses produce a serialized event history.
- Group-chat access for assigned teacher and current student only.
- Removed member and inactive group access denial.
- Direct-chat and attachment RPC non-executability, including any revoked legacy routines.

### 14.5 Rollback

Use `03_DATABASE_ROLLBACK.sql` only with operator approval and the matching application rollback. If protected history exists, the script aborts with `rollback_refused`; choose forward reconciliation instead of deleting history. Migration-history reconciliation does not itself provide a reason to execute rollback.

## 15. Risks and operational notes

- Constraint validation and policy replacement can lock tables. Use the configured timeouts and a low-traffic window.
- Existing invalid data causes a safe abort rather than automatic repair.
- Existing direct-chat or attachment artifacts cause a safe abort because they are outside approved scope.
- Restrictive history foreign keys can block profile or parent-record deletion.
- Public catalog access is newly explicit; anonymous users can read only published/active public data and the teacher-directory column allowlist.
- The service role retains powerful trusted server capabilities. Its key remains server-only and must never be exposed to browser code.
- `public.rls_auto_enable()` remains production-managed behavior.
- Storage ACLs remain platform-managed.
- SQL Editor execution of the unified migration does not update migration history automatically; `05_MIGRATION_HISTORY_RECONCILIATION.sql` is the separate, guarded metadata-only step.
- The local environment has no approved PostgreSQL runtime, Docker runtime, or staging project. The production `already_recorded` history-reconciliation path is observed, but its first-run insertion path and synthetic JWT/concurrency behavior remain runtime-unverified.

## 16. Local verification evidence

The SQL package has automated static contract tests in `tests/unit/database-package.test.mjs`. They verify:

- Transaction and preflight/final assertion structure.
- Required attendance and enrollment functions and selected authorization/integrity fragments.
- Privilege statements and verifier checks for the public teacher helper, owner role assignment, and anonymous/authenticated settings.
- Required-extension filtering, type-only function identities, valid exact `search_path` array comparisons, schema-bound catalog joins, complete foreign-key definitions, canonical check expressions, and semantic RLS contracts.
- Attendance marker, frozen-roster, and append-only-event coverage.
- Disabled direct chat, attachments, notifications, payment/provider activation, and Realtime.
- Byte-identical root and canonical migrations.
- Neutralized legacy migrations.
- Read-only single-JSON verification structure.
- Populated-history rollback guards, expanded enrollment-history protection, repeatable helper removal, and additive-grant cleanup.
- Evidence classification in this report.
- SQL-only migration directory contents.

These are source-text assertions. They do not execute PostgreSQL, prove RLS behavior, or replace synthetic JWT and concurrency tests.

Fresh local verification on 2026-11-25:

| Command | Result |
| --- | --- |
| `npm test` | 150 passed, 0 failed, 0 skipped |
| `node --test tests/unit/database-package.test.mjs` | 39 passed, 0 failed |
| `npm run typecheck` | Passed, exit code 0 |
| `npm run lint` | Exit code 0; 0 errors and 1 pre-existing warning in `src/features/dashboards/preview-context.tsx:11` |
| `npx playwright test --config=playwright.preview.config.ts` | 17 passed, 0 failed; the scrubbed `build:test` web-server prerequisite also passed |
| Scrubbed `npm run build:test` | Passed with the explicit local-only test environment; 11 static pages generated |
| `npm run build` | Next.js 16.4.6 webpack production build passed; compiled in 14.7s, TypeScript in 2.6s, 11 static pages generated |

Application unit tests cover the synchronized enrollment and attendance calls, frozen-roster loading, input validation, mutation outcomes, public-client boundaries, assignment scope, settings grants, owner bootstrap, parent submission privacy, fail-closed client configuration, course archival, and QA isolation. Root and canonical migration files are byte-identical with SHA-256 `91bbaba89108e490157aa1bcf36c73730c1d18507b5218e3373c599677fbcac2`; `git diff --check` passes. A fresh high-confidence credential-pattern scan covered all 47 current changed/untracked files and found no private keys, JWTs, cloud access keys, GitHub tokens, or Supabase secret/publishable keys. The original repository remains on `main` at `77661f42ef1fc6a8261b7bb32410a5d9fa9b3445`; its 517-file manifest still hashes exactly to `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`.

No approved local PostgreSQL runtime, Docker runtime, or staging project is available. The first-run insertion path of `05_MIGRATION_HISTORY_RECONCILIATION.sql` and synthetic JWT/RLS/concurrency tests therefore remain runtime-unverified; the production `already_recorded` path, post-reconciliation verifier pass, and unified-migration outcome are separately classified as production-observed.

## 17. Residual findings

The following remain open and are not represented as solved by the migration:

- Course archival uses an application-side active-enrollment precheck that is not atomic with the archive update; a database-owned concurrency guard requires separate schema approval.
- Public teacher intake lacks CAPTCHA/rate limiting and verified email ownership.
- Parent/guardian provisioning has no live application workflow.
- The production-observed active enrollment lacks historical reviewer metadata; it is preserved without inventing a past review decision.
- Enrollment identity still uses `requester_id` plus free-text `learner_name`; a guardian-requested enrollment cannot be authoritatively mapped to a particular child because the enrollment row has no student foreign key.
- Published lessons are anonymously readable under the verified canonical RLS, while the application lesson route enforces an enrollment gate. The database contract is intentionally more permissive than the UI gate and needs an explicit product-policy decision before any schema change.
- Group membership does not require an active course enrollment; the verifier reports `members_without_active_enrollment` as a residual metric.
- Reserved/paid join requests do not consume group capacity.
- Online sessions and calendar behavior remain fixture/simulation-only.
- Notifications, support intake/replies, payment workflows, and advanced assessments remain inactive or incomplete.
- No generated database types exist.
- Production migration history is reconciled, the current verifier revision passed 19/19 with zero errors, and all four current catalog fingerprints exactly match the baseline. This evidence gap is closed.
- Synthetic JWT, concurrency, and live database tests remain runtime-unverified.
- The local environment cannot execute PostgreSQL migrations without separately approved setup.

## 18. Final Phase 01.6 status

**BLOCKED FOR FINAL DEPLOYMENT SIGN-OFF; DATABASE EVIDENCE COMPLETE AND READY FOR APPROVAL-GATED INTEGRATION.** The current production verifier passed 19/19, all four catalog fingerprints exactly match the baseline, migration history and attendance/event consistency are confirmed, and every available local gate passes. Final sign-off still requires explicit acceptance or completion of the runtime-unverified database matrix and the remaining product/concurrency risks. No commit, merge, push, deployment, production write, or disabled-feature activation was performed.

### 18.1 Verified evidence

- Production-observed PostgreSQL `17.11`: the current verifier revision passed 19/19 with zero failures and zero SQL errors at `2026-11-25T00:14:36.827547+00:00`.
- Production-observed canonical tables, columns, constraints, functions, RPC privileges, RLS policies, catalog rules, attendance integrity, and disabled-feature containment.
- Exact current fingerprint matches for columns, policies, functions, and constraints; migration history is 16 records with latest `20261124010000`; `attendance_event_mismatch` is `0`.
- Production-observed history reconciliation: `already_recorded`, 16 records, latest `20261124010000`, unchanged baseline fingerprints, no schema SQL executed, and no production application data modified.
- Repository-verified application/database corrections with RED-to-GREEN coverage, including parent submission privacy, null-client fail-closed behavior, owner-email validation, RLS-bearing public reads, enrollment-aware course archival, verifier history enforcement, and attendance/event consistency.
- Independent whole-branch review completed; all four findings were verified and either fixed or explicitly deferred with their residual risk recorded.
- Fresh local evidence: 150/150 unit tests, 39/39 database-package tests, 17/17 preview browser tests, TypeScript passed, lint zero errors with one known warning, scrubbed test build passed, and production build passed.
- Root and canonical migrations are byte-identical. The original repository remains at `77661f42ef1fc6a8261b7bb32410a5d9fa9b3445`, and its 517-file manifest still matches `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`.
- Remediation branch `remediation/phase-01-core-stabilization` is at `5d59736828cb1b65adb7293b7ea95b12ccc57f24`, with 12 commits ahead of `main` and 47 current modified/untracked integration payload paths. The payload is uncommitted and was scanned for credential patterns with zero high-confidence hits.

### 18.2 Remaining blockers

1. **Runtime-unverified database matrix:** real JWT/RLS, multi-role authorization, concurrency, roster capture, and live authenticated workflows require an approved disposable PostgreSQL/Supabase environment. They are not represented as passed. Either authorize an isolated environment or explicitly accept this residual for the intended release.
2. **History first-run branch:** production exercised `already_recorded`; the insertion branch remains runtime-unverified. This is a metadata-only residual and does not justify rerunning the successful schema migration.
3. **Course archive race:** the application precheck is not atomic with archival. Accept this narrow admin-only residual with an operational restriction, or approve a separate database-owned guard.
4. **Product-policy residuals:** guardian-to-child enrollment identity, published-lesson RLS versus the application enrollment gate, membership without active enrollment, capacity reservation behavior, and the legacy active enrollment without review metadata require explicit acceptance or separately approved remediation.
5. **Public teacher intake:** CAPTCHA/rate limiting and verified email ownership remain absent. Accept the abuse exposure or approve narrowly scoped hardening before public promotion.
6. **Original-worktree overlap and approvals:** the original `main` worktree still contains the three modified and six untracked protected files. Two modified paths overlap remediation changes, so integration must preserve and reconcile them. Commit, merge, push, and deployment each require explicit approval.

### 18.3 Recommended next sequence

1. Record explicit acceptance or remediation ownership for the six residuals in section 18.2. Do not create synthetic production records to substitute for the missing runtime matrix.
2. Approve the isolated commit and clean integration-worktree steps in section 18.4. This does not approve a merge into the original `main`, a push, or deployment.
3. Run the complete gate set in the clean integration worktree. If any command fails, stop and correct it before main integration.
4. If runtime JWT/RLS/concurrency assurance is required before release, approve a disposable Supabase/PostgreSQL environment and run the matrix in section 14.4 there. Otherwise document the operator's risk acceptance.
5. Reconcile the original worktree's overlapping files without discarding either work product, then request separate approval for the final `main` merge.
6. Only after integration and risk acceptance, request separate deployment approval and follow section 18.5. No further production verifier run or database migration is currently required.

### 18.4 Exact controlled integration instructions

These commands are instructions only. Execute them only after separate approval to commit and integrate. Do not use stash, reset, restore, clean, force-push, or any command that discards the original work.

**Step 1 — recheck and commit the isolated payload.**

From `D:/Projects-code/liveschool-phase-01`:

```bash
git status --short
git diff --check
git diff --cached --check
git add -- \
  "playwright.preview.config.ts" \
  "src/app/(public)/courses/[courseId]/lessons/page.tsx" \
  "src/app/(public)/groups/page.tsx" \
  "src/app/(public)/teachers/[teacherId]/page.tsx" \
  "src/app/(public)/teachers/apply/page.tsx" \
  "src/app/(public)/teachers/page.tsx" \
  "src/app/account/callback/route.ts" \
  "src/app/api/chat-attachment/route.ts" \
  "src/features/auth/account-actions.ts" \
  "src/features/auth/auth-redirect.ts" \
  "src/features/auth/proxy-response.ts" \
  "src/features/auth/route-access.ts" \
  "src/features/auth/supabase-server.ts" \
  "src/features/catalog/catalog-admin-actions.ts" \
  "src/features/catalog/catalog-mutations.ts" \
  "src/features/catalog/enrollment-actions.ts" \
  "src/features/catalog/live-catalog.ts" \
  "src/features/catalog/teacher-courses.tsx" \
  "src/features/dashboards/attendance-data.ts" \
  "src/features/dashboards/live-assignment-access.ts" \
  "src/features/dashboards/live-assignments.tsx" \
  "src/features/dashboards/live-attendance-actions.ts" \
  "src/proxy.ts" \
  "supabase/migrations/20261123123000_add_chat_thread_insert_policies.sql" \
  "supabase/migrations/20261123130000_restore_direct_chat.sql" \
  "supabase/migrations/20261123140000_fix_chat_rls_participant_check.sql" \
  "supabase/migrations/20261124000000_atomic_enrollment_review.sql" \
  "supabase/migrations/20261124010000_unified_database_reconciliation.sql" \
  "tests/unit/assignment-access.test.mjs" \
  "tests/unit/attendance-data.test.mjs" \
  "tests/unit/callback-owner-guard.test.mjs" \
  "tests/unit/catalog-archive.test.mjs" \
  "tests/unit/catalog-mutations.test.mjs" \
  "tests/unit/course-lessons-client.test.mjs" \
  "tests/unit/database-package.test.mjs" \
  "tests/unit/enrollment-configuration.test.mjs" \
  "tests/unit/live-assignments-privacy.test.mjs" \
  "tests/unit/proxy-response.test.mjs" \
  "tests/unit/public-catalog-client.test.mjs" \
  "tests/unit/qa-isolation.test.mjs" \
  "tests/unit/route-access.test.mjs" \
  "tests/unit/settings-read.test.mjs" \
  "01_FULL_DATABASE_MIGRATION.sql" \
  "02_DATABASE_VERIFICATION.sql" \
  "03_DATABASE_ROLLBACK.sql" \
  "04_DATABASE_IMPLEMENTATION_REPORT.md" \
  "05_MIGRATION_HISTORY_RECONCILIATION.sql"
git diff --cached --check
git status --short
git commit -m "$(cat <<'EOF'
fix: complete Phase 01.6 database integration hardening
EOF
)"
git status --short
```

The final `git status --short` must be empty before integration. If any unexpected path appears, stop and review it; do not broaden staging.

**Step 2 — preserve the original nine protected paths outside the repository.**

From `D:/Projects-code/liveschool`, before any merge:

```bash
mkdir -p "D:/Projects-code/liveschool-original-backup-20261125"
cp --parents \
  "src/features/catalog/mock-data.ts" \
  "src/features/catalog/my-courses.tsx" \
  "src/features/dashboards/live-attendance.tsx" \
  "src/features/catalog/mock-courses.ts" \
  "src/features/catalog/mock-enrollments.ts" \
  "src/features/dashboards/mock-users.ts" \
  "write_attendance.py" \
  "write_attendance_part1.py" \
  "write_attendance_part2.py" \
  "D:/Projects-code/liveschool-original-backup-20261125/"
```

Recompute the original 517-file manifest and confirm it still equals `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`. Never execute the three Python files.

**Step 3 — create a clean integration worktree without changing the original worktree.**

```bash
git -C "D:/Projects-code/liveschool" worktree add \
  "D:/Projects-code/liveschool-integration" \
  -b integration/phase-01-core-stabilization main
git -C "D:/Projects-code/liveschool-integration" merge --no-ff \
  remediation/phase-01-core-stabilization \
  -m "merge: integrate Phase 01.6 remediation"
git -C "D:/Projects-code/liveschool-integration" status --short
git -C "D:/Projects-code/liveschool-integration" log -1 --oneline
```

Install locked dependencies and run the same gates in the clean integration worktree:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npx playwright test --config=playwright.preview.config.ts
npm run build
git diff --check
```

All commands must pass; lint must report zero errors and only the known warning. Stop on any merge conflict or failure and resolve it without discarding either work product.

**Step 4 — integrate into the original `main` only after overlap reconciliation.**

The original worktree must retain its protected files until the operator has separately committed or otherwise reconciled their intended changes, especially `src/features/catalog/my-courses.tsx` and `src/features/dashboards/live-attendance.tsx`. Do not use destructive commands to make the merge fit. Once no uncommitted overlap remains and merge approval is explicit, run from `D:/Projects-code/liveschool`:

```bash
git status --short
git merge --no-ff integration/phase-01-core-stabilization
git status --short
git log -1 --oneline
```

Confirm the external nine-file backup remains byte-identical to the pre-integration originals. Any push or remote operation requires separate explicit approval.

### 18.5 Deployment requirements

- Accept or resolve every remaining blocker in section 18.2 before production sign-off; the verifier and fingerprint blockers are closed.
- Deploy only the reviewed integrated commit; no deployment command is authorized by this report.
- Do not rerun either database migration or history reconciliation. The successful schema migration is complete and history is reconciled.
- Keep Supabase credentials server-only, confirm the deployment points to the verified project, and rebuild after any public environment-variable change.
- Keep direct chat writes, attachments, notifications, payments, meeting providers, Realtime, and other disabled or preview-only features disabled.
- Perform non-mutating post-deployment smoke checks for public catalog/groups, login and registration rendering, restricted-route redirects/404s, and `/api/chat-attachment` returning 404. Do not create synthetic production records.
- Monitor server errors, authentication failures, RLS denials, and enrollment/attendance failures after release.
- Application rollback must use the previous reviewed application commit. Do not execute database rollback while protected history exists; forward reconciliation is the conservative path.

### 18.6 Release decision

**Not approved for production deployment.** Database evidence is complete and the branch is locally verified, but runtime-unverified database acceptance, remaining product/concurrency risk disposition, original-worktree overlap reconciliation, and explicit commit/merge/deployment approvals remain mandatory. The recommended next action is controlled integration in a clean worktree, not another production migration or verifier run.
