# Database Audit

Production roles and their explicit permission mappings were inspected read-only. Search uses the existing published-course query and catalog option readers. It requires no schema write. Customer Service has no separate production role code. Its authorization and staff scope need a migration with data preservation, verification and recovery instructions.

## Customer Service migration

`20261127120000_customer_service_scope.sql` adds a role, three nullable routing columns, assignment indexes, scoped activity and authorized RPCs. Existing tickets are left unclassified and unassigned. The owner assigns a category and an active matching staff member. The request is locked for changes. Replies, status transitions and escalation record activity in the same transaction. Escalation is visible only to the named active manager, in addition to the assignee.

Verify the schema on an isolated database. Confirm the existing ticket row count and unchanged source fields, RLS on tickets/replies/activity, no direct authenticated writes, correct owner assignment and assigned staff access, inactive-role denial, transition ordering, and visibility of a saved reply in a separate authorized session. Compare the production baseline first. Production currently grants no authenticated ticket table reads and defines no ticket or reply policies. The migration grants the selected columns needed by the assigned-request interface.

The read-only structural verifier is `supabase/tests/customer_service_contract.sql`. The migration and verifier ran on an isolated synthetic PostgreSQL baseline. Full Supabase/PostgREST acceptance and approval remain required before a production migration.

## Owner administration migration

Apply `20261127120000_customer_service_scope.sql` before `20261127130000_owner_administration.sql`. The latter adds an owner-only ticket queue, an account change RPC and owner-visible, append-only activity. Staff-role changes are limited to single-role staff accounts and the four staff roles. Student, parent, teacher and owner assignments are preserved. Status changes protect owners and compare the expected state after locking the account. Suspension changes the profile status, which current portal and scoped-RPC checks enforce. This operation does not revoke the Auth session itself.

The application assigns tickets through the existing `assign_service_request` RPC from the restored owner view. Managers read only escalations addressed to their account. The three Technical Support routes read assigned technical tickets using the actor's session; the Customer Service routes read assigned nontechnical categories. The isolated database check used two database connections to verify concurrent status changes, expected denial for unauthorized roles, existing ticket preservation, persisted replies and manager visibility. Full Auth/PostgREST acceptance remains pending. No disposable Supabase branch or local stack was available.

On a disposable Supabase environment, run `supabase/tests/customer_service_contract.sql` and `supabase/tests/owner_administration_contract.sql` after the migrations. Verify user journeys with separate Auth sessions before approving production SQL. Preserve the previous deploy and activity records. If deployment needs rollback after writes, restore the previous app first and retain the additive schema and audit history for review. Before any writes, a reviewed reversal can remove the new RPCs, policies and relations in reverse dependency order. Never delete existing tickets or account records as a rollback.

Production inspection found no term, semester, academic term or lesson-count column in the public schema and no matching public metadata RPC. Anonymous users have no direct lesson table read grant. The original public cards keep term and count omitted until an approved summary source exists.

On rollout failure, use the preceding application release and leave persisted tickets and activity intact. A database rollback before any writes can remove the added policies, grants, functions, activity table, columns and role after checking that no accounts or records depend on them. Once service activity exists, archive it and prepare a forward correction or a reviewed restoration package. Never remove live tickets to undo an application deployment.

For each later migration, record its purpose, affected relations and policies, transactional guarantees, compatibility checks and rollback before staging validation.
