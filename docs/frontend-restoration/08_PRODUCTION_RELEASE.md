# Production Release

The work branch starts at `6423691`. GitHub `main` matched this revision and Hostinger reported the recorded production build as completed during baseline verification.

Restoration release is pending. Apply the visual, functional, persistence and authorization gates in the isolated environment. Deploy compatible application changes through Hostinger after route and database verification. Retain the previous release artifact, record the new build ID and confirm non-destructive production responses. Any production migration requires explicit approval.

## Owner and Customer Service package

1. Keep the existing `6423691` release artifact available. Verify a recoverable database snapshot and capture existing support request and reply counts before any authorized schema change.
2. Rehearse `20261127120000_customer_service_scope.sql` then `20261127130000_owner_administration.sql` on a disposable Supabase environment that matches the Phase 02 production schema.
3. Run the two read-only contract checks under `supabase/tests`. Confirm existing ticket contents, PostgREST schema discovery, Auth session hydration, owner-only assignment, assignee and manager visibility, inactive-account denial, and concurrent operation behavior using synthetic users.
4. After production SQL approval, apply the versioned migrations in order using the authorized migration mechanism. Verify migration history and the contract checks. Deploy the compatible branch only after the database checks succeed.
5. If application rollback is required, redeploy the preceding artifact and retain additive schema and history. Use the recovery approach in the database audit for schema issues. Existing records and production demonstration data are outside this rollout.
