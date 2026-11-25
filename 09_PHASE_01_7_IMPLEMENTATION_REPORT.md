# Phase 01.7 Implementation Report

- **Date:** 2026-11-25
- **Status:** Prepared for separate operator review; **not approved, committed, merged, pushed, deployed, or executed against production**.
- **Worktree:** `D:\Projects-code\liveschool-integration`
- **Branch:** `integration/phase-01-core-stabilization`
- **Base commit:** `3f7d3826bbd55f750e61537c64b2cbd1785780ae`

## 1. Deliverables

| File | Purpose |
| --- | --- |
| `06_PHASE_01_7_REMEDIATION_PROPOSAL.sql` | Independently audited review-only source; explicitly marked do not execute. |
| `06_PHASE_01_7_MIGRATION.sql` | Consolidated incremental migration for manual Supabase SQL Editor execution after separate approval. |
| `07_PHASE_01_7_VERIFICATION.sql` | Strictly read-only, single-JSON post-migration verification. |
| `08_PHASE_01_7_ROLLBACK.sql` | Operator-controlled forward recovery or guarded pre-write inverse rollback. |
| `09_PHASE_01_7_IMPLEMENTATION_REPORT.md` | This report and manual runbook. |

The executable migration body is byte-identical to the audited proposal body. The canonical baseline files remain unchanged and both have SHA-256:

```text
91bbaba89108e490157aa1bcf36c73730c1d18507b5218e3373c599677fbcac2
```

The package preserves all 33 baseline tables and adds three RLS-enabled tables: `course_enrollment_review_events`, `teacher_intake_challenges`, and `teacher_intake_rate_limits`. Existing rows receive no fabricated identity or review backfill. Existing Auth accounts and migration-history rows are fingerprinted before and after the transaction.

## 2. Nine-risk disposition

| Risk | Implemented disposition | Runtime status |
| --- | --- | --- |
| JWT/RLS actor binding | Privileged RPCs derive the actor from `auth.uid()`; caller-supplied administrator/actor parameters were removed from the new contracts. Active-role helpers, schema-qualified security-definer functions, restricted grants, and fail-closed policies are enforced. | PGlite synthetic role/JWT-claim tests passed; real Supabase JWT/PostgREST remains unverified. |
| Concurrency | A deterministic course-first write fence, row locks, database-owned archive/review guards, capacity triggers, and immutable terminal metadata replace application-only checks. | SQL executed in one embedded connection; true multi-session concurrency remains unverified. |
| Course archival races | A database trigger refuses archival while active enrollments exist, closing the application-precheck race. | Synthetic archive refusal passed; concurrent archive/review remains unverified. |
| Guardian/learner identity | Added nullable authoritative `course_enrollments.student_id`, retained the existing `(requester_id, course_id)` primary key, added a unique active student/course index, and bound guardian enrollment to active guardian links. Legacy null identities remain visible but unresolved. | Synthetic student, guardian, conflict, and legacy cases passed. |
| Lesson permissions | Anonymous lesson access is removed. Authenticated access requires an active enrolled student, linked guardian, course owner, active group-assigned teacher, or active admin/owner. Draft courses remain private. | Synthetic allow/deny matrix passed; real JWT/RLS remains unverified. |
| Group membership/enrollment | Membership and group saves require active student profiles/roles and active enrollment in the group course. Course changes revalidate all members. | Synthetic eligibility and failure cases passed. |
| Capacity reservations | Occupied seats equal members plus unexpired reservations and paid holds, without double-counting existing members. Transition allowlists, exact succeeded-payment checks, and capacity triggers prevent overbooking and invalid lifecycle changes. | Synthetic capacity/payment cases passed; concurrent reservation races remain unverified. |
| Legacy review metadata | Added append-only review events, explicit legacy acknowledgment, immutable reviewer/transition metadata, and separate reporting of unresolved legacy rows. No legacy provenance was invented or erased. | Synthetic review/audit and non-regression cases passed. |
| Teacher-intake abuse | Limited intake to confirmed active student/parent requesters; added server-created, purpose/actor/application/email/IP-bound, expiring, one-time CAPTCHA challenges and throttling that records denied attempts. Direct service-role application writes were revoked. | Synthetic consumption, replay, wrong-actor, and throttling cases passed; provider/live Auth remains unverified. |

### Additional defect corrected during final audit

`track_teacher_application(uuid)` now rejects a challenge whose `actor_id` differs from the authenticated caller using null-safe `IS DISTINCT FROM`. This prevents an authenticated requester from consuming another actor's tracking challenge while preserving anonymous legacy tracking only when both actor IDs are null. The correction has a RED-to-GREEN regression test, verifier coverage, and a passing synthetic wrong-actor case.

## 3. Application-side changes

- **Enrollment and catalog:** submission uses the JWT-bearing session client and `request_course_enrollment`; students submit null identity; parents select an active linked learner UUID; duplicate requests remain successful; learner conflicts and unresolved legacy identities have distinct outcomes. My Courses, admin review, assignment access, and relation normalization use authoritative identities while retaining legacy visibility.
- **Groups and lessons:** group saves use the session client and the actor-free RPC. Student options require active enrollment and role status. Lesson bodies call `can_read_course_lessons` first and fail closed on denial or RPC error; no privileged client, local override, or fixture fallback remains in that path.
- **Teacher intake and onboarding:** submission and tracking use server-created challenges and JWT-bound RPCs. CAPTCHA is verified before privileged challenge creation. Admin review uses the JWT RPC. Onboarding verifies the administrator through the session/database and uses the privileged client only for Auth Admin user creation/compensation. New Auth users receive server-assigned student metadata.
- **Browser security:** local Playwright environments explicitly blank CAPTCHA, proxy, database, access-token, and service-role secrets. CSP allows only the configured Cloudflare Turnstile origins required by the intake widget.

## 4. Dependency remediation

The seven reported moderate npm vulnerabilities were addressed without upgrading Next.js, React, or Supabase frameworks.

- Added exact dev dependency `typescript-eslint@8.74.0`.
- Its TypeScript ESLint packages resolve together at `8.74.0`.
- The affected path now uses `minimatch@11.0.9`; unaffected paths remain on `minimatch@3.1.5`.
- No global `minimatch` override was introduced.
- `npm audit`: **0 vulnerabilities**.
- `npm audit --omit=dev`: **0 vulnerabilities**.

## 5. Verification evidence

| Gate | Result |
| --- | --- |
| SQL package/proposal focused suites | 52/52 passed. |
| `npm test` | 256/256 passed, zero skipped; repeated successfully in the final preview gate. |
| `npm run lint` | Passed, exit code 0. |
| `npm run typecheck` | Passed, exit code 0. |
| `npm run build` | Passed, exit code 0; Next.js 16.4.6 webpack production build compiled successfully. |
| `npm run test:qa:preview` | Passed: lint, typecheck, 256 unit tests, and 17/17 Playwright preview tests; browser duration 52.8 seconds. |
| Full/production npm audits | Both reported 0 vulnerabilities. |
| Focused chat and teacher-intake browser rerun | 3/8 passed: all three teacher-intake tests passed; all five protected chat tests failed because the routes redirected to `/login`. |
| Intended payload credential scan | 44 text files scanned; zero high-confidence findings. Only `.env.example` exists at the integration root; no `.env.local` was present. |
| Original repository fingerprint | 517 files; aggregate SHA-256 exactly matches `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`. |
| Protected backup | All nine protected files matched byte-for-byte. Original HEAD, branch, and nine-path status are unchanged. |
| `git diff --check` | Passed. |

### Embedded PostgreSQL lifecycle

Temporary PGlite 0.6.0 ran PostgreSQL 19.0 on WASM outside the repository. The canonical baseline's fresh-runtime-only preflight block was removed in the harness; the Phase 01.7 migration body itself was unmodified.

- Migration: all 135 statements executed through `commit`.
- Phase 01.7 verifier: 13/13 checks passed, zero failures/errors, `strictly_read_only: true`.
- Synthetic scenario groups: 5/5 passed.
- Post-write forward recovery: passed without data removal.
- Pre-write inverse rollback: passed with Auth, baseline tables, history, and attendance controls preserved.
- Restored-baseline verifier: 19/19 passed.
- Normalized exact-catalog comparison after inverse rollback: `exact_match: true`, no differences.

These results prove SQL/PLpgSQL execution and synthetic integrity behavior in PGlite. They do **not** prove PostgreSQL 17.11/Supabase, real JWT/RLS, PostgREST, Storage, or concurrency behavior.

### Full Playwright limitation

`npm run test:e2e` discovered 171 tests but was stopped after test 16 because its configuration supplies no authenticated session or local Supabase credentials. Protected admin/assignment tests were redirected to login and then timed out waiting for authenticated UI. At termination, 2 numbered tests had passed and 14 had failed: 13 timeouts and one chat-preview assertion. The run is not represented as passed.

One Node enrollment test was also printed as failed inside the aborted Playwright process. It passed in isolation and in two subsequent complete 256-test runs; no failure stack was produced before termination, so that Node-test output anomaly remains unexplained. The credential-scrubbed preview suite is the available passing browser gate.

A focused rerun of `tests/chat.spec.ts` and `tests/teacher-applications.spec.ts` completed eight tests: the three teacher-intake tests passed, while all five chat tests failed. The first chat assertion expected three contacts but found zero; the saved page snapshot showed the login page. The other four chat tests timed out waiting for protected chat controls on that same login page. The root cause is the missing authenticated session, not chat fixture data or a preview authorization bypass. These chat tests require approved synthetic Auth/session state and must not be made runnable by unprotecting the routes.

## 6. Remaining blockers and restrictions

1. **Real Supabase runtime:** PostgreSQL 17.11, real JWT claims, PostgREST, Storage, and Auth behavior require an approved disposable environment or a separately approved production validation window.
2. **Concurrency:** two-connection review/archive, reservation/capacity, and attendance races were not executed.
3. **Full authenticated E2E:** requires approved synthetic accounts/session state and a disposable Supabase runtime. Production must not receive synthetic records or test traffic.
4. **Existing-data preflight:** invalid existing memberships, over-capacity groups, unpaid paid/approved requests, missing baseline grants/functions, or missing canonical history cause a safe abort. Do not bypass guards or fabricate repairs; investigate the exact returned count/error first.
5. **Disabled workflows:** group reservation/approval remains non-executable to ordinary callers. The synthetic database transition check does not enable or approve that workflow. Direct chat, attachments, notifications, payment providers, and Realtime remain disabled.
6. **Cutover coordination:** the new RPC signatures require the matching application. Do not run the old application against the migrated schema or the new application against the old schema.

No unresolved risk is accepted or waived by this report.

## 7. Manual execution runbook

### 7.1 Mandatory authorization and validation gates

The following order is mandatory. Production migration is not an early step and must not be used as a substitute for isolated validation.

1. Obtain explicit approval for the exact disposable Supabase projects, test-only credentials, and the narrow environment-guard extension described in section 9.3. Do not provision or connect until that approval is recorded.
2. In the approved disposable environment, validate PostgreSQL 17.11 compatibility, Supabase Auth, real JWT claims, PostgREST, RLS, RPC grants, Storage permissions, activation/revocation, and cross-user/cross-role/cross-family isolation.
3. In separate disposable fresh-install and upgrade projects, run the complete migration matrix in section 9.4, including synthetic-data preservation, all 13 verifier checks, failure handling, forward recovery, guarded inverse recovery, restored-baseline fingerprint, and application/schema compatibility.
4. Run the complete authenticated E2E matrix in section 9.6 with synthetic accounts and normal user JWTs. Service-role credentials are limited to fixture setup and cleanup.
5. Run the true multi-connection concurrency matrix in section 9.7. Sequential checks do not satisfy this gate.
6. Re-run the complete final regression gate in section 9.9 and retain actual counts, artifacts, and exit codes.
7. Only after every mandatory isolated gate passes, request separate explicit production migration and coordinated cutover approval. No production access, migration, deployment, merge, push, or traffic change is authorized by this report.

### 7.2 Production preflight and backup — prepared, not executed

1. Freeze the approved application commit, lockfile, build artifact, and SQL hashes. Confirm the artifact contains the matching Phase 01.7 application contracts.
2. Confirm the production schema still matches canonical migration `20261124010000` and that this version is present in `supabase_migrations.schema_migrations`. Do not rerun the canonical migration or the review-only proposal.
3. Take a restorable database backup and verify the restore procedure in an approved isolated target before migration. Record backup identity, timestamp, retention, and responsible operator.
4. Capture pre-migration table counts, Auth-user count/fingerprint, migration-history fingerprint, constraint/index catalog, grants, and disabled-feature guards without exposing customer data.
5. Schedule a low-traffic maintenance window, stop application writers, drain active sessions, and place the application in maintenance/read-only mode. The migration uses a five-second lock timeout and 90-second statement timeout.

### 7.3 Production migration and verification — only after separate authorization

1. In the Supabase SQL Editor, open `06_PHASE_01_7_MIGRATION.sql` and run the **entire file once**. It starts and commits its own transaction. Expected result: success with no result rows. Any error aborts the transaction; capture the exact error and do not bypass it.
2. In a new SQL Editor operation, run `07_PHASE_01_7_VERIFICATION.sql` once. Require:

```json
{
  "strictly_read_only": true,
  "overall_status": "schema_checks_passed",
  "summary": { "total": 13, "ok": 13, "failed": 0, "errors": 0 }
}
```

3. Compare post-migration Auth, baseline-table, and migration-history fingerprints with the pre-migration snapshot. Investigate every difference; do not weaken assertions.
4. Confirm PostgREST exposes the expected new RPC signatures and no obsolete conflicting overload. Reload the schema cache only through the approved Supabase procedure if required.
5. If any check fails, keep writers stopped and follow the rollback decision criteria in section 7.5. Do not deploy the matching application over an unverified schema.

The migration deliberately does not insert a Phase 01.7 migration-history row; existing history is preserved exactly. If a separate history entry is required, prepare and approve that metadata-only step independently.

### 7.4 Deployment, smoke tests, and traffic reopening — prepared, not executed

1. After separate deployment approval, deploy the matching Phase 01.7 application artifact. Configure server-only `TEACHER_INTAKE_CAPTCHA_SECRET` and public `NEXT_PUBLIC_TEACHER_INTAKE_CAPTCHA_SITE_KEY`; configure trusted proxy values only if the deployment uses that proxy path. Missing CAPTCHA configuration fails closed.
2. Perform non-destructive production smoke checks with operator-approved existing accounts and no synthetic records: anonymous catalog versus lesson denial; authenticated session refresh; student self-enrollment denial/visibility as applicable; linked-parent scope; teacher assigned-group access; administrator review authorization; CAPTCHA intake/tracking failure handling; and confirmation that disabled group approval, chat writes, attachments, notifications, payments, meeting providers, and Realtime remain contained.
3. Monitor application logs, PostgREST errors, Auth failures, database locks, capacity/review invariants, and error rates. Any authorization expansion, data-integrity violation, or unexplained error keeps traffic closed.
4. Reopen traffic only after migration verification, fingerprint comparison, deployment health, smoke tests, and monitoring criteria all pass and the responsible operator records approval.

### 7.5 Rollback decision criteria and forward recovery

Keep writers stopped and choose forward recovery if any of the following occurs: verifier failure, Auth/RLS/PostgREST regression, RPC signature mismatch, data-integrity anomaly, unexpected lock/deadlock behavior, elevated application errors, or failed smoke tests.

Keep the Phase 01.7 schema and matching application. In one SQL Editor session run:

```sql
select set_config('liveschool.phase_01_7_application_stopped', 'true', false);
select set_config('liveschool.phase_01_7_rollback_approval', 'phase_01_7_operator_approved', false);
select set_config('liveschool.phase_01_7_rollback_mode', 'post_write_forward', false);
```

Then run all of `08_PHASE_01_7_ROLLBACK.sql`. Expected result includes `status: forward_reconciliation_required` and `data_removed: false`. Re-run `07_PHASE_01_7_VERIFICATION.sql` and reconcile forward; do not delete authoritative identity, review, challenge, or rate-limit data. A backup restore is a separately approved recovery action and must account for writes accepted after the backup.

### 7.6 Guarded pre-write inverse rollback

Use only before any new authoritative enrollment, intake identity, review event, challenge, or rate-limit row exists, and only when the matching pre-Phase-01.7 application is ready. In one SQL Editor session run:

```sql
select set_config('liveschool.phase_01_7_application_stopped', 'true', false);
select set_config('liveschool.phase_01_7_rollback_approval', 'phase_01_7_operator_approved', false);
select set_config('liveschool.phase_01_7_rollback_mode', 'pre_write_inverse', false);
```

Then run all of `08_PHASE_01_7_ROLLBACK.sql`. Expected result is `pre_write_inverse_completed`; any nonzero new-data guard refuses rollback. This mode restores known baseline risks and must not be paired with the Phase 01.7 application.

## 8. Authorization boundary

No production database access or write was performed. No production credentials or customer data were used. No paid infrastructure was provisioned. No Phase 01.7 commit, merge into `main`, push, deployment, publication, or Phase 02 work was performed.

## 9. Final Validation Gate report

### 9.1 Executive summary

**Classification: VALIDATION BLOCKED**

The verified local implementation remains at **75/100 controlled production readiness**, unchanged from the prior readiness report. The SQL package, application changes, dependency lockfile, local unit/browser/build gates, credential scan, and original-repository preservation checks are internally consistent. Mandatory release evidence is still absent: no approved disposable Supabase identity exists, real Supabase Auth/JWT/PostgREST/RLS/RPC/Storage behavior has not been executed, the authenticated E2E matrix is incomplete, true multi-connection concurrency has not been executed, and isolated fresh/upgrade/failure/recovery validation has not been executed. Production must not be used to fill these gaps.

This is not a whole-product completion claim and is not approval for a local commit, production migration, deployment, merge, push, provisioning, feature activation, or Phase 02.

### 9.2 Implementation integrity evidence

| Check | Observed evidence |
| --- | --- |
| Integration worktree | `D:\Projects-code\liveschool-integration`; branch `integration/phase-01-core-stabilization`; HEAD `3f7d3826bbd55f750e61537c64b2cbd1785780ae`. |
| Pending payload | 44 paths: 30 modified tracked files and 14 untracked files; nothing staged. Tracked diff before this report edit: 30 files, 1,549 insertions, 399 deletions. |
| Original repository | `D:\Projects-code\liveschool`; branch `main`; HEAD `77661f42ef1fc6a8261b7bb32410a5d9fa9b3445`; status remains exactly the nine protected paths. |
| Original fingerprint | 517 files; aggregate SHA-256 `23c637b8b0656388f453b202e7fb1d9038843a049d35f7e6aa55ee38923c8682`. |
| Protected files | All nine files match `D:\Projects-code\liveschool-original-backup-20261125` byte-for-byte. The three attendance Python scripts were never executed. |
| Canonical baseline | `01_FULL_DATABASE_MIGRATION.sql` and `supabase/migrations/20261124010000_unified_database_reconciliation.sql` both hash to `91bbaba89108e490157aa1bcf36c73730c1d18507b5218e3373c599677fbcac2`. |
| Phase 01.7 SQL | Migration `46af318f...8e291`; verifier `6e4954d8...e3f40`; rollback `e4dbe820...b5a`; proposal `47849642...6909`. Proposal and migration executable bodies are identical: 641 semicolons each; body SHA-256 `5772241a8fcc2979508e719ce08d298a85d33f722b5f6accd32025c3d18dab09`. |
| Application/schema compatibility | Static contracts and local tests are aligned with the new actor-free RPC signatures and authoritative `student_id`; real Supabase runtime compatibility remains unverified. |
| Dependencies | `typescript-eslint@8.74.0`; lockfileVersion 3; root dependencies/devDependencies match; installed direct dependencies match; `npm ls --all --depth=0` and `npm ci --dry-run --ignore-scripts` passed. |
| Credential safety | 44 intended text payload files scanned; zero high-confidence findings. Only `.env.example` exists at the integration root; no `.env.local` was present. |
| Whitespace/status | `git diff --check` passed before this report edit; final post-edit verification is recorded in section 9.9. |

#### Minimal local commit plan — not executed

Use one local commit for the current 44-file implementation only after explicit commit authorization. Do not use `git add -A` or `git add .`. The commit is not release approval and does not replace the mandatory isolated validation.

Proposed message:

```text
fix: complete Phase 01.7 authorization and integrity remediation
```

Exact staging plan:

```bash
git add -- "06_PHASE_01_7_REMEDIATION_PROPOSAL.sql" "06_PHASE_01_7_MIGRATION.sql" "07_PHASE_01_7_VERIFICATION.sql" "08_PHASE_01_7_ROLLBACK.sql" "09_PHASE_01_7_IMPLEMENTATION_REPORT.md"
git add -- "package.json" "package-lock.json" "playwright.config.ts" "src/proxy.ts"
git add -- "src/app/(portals)/admin/catalog/page.tsx" "src/app/(public)/courses/[courseId]/lessons/page.tsx" "src/app/(public)/courses/[courseId]/page.tsx" "src/app/(public)/teachers/apply/page.tsx" "src/app/(public)/teachers/track/page.tsx"
git add -- "src/features/catalog/catalog-admin-actions.ts" "src/features/catalog/catalog-data.ts" "src/features/catalog/catalog-mutations.ts" "src/features/catalog/enrollment-actions.ts" "src/features/catalog/my-courses.tsx"
git add -- "src/features/dashboards/live-assignment-access.ts" "src/features/enrollments/admin-learning-groups.tsx" "src/features/enrollments/group-admin-actions.ts" "src/features/enrollments/live-group-editor.tsx"
git add -- "src/features/teachers/application-actions.ts" "src/features/teachers/live-application-form.tsx" "src/features/teachers/live-tracking-form.tsx" "src/features/teachers/teacher-captcha.tsx" "src/features/teachers/teacher-intake-security.ts" "src/features/teachers/teacher-session.ts" "src/features/teachers/teacher-onboarding-actions.ts"
git add -- "tests/teacher-applications.spec.ts" "tests/unit/assignment-access.test.mjs" "tests/unit/catalog-data.test.mjs" "tests/unit/catalog-mutations.test.mjs" "tests/unit/course-lessons-client.test.mjs" "tests/unit/enrollment-configuration.test.mjs" "tests/unit/group-cutover.test.mjs" "tests/unit/phase-01-7-package.test.mjs" "tests/unit/protected-preview-reconciliation.test.mjs" "tests/unit/remediation-proposal.test.mjs" "tests/unit/teacher-intake-actions.test.mjs" "tests/unit/teacher-intake-security.test.mjs" "tests/unit/teacher-intake-ui.test.mjs" "tests/unit/teacher-session.test.mjs"
git diff --cached --check
git status --short
```

After review, and only with explicit authorization, create the single commit and verify `git status` and `git show --stat`. No merge, push, deployment, or production action follows automatically.

### 9.3 Isolated environment identity and isolation evidence

**Current identity:** none. No approved disposable Supabase project reference, URL, publishable key, secret key, database URL, Auth configuration, or Storage configuration exists in this session. Relevant Supabase variables are unset. The current test guard accepts only `http://127.0.0.1:54321` and rejects remote Supabase endpoints. Docker and `psql` are unavailable, so local Supabase cannot be started. No project was provisioned and no production substitute was used.

#### Exact provisioning requirements

Provision two separate disposable Supabase projects so fresh-install and upgrade evidence cannot contaminate each other:

| Purpose | Required project identity | Required reference |
| --- | --- | --- |
| Fresh installation | `ls-p017-fresh-<approved-unique-suffix>` | `<FRESH_PROJECT_REF>` |
| Baseline upgrade and recovery | `ls-p017-upgrade-<approved-unique-suffix>` | `<UPGRADE_PROJECT_REF>` |

Requirements for both projects:

1. Separate project identity, separate Auth users, separate Storage, separate database, separate API keys, and no production custom domain, credentials, records, backups, cookies, or linked metadata.
2. PostgreSQL 17, with the actual `server_version_num` recorded. The compatibility target is 17.11; a different 17.x version must be reported and explicitly accepted before using its evidence.
3. HTTPS URL exactly `https://<PROJECT_REF>.supabase.co`; no path, query, fragment, embedded credentials, alternate hostname, wildcard, substring match, or unapproved redirect.
4. Synthetic data only. Pre-created accounts may use `@example.test`; signup/confirmation tests require an operator-approved disposable email domain and catch-all SMTP inbox.
5. Test-only publishable and secret API keys. The secret key remains server-only and is restricted to fixture setup, Auth Admin operations, cleanup, and explicitly identified administrative negative tests. It must never appear in browser bundles or stand in for a normal user JWT.
6. A test-only session-mode PostgreSQL connection for the concurrency runner, with SSL required and the exact database/pooler host allowlisted. Transaction pooling is not acceptable for synchronized transactions. This credential must not be committed or exposed to the application.
7. Keep all management and production-style variables unset or blank: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, and `PGPASSWORD`.

#### Required narrow environment-guard extension — approval required before implementation

The current local-only guard cannot accept a hosted disposable project. A separately approved change must add exact URL/project-ref allowlisting without weakening the existing local-only path or production rejection. Required variables:

```text
LIVESCHOOL_ENV=test
NEXT_PUBLIC_LIVESCHOOL_ENV=test
LIVESCHOOL_LIVE_TESTS=1
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<TEST_PUBLISHABLE_KEY>
NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY=<TEST_PUBLISHABLE_KEY>
SUPABASE_SECRET_KEY=<TEST_SECRET_KEY>
LIVESCHOOL_TEST_ALLOWED_SECRET_KEY=<TEST_SECRET_KEY>
LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE=1
LIVESCHOOL_TEST_ALLOWED_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
LIVESCHOOL_TEST_ALLOWED_PROJECT_REF=<PROJECT_REF>
NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PROJECT_REF=<PROJECT_REF>
LIVESCHOOL_TEST_DATABASE_URL=<TEST_ONLY_SESSION_MODE_POSTGRES_URL>
LIVESCHOOL_TEST_ALLOWED_DATABASE_HOST=<EXACT_DB_OR_SESSION_POOLER_HOST>
LIVESCHOOL_WEB_ORIGIN=http://127.0.0.1:3100
SITE_LOCK_ADMIN_CODE=<RANDOM_DISPOSABLE_CODE>
SITE_LOCK_STORE_DIR=<NEW_TEMP_DIRECTORY>
TEACHER_INTAKE_CAPTCHA_SITE_KEY=<TEST_SITE_KEY>
TEACHER_INTAKE_CAPTCHA_SECRET=<TEST_SECRET>
```

The extension must require server/public allowlist agreement, exact key allowlisting, explicit test markers, exact project-ref extraction, and fail-closed rejection of every mismatch. `LIVESCHOOL_TEST_DATABASE_URL` is consumed only by the concurrency runner after exact host/project validation; it is not application configuration. Regression tests must cover production URL rejection, wrong project ref, host suffix tricks, userinfo, ports, paths, queries, fragments, redirects, conflicting markers, unapproved keys, and accidental secret exposure. No guard change has been made.

#### Separate Auth configuration

For each disposable project:

- Enable email/password authentication and email confirmation. Use a dedicated disposable SMTP/catch-all inbox for confirmation tests.
- Disable anonymous sign-ins, phone sign-ins, OAuth providers, and MFA for the baseline matrix; test MFA separately only if it is in release scope.
- Minimum password length: 12 characters. JWT expiry: 3,600 seconds. Refresh-token rotation: enabled.
- Site URL: `http://127.0.0.1:3100`. Redirect allowlist: only the exact approved local test origin and required callback paths; no production redirect.
- Pre-create confirmed synthetic users through Auth Admin for role/workflow tests. Run separate real signup/confirmation tests through the browser. Assign roles/guardian links through the database trigger/RPC fixture path, not by editing JWT claims in the browser.
- Verify activation, email confirmation, profile status, role revocation, user disable/delete, refresh-token rotation, reuse rejection, and session invalidation.

#### Separate Storage configuration

- Create the `chat-attachments` bucket only after the canonical baseline and Phase 01.7 migration complete, because the canonical preflight correctly refuses a pre-existing unapproved bucket.
- Bucket must be private, public access disabled, with a test-only size/MIME policy such as 10 MB and `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.
- Ordinary `anon` and `authenticated` upload, read, list, and delete operations must be denied while attachments remain disabled. Create any synthetic denial-test object only through the test service role, then attempt access with real anonymous/user JWTs.
- No production objects, public bucket, production CDN/custom domain, or production Storage credentials are permitted.

### 9.4 Migration verification results

**Executed mandatory result:** not run in Supabase. No migration was applied to any isolated or production Supabase project.

Historical embedded evidence remains limited but useful: unmodified Phase 01.7 SQL ran through commit in PGlite 0.6.0/PostgreSQL 19.0; the verifier returned 13/13; five synthetic scenario groups passed; forward and pre-write inverse recovery passed; restored-baseline verification returned 19/19; normalized catalog comparison was exact. This does not satisfy PostgreSQL 17.11/Supabase, real Auth/JWT, PostgREST, Storage, or concurrency gates.

Required isolated matrix after approval:

| Stage | Required procedure | Passing evidence |
| --- | --- | --- |
| Fresh project preflight | Record project ref, URL, PostgreSQL version, empty LiveSchool catalog, Auth roles, absent bucket/publication, and baseline fingerprints. | Exact disposable identity; no production or pre-existing LiveSchool objects. |
| Fresh baseline | Run `01_FULL_DATABASE_MIGRATION.sql` once, then `06_PHASE_01_7_MIGRATION.sql` once. | Both transactions commit; 33 baseline tables plus three new tables; canonical history preserved. |
| Fresh verification | Run `07_PHASE_01_7_VERIFICATION.sql`; inspect grants, constraints, indexes, RLS, function ownership/`search_path`, and RPC signatures. | `strictly_read_only: true`; 13 total, 13 OK, zero failed/errors. |
| Upgrade fixture | On the second project, install the canonical baseline and seed valid synthetic legacy data: null-identity self-enrollments, guardian links, pending/active enrollments, groups, paid/reserved requests, review metadata, attendance, teacher intake, and site settings. | Preflight-valid fixture with recorded counts/fingerprints and migration history `20261124010000`. |
| Upgrade preservation | Snapshot synthetic data, apply Phase 01.7, compare before/after Auth, all 33 baseline tables, and migration history. | No loss or fabricated backfill; expected nullable `student_id` and new audit/challenge/rate-limit structures only. |
| Application compatibility | Build and run the matching application against fresh and upgraded projects using real Auth/PostgREST. | Expected RPC signatures and UI workflows operate; old/new application/schema mismatch is not deployed. |
| Failure handling | On a disposable upgrade clone, deliberately create one documented preflight violation, such as a member without active enrollment or an over-capacity group, then run the migration. | Exact expected error; transaction aborts; no partial DDL/data change; fixture is repaired only in the disposable clone. |
| Forward recovery | Create authorized synthetic post-write state and run `08_PHASE_01_7_ROLLBACK.sql` in `post_write_forward` mode. | `forward_reconciliation_required`; `data_removed: false`; verifier 13/13; authoritative data preserved. |
| Inverse recovery | On a separate pre-write disposable clone, run `pre_write_inverse`; also prove a nonzero new-data guard refuses inverse recovery. | `pre_write_inverse_completed` only for zero new data; refusal otherwise; baseline verifier 19/19; restored catalog/fingerprint exact. |

Do not modify the SQL package unless a defect is reproduced in the approved isolated environment and documented. Any SQL correction requires separate approval.

### 9.5 Real JWT/RLS/PostgREST results

**Mandatory result:** blocked/unexecuted. No real Supabase JWT, PostgREST, RLS, RPC-grant, Storage, or activation/revocation result exists.

Required matrix:

| Area | Required assertions |
| --- | --- |
| JWT claims | Real user tokens contain the expected `sub`, `role=authenticated`, `aud`, `iat`, and `exp`; no user token contains service-role claims. Refresh rotation preserves identity and invalidates reused tokens. |
| PostgREST | Expected tables/RPCs are exposed; new signatures resolve; obsolete conflicting overloads do not; errors do not leak privileged data. |
| RLS | Anonymous catalog visibility works; lesson bodies deny anonymous users; student/parent/teacher/admin scopes match policy; permissive policies do not OR into unintended access. |
| RPC grants | Only intended roles can execute each RPC; actor derives from `auth.uid()`; caller-supplied administrator/actor identifiers cannot override authorization. |
| Direct table access | Direct PostgREST select/insert/update/delete attempts obey RLS and grants; privileged challenge creation and Auth Admin operations remain service-role-only. |
| Guardian identity | Linked parent can act only for linked active children; different-child and cross-family attempts fail; legacy null identity is not reassigned. |
| Activation/revocation | Unconfirmed, inactive, disabled, deleted, and revoked users lose protected access without a new privilege path. |
| Storage | Private bucket denies ordinary read/list/upload/delete; service-role fixture access does not prove user authorization. |
| Negative isolation | Cross-user, cross-role, cross-course, cross-group, and cross-family object IDs and RPC arguments return denial without data disclosure. |

### 9.6 Authenticated E2E results

**Mandatory result:** blocked/incomplete. The existing live suite has only three tests and has not run. The full credential-scrubbed Playwright suite is not an authenticated release gate: it discovered 171 tests but was stopped after test 16 with 2 passed and 14 failed at termination. A focused chat/teacher rerun passed 3/8; all five chat failures were login redirects caused by missing authenticated session state. No route was unprotected to make these tests pass.

Required authenticated matrix using synthetic accounts and normal user JWTs:

| Role/workflow | Required coverage |
| --- | --- |
| Guest | Public catalog allowed; lesson body, portals, admin, and protected RPCs denied. |
| Student | Real registration/confirmation/login; active profile; self-enrollment; duplicate request; own courses/lessons; own attendance; unauthorized mutation denial. |
| Parent | Real registration/confirmation/login; guardian relationship; linked-child enrollment/lessons/attendance; different-child and cross-family denial. |
| Teacher | Real intake; assigned course/group access; membership operations; assigned-session attendance mutation; other-course/admin denial. |
| Administrator/owner | Enrollment review, group administration, allowed catalog operations, and denial of caller-supplied actor override. |
| Inactive/revoked | Protected reads and mutations denied after profile deactivation, role revocation, user disable/delete, and session refresh. |
| Session lifecycle | Login, refresh, rotation, reuse rejection, logout, expiry, and revocation behave correctly. |
| Enrollment/review | Student, guardian, legacy-null, duplicate, conflict, review, immutable terminal metadata, and audit-event cases. |
| Groups/capacity | Membership eligibility, reservation, paid hold, expiry, last-seat denial, invalid transition denial, and disabled approval containment. |
| Attendance | Authorized teacher/admin mutation, unauthorized student/parent/other-teacher denial, roster capture, and snapshot integrity. |
| Intake/CAPTCHA | Valid challenge; expired, replayed, wrong-actor, wrong-email, wrong-purpose, and throttled attempts; denied attempts recorded. |
| Disabled containment | Fixture chat stays read-only with no write requests; attachments, notifications, payment providers, meeting providers, group approval, and Realtime remain disabled. |

Service-role credentials may create/clean synthetic fixtures but must not be used as the authorization identity for any ordinary-user assertion.

### 9.7 True concurrency test results

**Mandatory result:** blocked/unexecuted. No independent-connection concurrency harness exists in the repository, and no concurrent transaction was run. Sequential/PGlite checks are not reported as concurrency tests.

Required harness after approval:

- Use a test-only PostgreSQL session-mode pool with at least two independent connections; record backend PIDs, connection IDs, transaction IDs, and lock waits to prove distinct simultaneous sessions.
- Each worker begins a transaction, sets the synthetic user JWT claims and `authenticated` role inside that transaction, signals readiness through a start barrier, executes the RPC/mutation, then commits or rolls back. A privileged setup connection may seed/clean fixtures but must not execute ordinary-user authorization assertions.
- Run repeated synchronized races with unique synthetic fixtures; retain per-attempt outcomes and database invariant queries. A run passes only with zero unexpected successes, duplicates, orphan rows, over-capacity states, or cross-actor effects.

| Scenario | Required invariant |
| --- | --- |
| Simultaneous enrollment reviews | Exactly one valid transition; competing review denied/idempotent; one authoritative audit event; reviewer metadata immutable. |
| Approval versus archival | Operations serialize safely; no active enrollment remains on an archived course; no approval bypasses archive guards. |
| Duplicate enrollment requests | One requester/course identity; retry is idempotent or returns the documented conflict; no duplicate row. |
| Simultaneous reservations | Successful reservations plus paid holds plus members never exceed capacity; existing members are not double-counted. |
| Last-available-seat race | At most the remaining seat count succeeds; all losing transactions fail without partial writes. |
| Duplicate submissions | One authoritative application/challenge consumption; replay cannot create a second record. |
| Transaction rollback | Forced post-write failure leaves no partial review, membership, payment, challenge, or rate-limit state. |
| Lock ordering | Course-first fence is respected; reverse-order attempts time out or fail safely without invariant corruption. |
| Deadlock handling | At most the intended victim aborts; retry succeeds once; no duplicate or orphan state remains. |
| Idempotency | Retry after success or simulated timeout returns a consistent outcome without duplicate authoritative data. |

### 9.8 Recovery and data preservation results

Historical PGlite evidence passed forward recovery, pre-write inverse recovery, restored-baseline verification, and exact normalized-catalog comparison. It did not exercise Supabase backup/restore, real Auth/Storage, independent connections, or PostgreSQL 17.11.

Mandatory isolated evidence still required:

1. Before/after fingerprints for all 33 baseline tables, Auth users, migration history, constraints, indexes, grants, and disabled-feature guards.
2. Fresh and upgrade synthetic-data preservation with no fabricated legacy identity or review provenance.
3. Intentional preflight failure proving transaction abort and zero partial DDL/data change.
4. Post-write forward recovery preserving authoritative data and returning verifier 13/13.
5. Pre-write inverse recovery restoring the baseline fingerprint and verifier 19/19.
6. Nonzero new-data inverse refusal proving authoritative data cannot be deleted by rollback.
7. A restorable disposable backup/restore rehearsal before any production backup is relied upon.

### 9.9 Complete regression results

Fresh final-gate commands executed in the integration worktree:

| Command | Actual result | Exit code |
| --- | --- | ---: |
| `npm test` | 256 passed, 0 failed, 0 skipped | 0 |
| `node --test tests/unit/phase-01-7-package.test.mjs tests/unit/remediation-proposal.test.mjs` | 52 passed, 0 failed | 0 |
| `npm run lint` | Passed | 0 |
| `npm run typecheck` | Passed | 0 |
| `npm audit` | 0 vulnerabilities | 0 |
| `npm audit --omit=dev` | 0 vulnerabilities | 0 |
| `npm ls --all --depth=0` | Passed | 0 |
| `npm ci --dry-run --ignore-scripts` | Up to date; lockfile valid | 0 |
| `npx playwright test --config=playwright.preview.config.ts --reporter=line` | 17 passed in 1.1 minutes | 0 |
| `npx playwright test tests/teacher-applications.spec.ts --reporter=line` | 3 passed in 46.3 seconds | 0 |
| `npm run test:qa:live` | Blocked before execution: no approved disposable local Supabase | 1 |
| `npm run build` | Next.js 16.4.6 production build passed | 0 |
| Full `npm run test:e2e` | 171 discovered; stopped after test 16; 2 passed, 14 failed at termination; not a valid gate | non-passing/aborted |
| Focused chat plus teacher-intake rerun | 3/8 passed; five chat tests failed on `/login`; not a valid authenticated gate | non-passing |
| `git diff --check` | Passed before this report edit; final post-edit result recorded below | 0 |

Mandatory authenticated E2E, real RLS/RPC integration, multi-session concurrency, and isolated Supabase migration/recovery gates remain unexecuted and therefore do not satisfy the release gate. PGlite results are historical embedded evidence only.

Final post-edit integrity result: `git diff --check` passed with exit code 0; the intended payload remained 44 text files with zero high-confidence credential findings; the integration worktree remained unstaged on the same branch/HEAD; the original 517-file fingerprint and all nine protected files remained unchanged.

### 9.10 Remaining blockers

1. No approved disposable Supabase projects, project references, URLs, test keys, SMTP, Storage policy, or database connection.
2. The current local-only environment guard rejects hosted disposable URLs; exact project-ref/URL allowlisting requires a separately approved narrow extension and tests.
3. No PostgreSQL 17.11/Supabase runtime evidence.
4. No real JWT/PostgREST/RLS/RPC/Storage/activation/revocation evidence.
5. No complete authenticated E2E matrix; existing protected browser tests require synthetic Auth/session state.
6. No true multi-connection concurrency harness or results.
7. No isolated fresh/upgrade/failure/forward/inverse/restored-baseline verification.
8. CAPTCHA provider test configuration and disposable email confirmation infrastructure are not provisioned.
9. Existing invalid memberships, over-capacity groups, unpaid paid/approved requests, missing baseline grants/functions, or missing canonical history will safely abort migration; any real occurrence requires investigation, not guard bypass.
10. No local commit, production migration, deployment, merge, push, paid provisioning, disabled-feature activation, or Phase 02 work is authorized.

### 9.11 Intentionally disabled capabilities

- Direct chat writes and chat attachments; fixture chat remains read-only.
- Notifications.
- Payment providers, payment intents/transactions, and external payment activation.
- Group reservation/approval for ordinary callers remains non-executable; synthetic transition tests do not enable it.
- Meeting-provider integration.
- Supabase Realtime publication/features.
- Automatic legacy identity/review backfill; unresolved legacy rows remain visible and unresolved rather than receiving fabricated provenance.
- Teacher intake fails closed when CAPTCHA configuration is missing or invalid.
- Phase 02 and all unrelated architectural/UI/UX work.

### 9.12 Production execution runbook

Historical pre-authorization runbook; controlled production execution status is recorded in section 10. The authoritative ordered runbook is section 7. Its required sequence is:

1. Complete and pass every isolated Supabase, authenticated E2E, true-concurrency, recovery, and final-regression gate.
2. Obtain separate explicit production migration/cutover approval.
3. Freeze the approved commit, SQL hashes, lockfile, and matching application artifact.
4. Verify restorable backup and isolated restore rehearsal; capture production preflight fingerprints without customer-data exposure.
5. Open the maintenance window, stop writers, drain sessions, and enable maintenance/read-only mode.
6. Run `06_PHASE_01_7_MIGRATION.sql` once; any error aborts and keeps writers stopped.
7. Run `07_PHASE_01_7_VERIFICATION.sql`; require 13/13 and compare Auth/baseline/history fingerprints.
8. Deploy the matching application only after schema verification and separate deployment approval.
9. Run non-destructive production smoke tests with approved existing accounts and no synthetic records; monitor errors, locks, Auth, RLS/RPC behavior, and invariants.
10. Reopen traffic only after all conditions pass and the responsible operator records approval.
11. On failure, keep writers stopped and use `post_write_forward`; use `pre_write_inverse` only when all new-data guards are zero and the old application is ready. Backup restore is a separate approved recovery action.

### 9.13 Revised evidence-based readiness score

**75/100**, unchanged. This score reflects the verified local implementation and package integrity, not release approval. Mandatory isolated runtime, authenticated E2E, concurrency, and recovery evidence is missing, so the production migration gate remains closed regardless of the numeric score.

### 9.14 Historical next approval required

This section records the previous authorization boundary and is superseded by the controlled production execution authorization summarized in section 10.

Request one explicit approval covering only the following bounded preparation work:

1. Provision or designate the two named disposable Supabase projects and provide their exact project references, test-only URLs/keys, disposable SMTP, test CAPTCHA configuration, private Storage policy, and test-only session-mode database connection.
2. Authorize the narrow environment-guard extension for exact hosted URL/project-ref/key/database-host allowlisting, with fail-closed regression tests and no production access.
3. Authorize creation of the authenticated E2E matrix and independent-connection concurrency harness using synthetic data only.
4. Authorize isolated execution of the migration/recovery matrix against those disposable projects.
5. Confirm that this approval does **not** authorize a local commit, production access/migration, deployment, merge, push, paid provisioning beyond the named disposable projects, disabled-feature activation, or Phase 02.

Until that approval is granted and the mandatory isolated gates pass, stop at this authorization boundary and do not substitute production.

## 10. Controlled production execution addendum — 2026-11-26

The owner subsequently authorized controlled interaction with the existing production Supabase project and execution of the reviewed Phase 01.7 package under the stated preservation, recovery, and release safeguards. This addendum supersedes the historical no-production-access boundary in section 9.

### 10.1 Production identity and schema evidence

- Project: `liveschool`, ref `ttldhvtrhsaiqxddcdwa`, organization `mfwrxzzdnbtycrgbzuco`, region `eu-west-1`, status `ACTIVE_HEALTHY`.
- PostgreSQL: `17.11.0.003` / server version `170011` on `aarch64-unknown-linux-gnu`.
- Migration history: 16 rows; latest recorded version `20261124010000`, `unified_database_reconciliation`.
- Production already contains the Phase 01.7 schema markers: nullable `course_enrollments.student_id`, `course_enrollment_review_events`, `teacher_intake_challenges`, and `teacher_intake_rate_limits`.
- Production contains the Phase 01.7 actor-free RPC signatures inspected during preflight.
- `07_PHASE_01_7_VERIFICATION.sql` returned `schema_checks_passed`, 13 total checks, 13 passed, zero failed, and zero errors.
- The legacy `02_DATABASE_VERIFICATION.sql` returned 15/19 with three expected failures and one expected error because it asserts pre-Phase-01.7 function signatures and policy names. It is not the authoritative post-migration verifier.
- Production counts: 36 courses, 1 enrollment (legacy unresolved), zero authoritative Phase 01.7 enrollments, zero groups, zero review events, zero intake challenges/rate limits, zero attendance rows/events/snapshots/entries, 10 profiles, and 10 confirmed Auth users.
- Phase 01.7 catalog fingerprints: columns `d4a7f25cb2c893779891cdfee8bfe2cf`, constraints `199a4de4538bfa7969c5f69d2ab56be0`, functions `d27a31f45320d4dd4d2123c497df4133`, policies `b523356f68492024ae891b023a0d5d3d`.

**Migration disposition:** already applied. `06_PHASE_01_7_MIGRATION.sql` was not executed again, consistent with the explicit prohibition on executing it twice. No production schema or data mutation was performed during this execution.

### 10.2 Auth and Storage preflight

- Auth configuration read-only comparison confirmed production site URL `https://liveschool.awexen.com`, account callback redirect, enabled email confirmations, custom Hostinger SMTP, and TOTP MFA enrollment/verification enabled. Secret credential values were not recorded.
- All 10 Auth users are confirmed; none are deleted, SSO, or synthetic `@example.test` accounts.
- Modern publishable and secret API-key types are present. Legacy anon and service-role API-key types also remain present; privileged legacy-key retirement is a separate owner-approved hardening action, not part of this execution.
- Anonymous GoTrue health returned HTTP 200. Anonymous PostgREST returned HTTP 206 for a published course, HTTP 401 for enrollments, HTTP 401 for lessons, and HTTP 401 for `can_read_course_lessons` RPC. No service-role credential was used as an ordinary-user credential.
- Storage contains zero buckets and zero objects. Storage vector capability is disabled. No Storage objects were changed.

### 10.3 Backup and recovery gate

- `supabase backups list` reported no listed physical backups, no physical backup data, and PITR disabled.
- WAL archival is enabled, but it is not a verified restorable recovery point without PITR or a completed restore rehearsal.
- No database password is available for a logical dump, so no new logical backup was created.
- **Gate remains closed for any new production database mutation or deployment that lacks an independently verified recovery guarantee.** No migration rerun, synthetic Auth creation, RLS change, cleanup, or deployment was performed to bypass this condition.

### 10.4 Current release status

The already-applied database state is verified 13/13. The exact 44-path application payload remains subject to the authorized local commit, clean release-branch preparation, build/regression gates, safe runtime verification, and exact-artifact owner approval before deployment. Real-user JWT/RLS/RPC testing remains unverified because no approved synthetic account exists and creating one would require a production Auth mutation without the required recovery guarantee. Phase 02 remains not started.
