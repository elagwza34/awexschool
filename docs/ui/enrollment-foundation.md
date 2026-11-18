# Enrollment and user management foundation

This implements the first recommended gap priority: user records, guardian links, teacher/course assignments and student groups. It is a frontend simulation; it does not implement all remaining dashboard backlog items.

## Entry points

- `/admin/users`: edit existing account name, email and status. Status can be active, awaiting review or disabled. Roles remain fixed; staff creation remains in the existing administration team flow.
- `/admin/enrollments`: create/edit/activate groups, assign courses to eligible teachers and link/unlink guardians and students.
- `/teacher/groups`: read assigned active groups and student rosters.
- `/student/courses`: derived courses and group summaries.
- `/parent/courses` and `/parent/courses/[childId]`: derived child list and group/course summaries. Known but unlinked children show an unavailable state; unknown IDs still return 404.

## Shared contracts and behavior

`features/enrollments` owns typed accounts, group memberships, course assignments and guardian links. `EnrollmentPreviewProvider` is the common registry above portal and staff state. It includes the existing six catalog teachers, existing student/parent/admin records and the separate staff-member registry. Case-insensitive email uniqueness is checked across account edits and newly added staff.

Each teacher has one authoritative subject in the portal preview. A course can be assigned only to an active teacher with the same subject. Changing an unassigned teacher's subject updates the registry used by assignment choices; conflicting assigned courses prevent the change. A subject may have multiple teachers. A course assignment applies to all its groups; group-specific teacher overrides are not implemented.

Student course lists derive from active group membership and deduplicate repeated courses. Existing progress fixtures remain available for initial courses; new enrollments start at zero. Group and assignment changes update teacher rosters, portal course cards, student calendar eligibility and student–teacher chat membership. Chat send validation uses the same registry as contact lists. Temporary messages are retained in state but unavailable through unlinked conversations.

Guardian links determine the parent child list and child details. Unlinking does not delete the child or group enrollment. Duplicate links are rejected. Empty group/course/child states render safely, including zero-progress calculations.

Disabling an account preserves its existing links and memberships. It prevents new assignments/links to that account, actual preview message sends and lesson creation by a disabled teacher. Existing portal data remains inspectable with a status notice: this is not authentication or real route protection. Existing disabled students may be removed from a group without losing the ability to save the remaining roster. Disabled teacher groups can be archived.

## Boundaries and unresolved decisions

- State persists only while navigating the portal preview, and resets on reload or leaving portals. Public catalog fixtures are unchanged; public course links are content previews, not a published reflection of temporary portal assignments.
- Account names/emails are administrative records. Editable profile display names remain separate aliases.
- Cross-grade enrollment is not prohibited in the preview: no policy for remediation, prerequisites, capacity or enrollment payments has been approved. Student grades are shown to support deliberate admin selection.
- There are no new backend APIs, real accounts, authentication, database tables, Supabase changes, messages, payments or production mutations.
- The next backlog remains attendance, editable/cancelable lessons, actual assignment/submission workflows, richer parent profiles, operational ticket assignment/replies and event-driven notifications. Production permissions and persistence still need separate approval and implementation.

## Verification

Production build, TypeScript validation and all **88 Playwright tests passed**. Eleven new enrollment tests cover guardian link removal/recreation and empty-parent views, staff email uniqueness against edited users, group/course propagation, deduplicated enrollments, teacher reassignment and chat membership, disabled senders, empty course views, canonical teacher subjects after reassignment, and responsive/accessibility checks at 375px, 768px and 1440px. Existing public, calendar, chat, profile and management checks remain passing. Lint has no errors and one unchanged brand-image warning.

Screenshots: [admin mobile](previews/enrollment-management-375.png), [teacher groups desktop](previews/teacher-groups-1440.png), [student courses mobile](previews/linked-student-courses-375.png).
