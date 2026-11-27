# Database Audit

Production roles and their explicit permission mappings were inspected read-only. Search uses the existing published-course query and catalog option readers. It requires no schema write. Customer Service has no separate production role code. Its authorization and staff scope need a migration with data preservation, verification and recovery instructions.

## Customer Service migration

`20261127120000_customer_service_scope.sql` adds a role, three nullable routing columns, assignment indexes, scoped activity and authorized RPCs. Existing tickets are left unclassified and unassigned. The owner assigns a category and an active matching staff member. The request is locked for changes. Replies, status transitions and escalation record activity in the same transaction. Escalation is visible only to the named active manager, in addition to the assignee.

Verify the schema on an isolated database. Confirm the existing ticket row count and unchanged source fields, RLS on tickets/replies/activity, no direct authenticated writes, correct owner assignment and assigned staff access, inactive-role denial, transition ordering, and visibility of a saved reply in a separate authorized session. Compare the production baseline first. Production currently grants no authenticated ticket table reads and defines no ticket or reply policies. The migration grants the selected columns needed by the assigned-request interface.

The read-only structural verifier is `supabase/tests/customer_service_contract.sql`. The migration and verifier ran on an isolated synthetic PostgreSQL baseline. Full Supabase/PostgREST acceptance and approval remain required before a production migration. Staff assignment is an owner-only RPC pending integration into the original owner interface.

On rollout failure, use the preceding application release and leave persisted tickets and activity intact. A database rollback before any writes can remove the added policies, grants, functions, activity table, columns and role after checking that no accounts or records depend on them. Once service activity exists, archive it and prepare a forward correction or a reviewed restoration package. Never remove live tickets to undo an application deployment.

For each later migration, record its purpose, affected relations and policies, transactional guarantees, compatibility checks and rollback before staging validation.
