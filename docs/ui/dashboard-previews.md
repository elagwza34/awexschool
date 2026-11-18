# Dashboard previews — liveschool

Subsequent teacher/admin enhancements add profile, classes, separate user/content sections and simulated meeting setup. See [management scope and verification](teacher-admin-management.md) for the current routes and interaction boundaries.

The owner subsequently requested the dashboards after reviewing the public frontend. This authorizes the four role previews below; it does not authorize backend integration or production behavior. The existing Supabase architecture is preserved without connections or configuration changes.

## Delivered scope

- `/dashboards`: a public chooser for all four previews, linked from public navigation and the footer.
- `/student`: welcome, example metrics, continue-learning link, course progress, weekly chart, learning goal, schedule and activity.
- `/teacher`: assigned course previews, mock student-work table with status filtering, schedule, activity chart and informational content-creation dialogs.
- `/parent`: local selection between two fictional children, with corresponding course progress, weekly activity, goal and schedule.
- `/admin`: mock user search and detail dialogs, content review tabs/status filtering, learning activity and informational add-user dialog.
- Shared responsive RTL sidebar/header, role switch, mobile navigation, notifications/help dialogs and consistent demo labeling. Reuses existing shadcn/ui primitives, tokens, public routes and catalog selectors; no dependencies added.

Typed data contracts and fixtures live in `src/features/dashboards/types.ts` and `mock-data.ts`. `PortalShell` owns common navigation. `dashboard-panels.tsx` provides metrics, progress indicators, charts, course summaries, schedules, timelines and review/user tables. `interactive-workspaces.tsx` contains local child selection and admin tab state. Pages compose these through `DashboardView`.

## Interaction boundaries

All identities, course enrollment/progress, user counts, review states, dates/times and activity are fictional examples. Role selection navigates between public previews; it grants no permission. Actions do not create users, upload/publish content, mark work, send messages, generate notifications, process payments or save changes. Example schedules do not launch live classes. Charts summarize fixture values and switch locally between two illustrative periods.

No authentication/session, Supabase connection, database modification, API, production resource, real subscription/exam/grading engine or persistent dashboard action is implemented. Do not use these routes as protected account pages.

## Verification

`npm run lint`, `npm run typecheck` and the production build passed. All 19 Playwright checks passed, including the original public-page regression suite and seven dashboard checks. Request coverage now includes all 127 fixture page URLs.

Dashboard checks cover all four roles at 375px, 768px and 1440px, with Arabic/RTL attributes, one main landmark, visible headings, no document overflow and no browser errors. Interaction checks cover role switching, mobile navigation anchors, notifications, child-dependent content, weekly-period selection, user search, content review filters/tabs and informational dialogs. Admin demo actions produced no POST requests, external calls or local/session storage. All four default dashboard views passed automated axe WCAG A/AA/2.1 AA scans; this is not a certification.

The mobile teacher-table overflow found during QA was fixed by explicitly constraining grid tracks. Wide data tables scroll inside their own focusable, labeled regions rather than expanding the document.

Visual captures: [student](previews/dashboard-student.png), [teacher](previews/dashboard-teacher.png), [parent](previews/dashboard-parent.png), [admin](previews/dashboard-admin.png), [mobile student](previews/dashboard-student-mobile.png), [mobile admin](previews/dashboard-admin-mobile.png).

## Remaining work

Human Arabic screen-reader and physical-device review remain outstanding. Educational, guardian, role/access, content-review, reporting, commercial and privacy rules from Phase 0.1 are not resolved by these visuals. Review the previews first; actual authorization, services, content workflows and any additional phase require separate approval.
