# Role Permission Matrix

A read-only production query verified seven rows in `public.roles`. Every role returned zero explicit `public.role_permissions` mappings. Access evidence must therefore come from the server guards and specific database policies and functions, rather than from a permission matrix inferred from the old previews.

Production catalog searches found zero policies or application functions referencing `role_permissions`. Repository search found schema creation and grants, with no application consumer. The active authorization model combines account roles with resource relationships. The proxy verifies identity and coarse portal access. `getAccount` verifies the current Auth user, confirmed email, active profile and role rows. RLS and RPCs use `has_active_role` and check ownership, enrollment, teacher assignment, guardian links or conversation membership as appropriate. Coarse admin/manager proxy admission is broader than the page-level guards. It is neither the database authority nor a reason to populate permission mappings.

| Original role | Production code | Required boundary for restoration |
|---|---|---|
| Owner | `owner` | Verify owner-only settings and account administration |
| Administrator | `admin` | Verify each administrative operation and owner exclusions |
| Teacher | `teacher` | Scope to assigned courses and groups |
| Student | `student` | Scope academic records to self and entitlements |
| Parent | `parent` | Scope each journey to active linked children |
| Manager | `manager` | Establish team, assignment and ticket scope |
| Technical Support | `support` | Establish technical ticket scope |
| Customer Service | `customer_service` in the proposed migration only | Assigned nontechnical requests, replies, permitted status changes and escalation to a selected active manager. The server guards and database policies require current active role and ticket scope. |

The Customer Service migration adds narrowly scoped self-profile and self-role policies. The Phase 02 baseline allowlist omits the new role, so without those additions a Customer Service account cannot hydrate a valid session in `getAccount`. Technical Support handles assigned technical requests, and managers receive access to individual escalations. No chat, finance, academic, role administration or owner privileges are added.
