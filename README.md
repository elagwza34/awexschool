# LiveSchool

Arabic-first Next.js education platform with public discovery pages, Supabase-backed account portals, and a limited set of intentionally retained previews. Phase 01 stabilizes the existing foundation; it does not approve new product scope, production deployment, or unresolved Phase 0.1 business decisions.

## Current stack and boundaries

- Next.js 16.4.6 App Router with the webpack production build, React 19.3.1, strict TypeScript 6.0.3, Tailwind CSS 4.3.5, ESLint 9, and locally served Cairo fonts.
- Supabase Auth, PostgreSQL, Storage, row-level security, and server actions through `@supabase/ssr` and `@supabase/supabase-js`.
- `src/proxy.ts` implements the supported Next.js proxy convention: session refresh, live-portal authentication, admin/manager role checks, intentional preview restrictions, and independent site locks. The obsolete root middleware hook is absent.
- Public courses, groups, enrollments, teacher profiles, attendance, assignments, and administrative readers use server-side Supabase queries when configured. Query failures are shown as errors, not fictional records or successful empty results.
- `/login` and `/register` are real account flows. Learner registration accepts only `student` or `parent`; database triggers create the profile and corresponding account role. Teacher onboarding remains a separate administrative flow.
- Supported live portal roots are `/student`, `/teacher`, `/parent`, `/admin`, `/manager`, and `/support`, plus the explicit paths in `src/features/auth/dashboard-roles.ts`. Other legacy portal previews, including removed admin report/activity pages, redirect to `/account`; retired owner routes return 404.
- `/dashboards` is a public chooser, not an authentication bypass. Fixture-backed direct chat is read-only in the UI, and its server action denies every invocation until live chat is integrated. Group-chat preview state remains browser-local. Complete live chat integration is deferred.
- NestJS, Prisma, payment processing, subscriptions, exams, video-provider integration, and production deployment are not implemented by this foundation.

## Local setup

Use Node.js 20.9 or newer compatible with the installed Next.js release; this remediation was verified with Node.js 24.19.0. Supabase requires a separately approved local runtime. Docker and local Supabase were unavailable in the Phase 01 verification environment, so database-backed checks were not executed.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Edit `.env.local` and supply only local Supabase values. Never place production credentials, access tokens, database passwords, or hosted project metadata in this worktree.

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-publishable-key>
SUPABASE_SECRET_KEY=<local-secret-key>
LIVESCHOOL_WEB_ORIGIN=http://127.0.0.1:3000
```

Start the approved local Supabase stack and apply its local migrations before using authenticated features. Then run:

```powershell
npm run dev
```

Without Supabase configuration, public catalog/groups pages remain reachable but show an explicit unavailable-data error rather than a successful empty result; course-detail fixture URLs return 404, and account-dependent operations are unavailable. This is not a substitute for a configured live environment.

## Verification

### Isolated preview gate

```powershell
npm run test:qa:preview
```

This command runs lint, typecheck, all Node unit tests, and the selected database-independent Chromium suite. Playwright builds and starts the application on `127.0.0.1:3100` inside its scrubbed server environment, forces explicit test markers and the approved local Supabase URL, and supplies no Supabase credentials. The guarded test build refuses to compile a conflicting public environment marker. Coverage includes authentication redirects, supported route protection, restricted preview routes, site locks, registration controls, unavailable data states, and unit-level attendance/chat/mutation regressions.

### Local live integration gate

Run only against a disposable local Supabase instance at `http://127.0.0.1:54321`. Set local keys in the shell, never in committed files:

```powershell
$env:LIVESCHOOL_ENV = "test"
$env:LIVESCHOOL_LIVE_TESTS = "1"
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "<local-publishable-key>"
$env:NEXT_PUBLIC_LIVESCHOOL_TEST_ALLOWED_PUBLISHABLE_KEY = "<same-local-publishable-key>"
$env:SUPABASE_SECRET_KEY = "<local-secret-key>"
$env:LIVESCHOOL_TEST_ALLOWED_SECRET_KEY = "<same-local-secret-key>"
npm run test:qa:live
```

The live project rebuilds the application because the public Supabase key is compiled into browser bundles. It creates and removes synthetic local accounts to verify student/parent metadata and triggered roles, admin role denial/allow behavior, and read-only fixture chat. Without the explicit opt-in and exactly allowlisted local keys, its tests are skipped and must be reported as **BLOCKED / NOT RUN**, never passed. Remote endpoints and unapproved modern or legacy API keys are rejected before client initialization, including in the live admin harness.

`npm run test:e2e` still selects the historical broad Playwright suite. Some legacy tests assert removed fixture/preview behavior and are not the Phase 01 acceptance gate; use the two scoped QA commands above.

## Production protection

- Test execution requires `LIVESCHOOL_ENV=test` or the explicit public test marker and accepts only the exact approved local Supabase endpoint.
- Management tokens and database credentials are prohibited in test mode. Supabase API keys must exactly match the explicit local-key allowlist, regardless of whether they use modern `sb_*` or legacy JWT formatting.
- A local service-role key additionally requires `LIVESCHOOL_TEST_ALLOW_SERVICE_ROLE=1`; the scoped live config opts in only for its local test server.
- Legitimate non-test environment configuration is preserved. Test guards do not silently rewrite production settings.
- `.env.example` contains no hosted credentials. No production migration, deployment, RLS change, push, merge, or preview-route promotion is part of Phase 01.

## Documentation

- [Current Phase 0.1 requirements review](docs/phase-0.1/README.md) — earlier analysis; not implementation approval.
- [Historical UI architecture](docs/ui/frontend-architecture.md)
- [Historical route inventory](docs/ui/route-inventory.md)
- [Historical UI implementation report](docs/ui/implementation-report.md)
- [Historical dashboard preview scope](docs/ui/dashboard-previews.md)

Older UI documents describe earlier frontend-only deliveries. Their statements about absent Supabase, public mock portals, or demo-only authentication are historical, not current runtime claims. Unresolved editorial publication rules, guardian policy, commercial terms, and later integration phases still require separate approval.
