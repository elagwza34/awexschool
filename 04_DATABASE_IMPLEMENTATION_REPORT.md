# LiveSchool Database Audit and Unified SQL Migration Report

Date: 2026-11-25
Workspace: `D:\Projects-code\liveschool-integration`
Integration branch: `integration/phase-01-core-stabilization`
Remediation commit: `959fc51fa03fc7994af9891000a605da596de3da`
Integration merge commit: `c03baa4e82fce89d30b154bd97e49df925897abb`
Scope: full source-tree and database-contract audit, production-diagnostic reconciliation, controlled local integration, and a review-only Phase 01.7 SQL proposal. The operator manually executed the supplied production diagnostics and the successful `20261124010000` migration. The authorized local merge changed only the integration worktree; no agent production database access, deployment, push, merge into original `main`, or Phase 02 work was performed.

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

Both corrections have failing-then-passing package regressions. The final integration database-package suite passes 39/39 and the full unit suite passes 174/174, including 20 static Phase 01.7 proposal contracts. These are repository/static-contract results only; production execution is classified separately in section 12.10.

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

Fresh local verification in the integration worktree on 2026-11-25:

| Command | Result |
| --- | --- |
| `npm test` | 174 passed, 0 failed, 0 skipped |
| `node --test tests/unit/database-package.test.mjs` | 39 passed, 0 failed |
| `node --test tests/unit/remediation-proposal.test.mjs` | 20 passed, 0 failed |
| `node --test tests/unit/protected-preview-reconciliation.test.mjs` | 4 passed, 0 failed |
| `npm run typecheck` | Passed, exit code 0 |
| `npm run lint` | Passed, exit code 0; zero errors and zero warnings |
| `npx playwright test --config=playwright.preview.config.ts` | 17 passed, 0 failed; the scrubbed `build:test` web-server prerequisite also passed |
| Scrubbed `npm run build:test` | Passed with an inherited-variable-free local-only test environment; 11 static pages generated |
| `npm run build` | Next.js 16.4.6 webpack production build passed; 11 static pages generated |
| `git diff --check` | Passed, exit code 0 |

Application unit tests cover the synchronized enrollment and attendance calls, frozen-roster loading, input validation, mutation outcomes, public-client boundaries, assignment scope, settings grants, owner bootstrap, parent submission privacy, fail-closed client configuration, course archival, protected preview reconciliation, QA isolation, and the static contracts in section 19. The archive regression first failed against the invalid `id` projection and then passed after the production query changed to `requester_id`.

The integration merge completed without conflicts at `c03baa4e82fce89d30b154bd97e49df925897abb`. The nine protected originals are preserved byte-for-byte in `D:/Projects-code/liveschool-original-backup-20261125`. The protected preview behavior was reconciled through explicit fixture modules and `isPreviewFixtureEnvironment()`: only `NEXT_PUBLIC_LIVESCHOOL_ENV=test` or `LIVESCHOOL_ENV=test` enables fixture fallback, `NODE_ENV=test` alone does not, ready live data always wins, production failures remain errors, and attendance fixture IDs cannot initiate writes. The syntactically invalid original attendance component was not copied wholesale; its preserved sessions, members, and records were moved into a read-only preview fixture module.

Windows checkout normalization initially converted SQL/MJS files to CRLF and broke newline-sensitive database-package checks. `.gitattributes` now enforces LF for `*.sql` and `*.mjs`; all tracked SQL/MJS paths were normalized without staged content changes. Root and canonical migrations remain byte-identical with SHA-256 `91bbaba89108e490157aa1bcf36c73730c1d18507b5218e3373c599677fbcac2`. `git diff --check` passes. A fresh high-confidence credential-pattern scan covered all 13 intended changed/untracked integration paths and found no private keys, JWTs, cloud access keys, GitHub tokens, or Supabase secret/publishable keys. The original repository remains on `main` at `77661f42ef1fc6a8261b7bb32410a5d9fa9b3445`; its 517-file manifest still hashes exactly to `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`, and all nine protected backup hashes still match.

No approved local PostgreSQL runtime, Docker runtime, or staging project is available. The first-run insertion path of `05_MIGRATION_HISTORY_RECONCILIATION.sql`, PostgreSQL parsing/execution of the Phase 01.7 proposal, and synthetic JWT/RLS/concurrency tests therefore remain runtime-unverified; the production `already_recorded` path, post-reconciliation verifier pass, and unified-migration outcome are separately classified as production-observed.

## 17. Residual findings

The following remain open and are not represented as solved by the applied `20261124010000` migration. Section 19 contains the review-only Phase 01.7 proposal; preparing that proposal does not resolve these risks.

- Course archival uses an application-side active-enrollment precheck that is not atomic with the archive update. The invalid `id` projection is corrected, but the database-owned concurrency guard is proposed and not applied.
- Public teacher intake lacks CAPTCHA/rate limiting and verified email ownership. The proposed authenticated intake and challenge model is not applied and its provider requires separate approval.
- Parent/guardian provisioning has no live application workflow.
- The production-observed active enrollment lacks historical reviewer metadata; it is preserved without inventing a past review decision. The proposed separate acknowledgment path is not applied.
- Enrollment identity still uses `requester_id` plus free-text `learner_name`; a guardian-requested enrollment cannot be authoritatively mapped to a particular child because the applied enrollment table has no student foreign key.
- Published lessons are anonymously readable under the verified canonical RLS, while the application lesson route enforces an enrollment gate. The proposed strict lesson-body policy is not applied and requires explicit product approval.
- Group membership does not require an active course enrollment; the verifier reports `members_without_active_enrollment` as a residual metric. The proposed database guards are not applied.
- Reserved/paid join requests do not consume group capacity. The proposed reservation-accounting guards and revoked future-workflow functions are not applied.
- Current service-role enrollment/teacher-intake writes and caller-supplied `p_actor` signatures remain until a coordinated application cutover accompanies the proposed database changes.
- Online sessions and calendar behavior remain fixture/simulation-only.
- Notifications, support intake/replies, payment workflows, and advanced assessments remain inactive or incomplete.
- No generated database types exist.
- Production migration history is reconciled, the current verifier revision passed 19/19 with zero errors, and all four current catalog fingerprints exactly match the baseline. This evidence gap is closed.
- Synthetic JWT, concurrency, PostgreSQL parsing/execution, and live database tests remain runtime-unverified.
- The local environment cannot execute PostgreSQL migrations without separately approved setup.
- Seven moderate npm dependency vulnerabilities were reported by `npm ci`; no dependency remediation or `npm audit fix` was authorized or performed.

## 18. Controlled integration status

**LOCAL INTEGRATION PREPARED; NOT APPROVED FOR DEPLOYMENT OR SQL EXECUTION.** The production verifier passed 19/19, all four catalog fingerprints exactly match the baseline, migration history and attendance/event consistency are confirmed, and the available local gates pass. The isolated remediation commit and local integration worktree are complete. The nine-risk Phase 01.7 plan and SQL candidate remain review-only and runtime-unverified. No merge into original `main`, push, deployment, production write, or disabled-feature activation was performed.

### 18.1 Verified evidence

- Production-observed PostgreSQL `17.11`: the current verifier revision passed 19/19 with zero failures and zero SQL errors at `2026-11-25T00:14:36.827547+00:00`.
- Production-observed canonical tables, columns, constraints, functions, RPC privileges, RLS policies, catalog rules, attendance integrity, and disabled-feature containment.
- Exact current fingerprint matches for columns, policies, functions, and constraints; migration history is 16 records with latest `20261124010000`; `attendance_event_mismatch` is `0`.
- Production-observed history reconciliation: `already_recorded`, 16 records, latest `20261124010000`, unchanged baseline fingerprints, no schema SQL executed, and no production application data modified.
- Repository-verified application/database corrections with RED-to-GREEN coverage, including parent submission privacy, null-client fail-closed behavior, owner-email validation, RLS-bearing public reads, enrollment-aware course archival, verifier history enforcement, and attendance/event consistency.
- Independent whole-branch review completed; all four findings were verified and either fixed or explicitly deferred with their residual risk recorded.
- Authorized isolated remediation commit `959fc51fa03fc7994af9891000a605da596de3da` and conflict-free local integration merge `c03baa4e82fce89d30b154bd97e49df925897abb` exist only on the remediation and integration branches.
- Protected-file reconciliation preserved preview functionality through explicit fixture modules and environment gating, retained fail-closed live-data errors, and provided read-only attendance previews. Four focused regressions pass.
- The invalid archive enrollment projection was reproduced with failing tests and corrected to `requester_id`; both archive regressions pass. The separate atomic archival race remains open.
- Windows LF normalization is enforced for SQL/MJS files. Root and canonical migrations remain byte-identical with SHA-256 `91bbaba89108e490157aa1bcf36c73730c1d18507b5218e3373c599677fbcac2`.
- Fresh local evidence: 174/174 unit tests, 39/39 database-package tests, 20/20 Phase 01.7 static SQL contracts, 17/17 preview browser tests, TypeScript passed, lint zero errors and zero warnings, scrubbed test build passed, production build passed, and `git diff --check` passed.
- The original repository remains on `main` at `77661f42ef1fc6a8261b7bb32410a5d9fa9b3445`; its 517-file manifest still matches `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`, and all nine protected backup hashes still match.
- A high-confidence credential-pattern scan covered all intended integration payload paths with zero findings.

### 18.2 Remaining blockers

1. **Runtime-unverified database matrix:** real JWT/RLS, multi-role authorization, concurrency, roster capture, and live authenticated workflows require an approved disposable PostgreSQL/Supabase environment. They are not represented as passed. No risk has been accepted on the operator's behalf.
2. **SQL parsing and execution:** `06_PHASE_01_7_REMEDIATION_PROPOSAL.sql` has 20 passing static contract tests and focused manual review, but no PostgreSQL parser or runtime execution. It is not an applied migration.
3. **History first-run branch:** production exercised `already_recorded`; the insertion branch remains runtime-unverified. This metadata-only residual does not justify rerunning the successful schema migration.
4. **Course archive race:** the application precheck is not atomic with archival. The corrected projection restores the application check, while the review-only proposal contains the database-owned guard.
5. **Product/data-integrity residuals:** guardian-to-child enrollment identity, published-lesson RLS versus the application enrollment gate, membership without active enrollment, capacity reservation behavior, and legacy enrollment review metadata remain unresolved in production. Section 19 records the proposed solutions and acceptance criteria.
6. **Public teacher intake:** CAPTCHA/rate limiting and verified email ownership remain absent. The proposed authenticated intake and challenge model requires product/provider approval and coordinated application changes.
7. **Application cutover:** direct service-role writes and caller-supplied actor signatures in the current application do not match the proposed SQL contracts. The proposal must not be executed before the corresponding application changes are reviewed, tested, and coordinated.
8. **Approvals:** original `main` merge, push, production SQL execution, and deployment remain unapproved. The original `main` worktree still contains the three modified and six untracked protected files; the external backup and manifest prove preservation, not operator approval to discard or merge them.
9. **Dependency vulnerabilities:** seven moderate npm vulnerabilities were reported at dependency installation; no automatic remediation was performed.
10. **History reconciliation first-run:** no local database runtime exists to exercise insertion. Production's `already_recorded` result is sufficient for the current observed state and must not be rerun without a concrete drift signal.

### 18.3 Recommended next sequence

1. Review section 19 and `06_PHASE_01_7_REMEDIATION_PROPOSAL.sql`. Approve or revise the proposed strict lesson policy, guardian identity model, and authenticated teacher-intake behavior; do not waive them implicitly.
2. Approve the exact disposable PostgreSQL 17.11/Supabase environment setup before any provisioning. Use synthetic accounts and data only; never create synthetic production records.
3. After environment approval, parse and execute the candidate transaction in isolation, resolve any PostgreSQL defects, and run the real-JWT RLS and two-connection concurrency matrices in section 19.
4. Review the resulting evidence and preflight refusals. Then approve the coordinated application cutover and a separately scheduled production SQL window. Do not rerun `20261124010000`, the successful verifier, or history reconciliation without a new concrete drift signal.
5. Review the final local integration commit and request separate approval before any merge into original `main`. Any push or deployment requires its own explicit approval.

### 18.4 Completed controlled integration evidence

The approved local preparation was performed without changing original `main`:

1. **Isolated remediation commit:** `959fc51fa03fc7994af9891000a605da596de3da` on `remediation/phase-01-core-stabilization`, containing 47 files with 7,353 insertions and 525 deletions. The remediation worktree is clean.
2. **Protected backup:** all three modified and six untracked originals were copied to `D:/Projects-code/liveschool-original-backup-20261125` and verified byte-for-byte. The three Python patch scripts were never executed.
3. **Original manifest:** the sorted 517-file path/content hash remains `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`; original HEAD remains `77661f42ef1fc6a8261b7bb32410a5d9fa9b3445` on `main`.
4. **Clean integration worktree:** `D:/Projects-code/liveschool-integration` was created from original `main` on `integration/phase-01-core-stabilization`. The local `--no-ff` integration merge is `c03baa4e82fce89d30b154bd97e49df925897abb`; no merge conflicts occurred.
5. **Overlap reconciliation:** live-data error states and real query results remain primary. Protected catalog and attendance preview data now lives in explicit fixture modules, is enabled only by a test-specific environment flag, is visibly labeled in preview mode, and cannot authorize fixture-ID writes.
6. **Windows normalization:** `.gitattributes` enforces LF for SQL and MJS files. The 52 tracked SQL/MJS paths were normalized with no staged content change, restoring canonical migration byte identity and newline-sensitive tests.
7. **Application correction:** `archiveCourse()` now selects `requester_id` from `course_enrollments`, not the nonexistent `id` column. Two RED-to-GREEN regressions pin the real PostgREST projection contract.
8. **Verification:** the complete local gate set in section 16 passes after reconciliation. The final integration payload is reviewed for secrets, whitespace, scope, disabled-workflow containment, and review-only SQL status before the authorized local integration commit.

No stash, reset, restore, clean, force-push, merge into original `main`, remote operation, or deployment was used. The pre-existing detached temporary worktree was not modified.

### 18.5 Deployment requirements

- Resolve or explicitly disposition every remaining blocker in section 18.2 before production sign-off; the production verifier and fingerprint evidence gaps are closed.
- Review and approve the Phase 01.7 proposal and its coordinated application changes before any SQL execution. The proposal is not a deployment artifact until separately approved and isolated-tested.
- Deploy only a reviewed application commit. No deployment command is authorized by this report.
- Do not rerun either applied database migration or history reconciliation. The successful schema migration is complete and history is reconciled.
- Keep Supabase credentials server-only, confirm the deployment points to the verified project, and rebuild after any public environment-variable change.
- Keep direct chat writes, attachments, notifications, payments, meeting providers, Realtime, and other disabled or preview-only features disabled.
- Perform non-mutating post-deployment smoke checks for public catalog/groups, login and registration rendering, restricted-route redirects/404s, and `/api/chat-attachment` returning 404. Do not create synthetic production records.
- Monitor server errors, authentication failures, RLS denials, and enrollment/attendance failures after release.
- Application rollback must use the previous reviewed application commit. Do not execute database rollback while protected history exists; forward reconciliation is the conservative path.

### 18.6 Release decision

**Not approved for production deployment or Phase 01.7 SQL execution.** Local integration preparation is complete and locally verified. PostgreSQL parsing/execution, real-JWT RLS and concurrency assurance, product-policy approval, coordinated application cutover, original `main` merge, and any push or deployment remain separate approval gates. No unresolved risk is accepted or waived by this report.

## 19. Nine-risk remediation plan

**Status:** review-only plan. No item below is accepted, waived, implemented in production, or represented as runtime-tested. The consolidated SQL candidate is `06_PHASE_01_7_REMEDIATION_PROPOSAL.sql`; it is not an applied migration and must not be run until the application rollout, isolated test evidence, and operator approval are complete.

### 19.1 Common controls and sequencing

- Use one disposable PostgreSQL 17.11/Supabase environment with Auth and PostgREST. Production must not receive synthetic users, JWTs, reservations, attendance, or concurrency probes.
- Use real user JWTs for every ordinary-user authorization test. The service role may seed and inspect synthetic state, but must not impersonate a student, guardian, teacher, manager, support user, administrator, or owner.
- Keep `search_path = ''` on every new or replaced `SECURITY DEFINER` function, schema-qualify every relation, revoke public execution, and grant only the required role.
- Run schema preflight and final invariant assertions in the same transaction as any future approved migration. Existing invalid data must produce a refusal and a count, never an automatic delete or invented backfill.
- Deploy application and database changes in one approved maintenance sequence. Functions whose signatures lose caller-supplied actor parameters require the matching application deployment; do not expose a window in which old and new authorization contracts are mixed.
- Keep group join/payment workflows, notifications, attachments, Realtime, online sessions, and other disabled features disabled. Database guards may be installed without granting live workflow execution.
- After isolated verification, request separate approval for production SQL execution. Do not rerun `20261124010000`, the successful verifier, or history reconciliation without a new concrete drift signal.

### 19.2 JWT and RLS authorization testing

**Root cause:** the applied schema has repository-reviewed policies and JWT-aware enrollment/attendance RPCs, but no approved local PostgreSQL/Supabase runtime exists. Static SQL assertions cannot prove actual `anon`, `authenticated`, `auth.uid()`, column-grant, or PostgREST behavior.

**Severity:** Critical release-assurance gap.

**Proposed solution:** create a role-by-resource authorization matrix in the disposable environment. Sign in synthetic users through Supabase Auth and call both the application RPCs and direct PostgREST endpoints. Cover anonymous, student, parent, teacher, manager, support, admin, and owner actors; include inactive profiles, unlinked guardians, wrong-course actors, and tampered JWT claims. Assert allowed row sets and denied writes, not merely HTTP status codes. Include the direct lesson-body bypass, enrollment review, attendance, group chat, teacher onboarding, public catalog, and column-level teacher/settings exposure.

**Affected files:** proposed `tests/database/rls-authorization.test.mjs`, `tests/database/fixtures/synthetic-users.mjs`, `tests/database/README.md`; canonical and proposed SQL; `src/features/auth/supabase-server.ts`; enrollment, attendance, group-chat, teacher-onboarding, and public-catalog modules named in the matrix.

**Database requirements:** canonical migration plus the approved incremental proposal in the disposable environment; RLS enabled on every application table; explicit least-privilege grants; real Auth users and JWTs; deterministic synthetic seed and cleanup. No production database requirement.

**Acceptance criteria:** every expected allow returns exactly the expected synthetic rows; every expected deny returns zero rows or the documented permission error; no unauthorized insert/update/delete succeeds; service-role-only functions remain non-executable by ordinary roles; anonymous lesson bodies are denied under the proposed strict policy; results are saved as a machine-readable matrix with zero unexplained discrepancies.

### 19.3 Database concurrency testing

**Root cause:** several workflows depend on locks and transitions, but the current evidence is static or production-observed only. No two-connection test has exercised review/archive, group-capacity, or conflicting attendance transitions.

**Severity:** Critical release-assurance gap.

**Proposed solution:** run bounded two-connection and multi-connection tests with barriers, real user JWTs, transaction rollback, and explicit lock/statement timeouts. Exercise duplicate enrollment review, review versus archive, final-seat reservation/approval, concurrent membership changes, and conflicting attendance updates. Record commit/rollback outcome, final row state, event count, elapsed time, and any deadlock or timeout. Do not use service-role credentials to simulate ordinary-user concurrency.

**Affected files:** proposed `tests/database/concurrency.test.mjs` and scenario modules; `public.review_course_enrollment_as_admin`, proposed archive guard, proposed group reservation/approval RPCs, and `public.record_session_attendance`; corresponding server actions.

**Database requirements:** disposable PostgreSQL/Supabase only; synthetic actors and resources; the approved guard functions/triggers; PostgreSQL lock visibility appropriate to the tested isolation level. No production writes.

**Acceptance criteria:** review/archive always ends in either `archived` with no active enrollment or `published` with the reviewed enrollment; group membership plus live holds never exceeds capacity; attendance has a serialized append-only event history and current state equals the last event; duplicate review produces one state transition; no unexpected deadlock, timeout, lost update, or duplicate event occurs in the agreed contention scenarios.

### 19.4 Course archival race conditions

**Root cause:** `archiveCourse()` performs an active-enrollment query and a separate course update. A concurrent enrollment activation can commit between them. The local integration also exposed a separate projection defect: the precheck selected nonexistent `course_enrollments.id`; this application defect is now corrected to `requester_id` with RED-to-GREEN regression coverage. The projection fix does not make archival atomic.

**Severity:** High.

**Proposed solution:** retain the application precheck for a fast user-facing failure, but enforce the invariant in PostgreSQL. A `BEFORE UPDATE` trigger on `courses.status` must lock the course row and reject archival when an active enrollment exists. Enrollment review already locks the course before the enrollment, giving both paths the same course-first lock order. The trigger must be security-definer with an empty search path and must not be directly executable.

**Affected files:** `src/features/catalog/catalog-admin-actions.ts`; `tests/unit/catalog-archive.test.mjs`; proposed archive function/trigger in `06_PHASE_01_7_REMEDIATION_PROPOSAL.sql`; proposed concurrency test.

**Database requirements:** `liveschool_internal.prevent_course_archive_with_active_enrollments()` and a row-level trigger on `public.courses`; existing restrictive enrollment/course foreign keys; active-enrollment index. No existing row backfill.

**Acceptance criteria:** archival with any active enrollment fails without changing course status; archival without active enrollment succeeds; review-versus-archive contention produces only the two valid terminal states in section 19.3; direct service-role or SQL updates cannot bypass the trigger; the invalid `id` projection cannot regress.

### 19.5 Guardian enrollment identity

**Root cause:** `course_enrollments` is keyed by `(requester_id, course_id)` and stores only free-text `learner_name`. A parent can name any child; there is no `student_id`, guardian-link proof, or uniqueness rule for one active enrollment per actual learner.

**Severity:** Critical data-integrity and privacy risk.

**Proposed solution:** add nullable `student_id` with a restrictive profile foreign key. Existing rows remain unchanged with `student_id = null`, explicitly meaning unresolved legacy identity. Add a JWT-bound `request_course_enrollment` RPC that derives `requester_id` and verified display name from `auth.uid()`, accepts a student self-request or a parent request for an active linked student, rejects unlinked/inactive actors, and serializes same-course requests. Add a partial unique index for active `(student_id, course_id)` rows. Update enrollment reads, lesson authorization, group membership checks, and admin display to use the effective student identity. Revoke direct service-role enrollment INSERT after the coordinated application cutover.

**Affected files:** `src/features/catalog/enrollment-actions.ts`, `catalog-data.ts`, `my-courses.tsx`; course detail/enrollment UI; `src/app/(public)/courses/[courseId]/lessons/page.tsx`; `src/app/(portals)/admin/catalog/page.tsx`; proposed enrollment RPC, policies, index, and grants in the SQL proposal; enrollment and RLS tests.

**Database requirements:** `course_enrollments.student_id`, restrictive FK, identity-validation trigger/RPC, active-identity unique index, expanded SELECT policy for student/linked guardian, and execution/table privilege changes. Existing legacy rows must not be automatically mapped to a student.

**Acceptance criteria:** a student can request only their own active identity; a parent can request only an active `guardian_links` student; submitted names cannot override profile identity; unlinked, inactive, wrong-role, and anonymous calls fail; two active enrollments for the same student/course cannot exist; legacy null identities remain null and visible as unresolved; all downstream access uses the authoritative student where present.

### 19.6 Published lesson access permissions

**Root cause:** the application lesson route requires an active enrollment, but canonical RLS and grants allow `anon` and `authenticated` to read every lesson body in a published course. Direct PostgREST access bypasses the UI gate.

**Severity:** High confidentiality risk.

**Proposed solution:** adopt an explicit strict lesson-body policy: published course metadata and units may remain available for public discovery, but lesson rows/bodies require authentication and course authorization. Recommended authorized actors are the enrolled student, a linked guardian for an authoritative student enrollment, the assigned course teacher, and active admin/owner. Add one security-definer helper, `liveschool_internal.can_read_course_lessons(course_id)`, and use it for the lesson SELECT policy. Revoke anonymous `lessons` SELECT and grant authenticated SELECT only. The consolidated proposal deliberately leaves public unit/course metadata policies unchanged. Update the application route to use the same authorization contract rather than maintaining a second, narrower enrollment-only rule.

**Affected files:** `src/app/(public)/courses/[courseId]/lessons/page.tsx`; `src/features/catalog/live-catalog.ts` if public unit queries are retained; proposed helper and lesson policy in the SQL proposal; RLS tests.

**Database requirements:** helper function, replacement lesson policy, anonymous lesson grant revocation, authenticated lesson grant, and explicit execute grant for the helper. Public course and unit metadata policies remain unchanged.

**Acceptance criteria:** anonymous and unenrolled authenticated direct reads return no lesson rows; enrolled students, linked guardians, assigned teachers, and active admins/owners receive exactly their authorized course content; users cannot read another course by changing IDs; archived-course content is denied; application navigation and direct PostgREST behavior agree.

### 19.7 Group membership and enrollment consistency

**Root cause:** `save_learning_group()` validates active student accounts but does not require an active enrollment in the group's course. `group_members` has no database guard, so direct or future writes can create inconsistent membership.

**Severity:** High.

**Proposed solution:** add `liveschool_internal.has_active_course_enrollment(student_id, course_id)` using authoritative `student_id` where present and the existing self-requester identity only for legacy rows. Require it in the JWT-bound group-save RPC and in a trigger on `group_members` INSERT/student update. A group course change must revalidate every current member under the group lock. Preflight must report and refuse existing violations rather than deleting them.

**Affected files:** `src/features/enrollments/group-admin-actions.ts`; `src/features/enrollments/registration.ts`; proposed group-save replacement, helper, and membership/course-change triggers in the SQL proposal; group and enrollment tests.

**Database requirements:** enrollment-aware helper, membership validation trigger, group course-change validation trigger, and coordinated replacement of `save_learning_group()` with an `auth.uid()`-bound signature. No automatic membership cleanup.

**Acceptance criteria:** no new member can be inserted without active enrollment in the group's course; inactive or unrelated students are rejected; changing a group's course fails while any member lacks the new course enrollment; legacy ambiguous identities cannot be used to infer eligibility; existing violations cause a safe preflight refusal and remain unchanged.

### 19.8 Group capacity reservations

**Root cause:** live group saving counts only `group_members`. It ignores `group_join_requests` in `reserved` or `paid` state, even though the preview model already treats unexpired reservations and paid requests as held seats. The open-request unique index also treats expired reservations as open until their status is changed.

**Severity:** High overselling and fairness risk.

**Proposed solution:** under a consistent group-row lock, define occupied seats as current members plus unexpired `reserved` requests and `paid` requests that are not already members. Add capacity guards for group capacity changes, membership inserts, and request status/expiry changes. Provide JWT-bound reserve, expire, and approve RPCs; approval must validate active enrollment and a succeeded payment before atomically inserting membership and finalizing the request. Expire stale reservations before a replacement reservation to avoid uniqueness conflicts. Create the workflow functions with execution revoked until the separately approved live group-join/payment workflow is enabled.

**Affected files:** `src/features/enrollments/registration.ts`; future live group-join/admin actions; proposed capacity helper, triggers, and revoked RPCs in the SQL proposal; capacity and concurrency tests.

**Database requirements:** group-lock capacity function, request/membership/capacity triggers, safe expiry logic, reservation/approval RPCs, and preflight checks for existing overcapacity or duplicate open holds. No payment-provider activation.

**Acceptance criteria:** members plus live holds never exceed capacity under concurrent requests; expired reservations release seats; paid requests continue to hold a seat until a valid terminal transition; a member is never double-counted; approval cannot succeed without active enrollment and succeeded synthetic payment evidence; final-seat contention has one winner; no live workflow execute grant is added by this proposal.

### 19.9 Legacy enrollment review metadata

**Root cause:** production-observed history contains an active enrollment with null `reviewed_by` and `reviewed_at`. The current table cannot distinguish a deliberately reviewed row from a legacy row whose review provenance is unavailable. Filling those fields now would fabricate history.

**Severity:** Medium audit-integrity risk.

**Proposed solution:** preserve both null fields. Add an append-only enrollment review-event table and a read-only audit view that labels non-pending rows with null metadata as `legacy_unreviewed`. New reviews write an event in the same transaction as the existing transition. Add an admin/owner JWT-bound acknowledgment RPC that records the current actor, time, and optional note without modifying the original enrollment review fields. Do not auto-acknowledge or backfill the legacy row.

**Affected files:** `src/app/(portals)/admin/catalog/page.tsx`; `src/features/catalog/catalog-mutations.ts`; proposed event table, audit view, review-event write, and acknowledgment RPC in the SQL proposal; report and audit tests.

**Database requirements:** append-only event table, immutable trigger, audit view, acknowledgment RPC, least-privilege admin read/execute grants. No update to existing `reviewed_by` or `reviewed_at`.

**Acceptance criteria:** the legacy row's fields remain null; the audit view explicitly reports `legacy_unreviewed`; a current administrator can record a separate acknowledgment with their real JWT identity; ordinary users cannot read or write audit events; new reviews create exactly one event; no historical reviewer or timestamp is invented.

### 19.10 Public teacher-intake abuse prevention

**Root cause:** the public server action uses the service role to insert `teacher_applications` without authentication, CAPTCHA, rate limiting, or verified email ownership. Public tracking reads by UUID alone. Teacher onboarding and group administration also accept caller-supplied actor UUIDs in service-role-only RPCs; server checks exist, but the database actor is not bound to `auth.uid()`.

**Severity:** High abuse, impersonation, and privilege-escalation risk.

**Proposed solution:** require an authenticated, active account with a confirmed email for new intake; add nullable `requester_id`, derive it from `auth.uid()`, and require the submitted email to match the Auth account. Verify a provider CAPTCHA token server-side before insertion and enforce database-backed per-user and trusted-IP-hash rate limits. Existing applications remain legacy with null `requester_id`; their tracking fallback may require both reference and matching email, while new applications are visible only to their authenticated requester. Replace direct public tracking reads with a restricted RPC. Replace caller-supplied `p_actor` in teacher onboarding and group saving with `auth.uid()`, invoke them through the administrator's session client, and add a JWT-bound teacher-application review RPC. CAPTCHA provider selection, keys, trusted-proxy configuration, and any email-provider setup require separate explicit approval.

**Affected files:** `src/app/(public)/teachers/apply/page.tsx`; `src/features/teachers/live-application-form.tsx`; `src/features/teachers/application-actions.ts`; `src/app/(public)/teachers/track/page.tsx`; `src/features/teachers/teacher-onboarding-actions.ts`; `src/features/enrollments/group-admin-actions.ts`; proposed intake/tracking/review/onboarding/group RPCs, rate-limit table, columns, policies, and grants in the SQL proposal; abuse and authorization tests.

**Database requirements:** nullable `requester_id` FK, verified-email/identity RPC, rate-limit table with hashed keys, restricted tracking RPC, JWT-bound onboarding/review/group functions, replacement policies/grants, and removal of direct service-role intake INSERT. Existing rows are preserved. No paid service or provider is provisioned by this plan.

**Acceptance criteria:** anonymous, inactive, unconfirmed-email, mismatched-email, invalid-CAPTCHA, and rate-limited submissions fail; a verified owner can submit and track only their own new application; another user cannot read it by UUID or email; legacy tracking requires both correct reference and email and is rate-limited; onboarding/group administration succeeds only for the JWT's active admin/owner; a supplied actor UUID cannot substitute for `auth.uid()`; all abuse tests run only with synthetic accounts.

### 19.11 Required approvals and release gate

1. Approve the strict lesson-access policy and authenticated teacher-intake model, including the exact CAPTCHA/rate-limit setup.
2. Approve creation of a disposable PostgreSQL/Supabase environment. No remote staging provisioning is authorized yet.
3. Review `06_PHASE_01_7_REMEDIATION_PROPOSAL.sql` and the coordinated application changes; approve implementation only after the isolated JWT/RLS and concurrency matrix is green.
4. Review any preflight refusal caused by existing inconsistent memberships, overcapacity, duplicate active identities, or unresolved legacy rows. Do not authorize automatic deletion or fabricated backfills.
5. Request separate approval for production SQL execution, application deployment, main merge, and any push. None is granted by this report.

### 19.12 Consolidated proposal status and application cutover

`06_PHASE_01_7_REMEDIATION_PROPOSAL.sql` is one transactional, review-only incremental candidate. Its header says `REVIEW ONLY — DO NOT EXECUTE` and states that it is not an applied migration. It contains preflight refusals, transaction-local timeouts, schema-qualified security-definer functions with empty search paths, least-privilege grants, and final assertions before `COMMIT`.

The candidate adds nullable authoritative identities without backfilling legacy rows, an active-identity unique index, enrollment review events and acknowledgment, authenticated/enrollment-aware lesson access, active-enrollment group guards, live-hold capacity accounting, one-time intake challenges and database throttling, and JWT-bound privileged RPC signatures. It explicitly drops the permissive legacy requester SELECT policy and revokes remaining column-level service-role update access. The disabled group reservation/approval/expiry routines remain non-executable. The proposal does not create publications, Storage buckets, direct-chat tables, notifications tables, or payment-provider workflows.

Twenty static tests in `tests/unit/remediation-proposal.test.mjs` pass. Focused manual review additionally corrected helper execute privileges, column-level revocation, exact payment and reviewer checks, approved-request preflight, legacy-policy bypasses, NULL status handling, exact identity-column assertions, the complete security-definer contract, and relation-specific trigger assertions. These checks do not prove PostgreSQL syntax, trigger execution, RLS behavior, or concurrency safety.

A coordinated application cutover is mandatory. `src/features/enrollments/enrollment-actions.ts` must stop direct service-role enrollment inserts and call the JWT-bound request RPC with an authorized student identity. `src/features/enrollments/group-admin-actions.ts` and `src/features/teachers/teacher-onboarding-actions.ts` must remove `p_actor` and invoke the replacement RPCs through the actor's session client. Public teacher submission/tracking must stop direct service-role reads/writes and use the challenge-bound RPCs; administrator application review must use the JWT-bound review RPC instead of direct service-role status updates. Existing callers will otherwise fail or bypass the proposed restrictions.

The proposal must remain unexecuted until an approved disposable PostgreSQL 17.11/Supabase environment parses and runs it, the real-JWT and concurrency matrices pass, the coordinated application diff is reviewed, preflight refusals are resolved without data fabrication, and the operator separately approves a production execution window.
