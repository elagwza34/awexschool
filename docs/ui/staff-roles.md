# Administration team and staff dashboards

Three frontend roles were added: Manager (`manager`), Technical Support (`support`) and Customer Service (`customer-service`). They appear in the preview role switcher and dashboard chooser. Existing student, parent, teacher and admin views remain available.

## Team management

Admin can add temporary members from `/admin/team` or the administration tab at `/admin/users`. The form requires a name, email and one of the three staff roles. Validation rejects invalid fields and case-insensitive email duplicates across the team and existing mock users. Search and role filters support the team directory. Each member links to the corresponding role preview.

Adding a member creates a frontend fixture for the current session only. It does not create an account, send an invitation, assign real privileges or change the fixed sample identity shown by the role preview.

## Proposed preview responsibilities

These are UI examples, not an approved production permission policy.

| Role | Overview | Requests | Team | Activity |
| --- | --- | --- | --- | --- |
| Manager | Team and request totals | Read-only monitoring of both queues | Read-only directory | All local team changes |
| Technical Support | Technical request totals | Technical queue; local status changes | None | Technical queue changes |
| Customer Service | Customer request totals | Customer queue; local status changes | None | Customer queue changes |

Each role uses horizontal route navigation. Routes are `/{role}`, `/{role}/requests`, `/{role}/activity`, plus `/manager/team`. Together with `/admin/team`, this adds 11 pages.

Requests use typed fixtures and statuses (new, in progress, resolved). Search and status filters show empty states when no results match. Changes persist during portal navigation and are reflected in manager monitoring. Support/service updates are limited to their own queue by the preview handler. Only admin views expose member creation. The role switcher is a demonstration tool, not authorization.

## Integration boundary

The shared `StaffPreviewProvider` stores team members, request statuses and activity in memory. Reloading or leaving the portals resets changes. No database, Supabase, backend, payment, authentication or production resources were changed. No messages or invitations are delivered.

Before real integration, business decisions still needed include staff permission granularity, invitation/activation policy, request assignment, visibility of personal data, escalation rules, customer replies, audit retention and server-side authorization.

## Verification

Lint, TypeScript validation, production build and all 70 Playwright tests passed. New checks cover adding all three roles, duplicate email rejection, team search/filtering, shared state and reload reset, queue status updates, manager monitoring and responsive navigation. Routes were checked at 375px, 768px and 1440px; automated accessibility checks cover staff activity views and the add-member dialog. No external delivery requests occurred in the member-creation test.

Screenshots: [team mobile](previews/administration-team-375.png), [manager desktop](previews/manager-dashboard-1440.png), [support mobile](previews/support-queue-375.png), [customer service mobile](previews/customer-service-queue-375.png).
