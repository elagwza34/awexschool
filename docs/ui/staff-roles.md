# Administration team and staff dashboards

Manager (`manager`) and Technical Support (`support`) appear in the preview role switcher and dashboard chooser.

## Team management

Admin can add temporary members from `/admin/team` or the administration tab at `/admin/users`. The form requires a name, email and staff role. Validation rejects invalid fields and case-insensitive email duplicates across the team and existing mock users. Search and role filters support the team directory. Each member links to the corresponding role preview.

Adding a member creates a frontend fixture for the current session only. It does not create an account, send an invitation, assign real privileges or change the fixed sample identity shown by the role preview.

## Proposed preview responsibilities

These are UI examples, not an approved production permission policy.

| Role | Overview | Requests | Team | Activity |
| --- | --- | --- | --- | --- |
| Manager | Team and request totals | Read-only monitoring | Read-only directory | All local team changes |
| Technical Support | Request totals | All incoming requests, replies and status updates | None | Request changes |

Each role uses horizontal route navigation with `/{role}`, `/{role}/requests` and `/{role}/activity`. Team pages are `/manager/team` and `/admin/team`.

Requests from visitors, students and parents go to Technical Support. Search and status filters show empty states when no results match. Support replies and updates appear in manager monitoring and on the requester's tracking page. Only admin views expose member creation.

## Integration boundary

The shared `StaffPreviewProvider` keeps request statuses, replies and activity in memory during navigation. Reloading resets the preview.

Production integration requires staff permissions, invitation and activation rules, privacy controls, escalation rules, audit retention and server-side authorization.

## Verification

Playwright covers team roles, request submission, support replies, requester tracking and manager monitoring. Staff routes and the add-member dialog have responsive and automated accessibility checks at 375px, 768px and 1440px.
