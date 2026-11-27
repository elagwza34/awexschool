# Original Frontend Reference Inventory

Reference commit `3909ab1`. Integration starts at `6cd0338`. Comparison baseline is `6423691`. Roles in this inventory are intended authorities inferred from the original portal and production scope. The original browser previews supplied the layout and interaction reference. Dynamic routes require valid IDs and server-side scope.

## Page definitions

### `/admin/assignments`

- Source `src/app/(portals)/admin/assignments/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Assigned teacher and entitled learner only.
- Components. AssignmentsWorkspace.
- Tabs, sections and controls at page entry. AssignmentsWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read assignments and submissions, create, submit or review as role permits. courses, course_assignments, course_assignment_submissions, guardian_links.
- Acceptance. Assigned teacher and entitled learner only, verify create?submit?review. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/chat`

- Source `src/app/(portals)/admin/chat/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Only active participants read/write.
- Components. ChatWorkspace.
- Tabs, sections and controls at page entry. ChatWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read threads and send messages, manage membership and unread state. chat_threads, chat_participants, chat_messages, private attachment storage.
- Acceptance. Only active participants read/write, verify persistence across two sessions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/content`

- Source `src/app/(portals)/admin/content/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Published plus entitled for learners, assigned editor only.
- Components. ContentWorkspace.
- Tabs, sections and controls at page entry. ContentWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/curricula`

- Source `src/app/(portals)/admin/curricula/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Published plus entitled for learners, assigned editor only.
- Components. ContentWorkspace.
- Tabs, sections and controls at page entry. ContentWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/enrollments`

- Source `src/app/(portals)/admin/enrollments/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Public published reads and role-scoped writes.
- Components. ManagementHeader, AdminEnrollments.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/finance`

- Source `src/app/(portals)/admin/finance/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Public demo pricing or authorized finance scope.
- Components. TeacherFinance.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read pricing or scoped earnings and persist permitted status changes. pricing data, teacher_earnings, class_sessions.
- Acceptance. Public demo pricing or authorized finance scope, verify used amounts and transitions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/group-requests`

- Source `src/app/(portals)/admin/group-requests/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Verify navigation, RTL and responsive rendering.
- Components. GroupRequestsWorkspace.
- Tabs, sections and controls at page entry. GroupRequestsWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Display original screen and link to intended destinations. No new entity identified.
- Acceptance. Verify navigation, RTL and responsive rendering. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/integrations`

- Source `src/app/(portals)/admin/integrations/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Authorized actor only.
- Components. ManagementHeader, IntegrationSettings.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read calendar, schedule or update sessions, store demo meeting preferences. class_sessions, learning_groups, meeting preferences.
- Acceptance. Authorized actor only, verify overlap, cancellation and persisted demo meeting. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/learn/[courseId]`

- Source `src/app/(portals)/admin/learn/[courseId]/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Published plus entitled for learners, assigned editor only.
- Components. PortalCourseReader.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin`

- Source `src/app/(portals)/admin/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Role and learner scope.
- Components. DashboardView.
- Tabs, sections and controls at page entry. DashboardView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/schedule`

- Source `src/app/(portals)/admin/schedule/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Authorized actor only.
- Components. AdminSectionView.
- Tabs, sections and controls at page entry. AdminSectionView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read calendar, schedule or update sessions, store demo meeting preferences. class_sessions, learning_groups, meeting preferences.
- Acceptance. Authorized actor only, verify overlap, cancellation and persisted demo meeting. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/teacher-applications`

- Source `src/app/(portals)/admin/teacher-applications/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Verified applicant or authorized reviewer.
- Components. TeacherApplicationsWorkspace.
- Tabs, sections and controls at page entry. TeacherApplicationsWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Submit and administratively review an application. teacher_applications, teacher_intake_challenges, profiles.
- Acceptance. Verified applicant or authorized reviewer, verify persisted submission and decision. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/team`

- Source `src/app/(portals)/admin/team/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Self or authorized administrator.
- Components. ManagementHeader, TeamManagement.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/admin/users`

- Source `src/app/(portals)/admin/users/page.tsx`.
- Roles and permissions. Administrator or owner, subject to operation scope. Self or authorized administrator.
- Components. ManagementHeader, AdminUsersWorkspace.
- Tabs, sections and controls at page entry. AdminUsersWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/customer-service/activity`

- Source `src/app/(portals)/customer-service/activity/page.tsx`.
- Roles and permissions. Customer Service. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Missing. Restore page and scope.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/customer-service`

- Source `src/app/(portals)/customer-service/page.tsx`.
- Roles and permissions. Customer Service. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Missing. Restore page and scope.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/customer-service/requests`

- Source `src/app/(portals)/customer-service/requests/page.tsx`.
- Roles and permissions. Customer Service. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Missing. Restore page and scope.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/manager/activity`

- Source `src/app/(portals)/manager/activity/page.tsx`.
- Roles and permissions. Manager. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/manager`

- Source `src/app/(portals)/manager/page.tsx`.
- Roles and permissions. Manager. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/manager/requests`

- Source `src/app/(portals)/manager/requests/page.tsx`.
- Roles and permissions. Manager. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/manager/team`

- Source `src/app/(portals)/manager/team/page.tsx`.
- Roles and permissions. Manager. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/owner`

- Source `src/app/(portals)/owner/page.tsx`.
- Roles and permissions. Owner. Self or authorized administrator.
- Components. OwnerPermissions.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Missing. Restore page and scope.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/admin-chat`

- Source `src/app/(portals)/parent/admin-chat/page.tsx`.
- Roles and permissions. Parent. Only active participants read/write.
- Components. ChatWorkspace.
- Tabs, sections and controls at page entry. ChatWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read threads and send messages, manage membership and unread state. chat_threads, chat_participants, chat_messages, private attachment storage.
- Acceptance. Only active participants read/write, verify persistence across two sessions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/assignments`

- Source `src/app/(portals)/parent/assignments/page.tsx`.
- Roles and permissions. Parent. Assigned teacher and entitled learner only.
- Components. AssignmentsWorkspace.
- Tabs, sections and controls at page entry. AssignmentsWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read assignments and submissions, create, submit or review as role permits. courses, course_assignments, course_assignment_submissions, guardian_links.
- Acceptance. Assigned teacher and entitled learner only, verify create?submit?review. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/attendance`

- Source `src/app/(portals)/parent/attendance/page.tsx`.
- Roles and permissions. Parent. Assigned teacher writes, linked learners read.
- Components. ParentAttendance.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. List scoped sessions or attendance and record or correct attendance. class_sessions, session_roster_entries, session_attendance.
- Acceptance. Assigned teacher writes, linked learners read, verify correction after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/courses/[childId]`

- Source `src/app/(portals)/parent/courses/[childId]/page.tsx`.
- Roles and permissions. Parent. Public published reads and role-scoped writes.
- Components. DashboardView.
- Tabs, sections and controls at page entry. DashboardView.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/courses`

- Source `src/app/(portals)/parent/courses/page.tsx`.
- Roles and permissions. Parent. Public published reads and role-scoped writes.
- Components. DashboardView.
- Tabs, sections and controls at page entry. DashboardView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/help`

- Source `src/app/(portals)/parent/help/page.tsx`.
- Roles and permissions. Parent. Requester or assigned staff.
- Components. RequestForm.
- Tabs, sections and controls at page entry. RequestForm.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/learn/[courseId]`

- Source `src/app/(portals)/parent/learn/[courseId]/page.tsx`.
- Roles and permissions. Parent. Published plus entitled for learners, assigned editor only.
- Components. PortalCourseReader.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent`

- Source `src/app/(portals)/parent/page.tsx`.
- Roles and permissions. Parent. Role and learner scope.
- Components. DashboardView.
- Tabs, sections and controls at page entry. DashboardView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/progress`

- Source `src/app/(portals)/parent/progress/page.tsx`.
- Roles and permissions. Parent. Role and learner scope.
- Components. DashboardView.
- Tabs, sections and controls at page entry. DashboardView.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/parent/schedule`

- Source `src/app/(portals)/parent/schedule/page.tsx`.
- Roles and permissions. Parent. Authorized actor only.
- Components. DashboardView.
- Tabs, sections and controls at page entry. DashboardView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read calendar, schedule or update sessions, store demo meeting preferences. class_sessions, learning_groups, meeting preferences.
- Acceptance. Authorized actor only, verify overlap, cancellation and persisted demo meeting. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/admin-chat`

- Source `src/app/(portals)/student/admin-chat/page.tsx`.
- Roles and permissions. Student. Only active participants read/write.
- Components. ChatWorkspace.
- Tabs, sections and controls at page entry. ChatWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read threads and send messages, manage membership and unread state. chat_threads, chat_participants, chat_messages, private attachment storage.
- Acceptance. Only active participants read/write, verify persistence across two sessions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/assignments`

- Source `src/app/(portals)/student/assignments/page.tsx`.
- Roles and permissions. Student. Assigned teacher and entitled learner only.
- Components. AssignmentsWorkspace.
- Tabs, sections and controls at page entry. AssignmentsWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read assignments and submissions, create, submit or review as role permits. courses, course_assignments, course_assignment_submissions, guardian_links.
- Acceptance. Assigned teacher and entitled learner only, verify create?submit?review. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/attendance`

- Source `src/app/(portals)/student/attendance/page.tsx`.
- Roles and permissions. Student. Assigned teacher writes, linked learners read.
- Components. StudentHeading, SessionRecords.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. List scoped sessions or attendance and record or correct attendance. class_sessions, session_roster_entries, session_attendance.
- Acceptance. Assigned teacher writes, linked learners read, verify correction after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/chat`

- Source `src/app/(portals)/student/chat/page.tsx`.
- Roles and permissions. Student. Only active participants read/write.
- Components. StudentHeading, ChatWorkspace.
- Tabs, sections and controls at page entry. ChatWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read threads and send messages, manage membership and unread state. chat_threads, chat_participants, chat_messages, private attachment storage.
- Acceptance. Only active participants read/write, verify persistence across two sessions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/courses`

- Source `src/app/(portals)/student/courses/page.tsx`.
- Roles and permissions. Student. Public published reads and role-scoped writes.
- Components. StudentView.
- Tabs, sections and controls at page entry. StudentView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/help`

- Source `src/app/(portals)/student/help/page.tsx`.
- Roles and permissions. Student. Requester or assigned staff.
- Components. RequestForm.
- Tabs, sections and controls at page entry. RequestForm.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/learn/[courseId]`

- Source `src/app/(portals)/student/learn/[courseId]/page.tsx`.
- Roles and permissions. Student. Published plus entitled for learners, assigned editor only.
- Components. PortalCourseReader.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/library`

- Source `src/app/(portals)/student/library/page.tsx`.
- Roles and permissions. Student. Published plus entitled for learners, assigned editor only.
- Components. StudentContentLibrary.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student`

- Source `src/app/(portals)/student/page.tsx`.
- Roles and permissions. Student. Role and learner scope.
- Components. StudentView.
- Tabs, sections and controls at page entry. StudentView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/profile`

- Source `src/app/(portals)/student/profile/page.tsx`.
- Roles and permissions. Student. Self or authorized administrator.
- Components. StudentHeading, StudentProfileEditor.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Replaced. Restore original layout and equivalent operation.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/progress`

- Source `src/app/(portals)/student/progress/page.tsx`.
- Roles and permissions. Student. Role and learner scope.
- Components. StudentView.
- Tabs, sections and controls at page entry. StudentView.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/student/schedule`

- Source `src/app/(portals)/student/schedule/page.tsx`.
- Roles and permissions. Student. Authorized actor only.
- Components. StudentView.
- Tabs, sections and controls at page entry. StudentView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read calendar, schedule or update sessions, store demo meeting preferences. class_sessions, learning_groups, meeting preferences.
- Acceptance. Authorized actor only, verify overlap, cancellation and persisted demo meeting. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/support/activity`

- Source `src/app/(portals)/support/activity/page.tsx`.
- Roles and permissions. Support. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/support`

- Source `src/app/(portals)/support/page.tsx`.
- Roles and permissions. Support. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/support/requests`

- Source `src/app/(portals)/support/requests/page.tsx`.
- Roles and permissions. Support. Requester or assigned staff.
- Components. StaffWorkspace.
- Tabs, sections and controls at page entry. StaffWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/admin-chat`

- Source `src/app/(portals)/teacher/admin-chat/page.tsx`.
- Roles and permissions. Teacher. Only active participants read/write.
- Components. ChatWorkspace.
- Tabs, sections and controls at page entry. ChatWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read threads and send messages, manage membership and unread state. chat_threads, chat_participants, chat_messages, private attachment storage.
- Acceptance. Only active participants read/write, verify persistence across two sessions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/assignments`

- Source `src/app/(portals)/teacher/assignments/page.tsx`.
- Roles and permissions. Teacher. Assigned teacher and entitled learner only.
- Components. AssignmentsWorkspace.
- Tabs, sections and controls at page entry. AssignmentsWorkspace.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read assignments and submissions, create, submit or review as role permits. courses, course_assignments, course_assignment_submissions, guardian_links.
- Acceptance. Assigned teacher and entitled learner only, verify create?submit?review. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/attendance`

- Source `src/app/(portals)/teacher/attendance/page.tsx`.
- Roles and permissions. Teacher. Assigned teacher writes, linked learners read.
- Components. ManagementHeader, SessionRecords.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. List scoped sessions or attendance and record or correct attendance. class_sessions, session_roster_entries, session_attendance.
- Acceptance. Assigned teacher writes, linked learners read, verify correction after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/chat`

- Source `src/app/(portals)/teacher/chat/page.tsx`.
- Roles and permissions. Teacher. Only active participants read/write.
- Components. ManagementHeader, ChatWorkspace.
- Tabs, sections and controls at page entry. ChatWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read threads and send messages, manage membership and unread state. chat_threads, chat_participants, chat_messages, private attachment storage.
- Acceptance. Only active participants read/write, verify persistence across two sessions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/content`

- Source `src/app/(portals)/teacher/content/page.tsx`.
- Roles and permissions. Teacher. Published plus entitled for learners, assigned editor only.
- Components. ContentWorkspace.
- Tabs, sections and controls at page entry. ContentWorkspace.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/courses`

- Source `src/app/(portals)/teacher/courses/page.tsx`.
- Roles and permissions. Teacher. Public published reads and role-scoped writes.
- Components. TeacherView.
- Tabs, sections and controls at page entry. TeacherView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/finance`

- Source `src/app/(portals)/teacher/finance/page.tsx`.
- Roles and permissions. Teacher. Public demo pricing or authorized finance scope.
- Components. TeacherFinance.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read pricing or scoped earnings and persist permitted status changes. pricing data, teacher_earnings, class_sessions.
- Acceptance. Public demo pricing or authorized finance scope, verify used amounts and transitions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/groups`

- Source `src/app/(portals)/teacher/groups/page.tsx`.
- Roles and permissions. Teacher. Public published reads and role-scoped writes.
- Components. ManagementHeader, TeacherGroups.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/learn/[courseId]`

- Source `src/app/(portals)/teacher/learn/[courseId]/page.tsx`.
- Roles and permissions. Teacher. Published plus entitled for learners, assigned editor only.
- Components. PortalCourseReader.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Blocked by routing. Restore only after role and data guards are proven.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher`

- Source `src/app/(portals)/teacher/page.tsx`.
- Roles and permissions. Teacher. Role and learner scope.
- Components. TeacherView.
- Tabs, sections and controls at page entry. TeacherView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/profile`

- Source `src/app/(portals)/teacher/profile/page.tsx`.
- Roles and permissions. Teacher. Self or authorized administrator.
- Components. ManagementHeader, TeacherProfileEditor.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/progress`

- Source `src/app/(portals)/teacher/progress/page.tsx`.
- Roles and permissions. Teacher. Role and learner scope.
- Components. TeacherView.
- Tabs, sections and controls at page entry. TeacherView.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read scoped dashboard metrics and persisted academic progress. enrollments, attendance, submissions, lesson progress, guardian_links.
- Acceptance. Role and learner scope, verify changed data appears in dashboard. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/reviews`

- Source `src/app/(portals)/teacher/reviews/page.tsx`.
- Roles and permissions. Teacher. Assigned teacher and entitled learner only.
- Components. TeacherView.
- Tabs, sections and controls at page entry. TeacherView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read assignments and submissions, create, submit or review as role permits. courses, course_assignments, course_assignment_submissions, guardian_links.
- Acceptance. Assigned teacher and entitled learner only, verify create?submit?review. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/schedule`

- Source `src/app/(portals)/teacher/schedule/page.tsx`.
- Roles and permissions. Teacher. Authorized actor only.
- Components. TeacherView.
- Tabs, sections and controls at page entry. TeacherView.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read calendar, schedule or update sessions, store demo meeting preferences. class_sessions, learning_groups, meeting preferences.
- Acceptance. Authorized actor only, verify overlap, cancellation and persisted demo meeting. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teacher/sessions`

- Source `src/app/(portals)/teacher/sessions/page.tsx`.
- Roles and permissions. Teacher. Authorized actor only.
- Components. ManagementHeader, TeacherSessions.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read calendar, schedule or update sessions, store demo meeting preferences. class_sessions, learning_groups, meeting preferences.
- Acceptance. Authorized actor only, verify overlap, cancellation and persisted demo meeting. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/workspace/[role]/[area]`

- Source `src/app/(portals)/workspace/[role]/[area]/page.tsx`.
- Roles and permissions. Role matched to route, access contract pending verification. Verify navigation, RTL and responsive rendering.
- Components. PortalBoundary, GroupRequestsWorkspace, GroupChatWorkspace, AdminUsersWorkspace, ContentWorkspace.
- Tabs, sections and controls at page entry. GroupRequestsWorkspace, GroupChatWorkspace, AdminUsersWorkspace, ContentWorkspace.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Display original screen and link to intended destinations. No new entity identified.
- Acceptance. Verify navigation, RTL and responsive rendering. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/contact`

- Source `src/app/(public)/contact/page.tsx`.
- Roles and permissions. Public. Requester or assigned staff.
- Components. RequestForm.
- Tabs, sections and controls at page entry. RequestForm.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read, submit, assign or resolve role-scoped requests where offered. profiles, account_roles, support tickets and activity.
- Acceptance. Requester or assigned staff, verify visibility and status after reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/courses/[courseId]/lessons`

- Source `src/app/(public)/courses/[courseId]/lessons/page.tsx`.
- Roles and permissions. Public. Published plus entitled for learners, assigned editor only.
- Components. Breadcrumbs, PageIntro, UnitList.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/courses/[courseId]`

- Source `src/app/(public)/courses/[courseId]/page.tsx`.
- Roles and permissions. Public. Public published reads and role-scoped writes.
- Components. Breadcrumbs, Badge, Link, ArrowLeft, CourseContent, Button, Play, CourseEnrollPreview, BookOpen, Check, DemoNotice.
- Tabs, sections and controls at page entry. Link, Button.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/courses`

- Source `src/app/(public)/courses/page.tsx`.
- Roles and permissions. Public. Public published reads and role-scoped writes.
- Components. CatalogSearchParams, Breadcrumbs, PageIntro, CatalogBrowser.
- Tabs, sections and controls at page entry. CatalogBrowser.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/dashboards`

- Source `src/app/(public)/dashboards/page.tsx`.
- Roles and permissions. Public. Verify navigation, RTL and responsive rendering.
- Components. Breadcrumbs, PageIntro, DemoNotice, Link, ShieldCheck, Icon, ArrowLeft.
- Tabs, sections and controls at page entry. Link.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Display original screen and link to intended destinations. No new entity identified.
- Acceptance. Verify navigation, RTL and responsive rendering. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/faq`

- Source `src/app/(public)/faq/page.tsx`.
- Roles and permissions. Public. Verify navigation, RTL and responsive rendering.
- Components. Breadcrumbs, PageIntro.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Complete (informational). Visual parity check.
- Backend flow and entity candidates. Display original screen and link to intended destinations. No new entity identified.
- Acceptance. Verify navigation, RTL and responsive rendering. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/grades/[gradeId]`

- Source `src/app/(public)/grades/[gradeId]/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. Breadcrumbs, PageIntro, Tabs, TabsList, TabsTrigger, TabsContent, SubjectCard, SectionHeading, CourseCard, EmptyState.
- Tabs, sections and controls at page entry. Tabs, TabsList, TabsTrigger, TabsContent.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/groups`

- Source `src/app/(public)/groups/page.tsx`.
- Roles and permissions. Public. Public published reads and role-scoped writes.
- Components. PublicGroups.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read catalog, groups or enrollments and submit or resolve scoped requests. courses, course_enrollments, learning_groups, group_join_requests, guardian_links.
- Acceptance. Public published reads and role-scoped writes, verify filters and request persistence. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/lessons/[lessonId]`

- Source `src/app/(public)/lessons/[lessonId]/page.tsx`.
- Roles and permissions. Public. Published plus entitled for learners, assigned editor only.
- Components. Breadcrumbs, Badge, Clock3, LessonPreview, LockKeyhole, DemoDialog, Button, Link, Check, DemoNotice.
- Tabs, sections and controls at page entry. DemoDialog, Button, Link.
- Baseline assessment. Replaced. Restore original layout and equivalent operation.
- Backend flow and entity candidates. Read entitled lessons or edit, review and publish content as permitted. courses, units, lessons, published resources, enrollment entitlements.
- Acceptance. Published plus entitled for learners, assigned editor only, verify publication and reload. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/login`

- Source `src/app/(public)/login/page.tsx`.
- Roles and permissions. Public. Self or authorized administrator.
- Components. AuthScreen.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/`

- Source `src/app/(public)/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. ReferenceHome, Image, Button, Link, ArrowLeft, Play, Check, ArrowDown, GradeFinder, SectionHeading, StageCard, SubjectCard, CourseCard, Icon, TeachersCarousel, Star, Trophy.
- Tabs, sections and controls at page entry. Button, Link, GradeFinder.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/pricing`

- Source `src/app/(public)/pricing/page.tsx`.
- Roles and permissions. Public. Public demo pricing or authorized finance scope.
- Components. Breadcrumbs, PageIntro, DemoNotice, DemoDialog.
- Tabs, sections and controls at page entry. DemoDialog.
- Baseline assessment. Replaced. Restore original layout and equivalent operation.
- Backend flow and entity candidates. Read pricing or scoped earnings and persist permitted status changes. pricing data, teacher_earnings, class_sessions.
- Acceptance. Public demo pricing or authorized finance scope, verify used amounts and transitions. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/register`

- Source `src/app/(public)/register/page.tsx`.
- Roles and permissions. Public. Self or authorized administrator.
- Components. AuthScreen.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read profile and roles, authenticate or edit user settings as permitted. auth.users, profiles, account_roles, roles, guardian_links.
- Acceptance. Self or authorized administrator, verify session and role denial. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/search`

- Source `src/app/(public)/search/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. CatalogSearchParams, Breadcrumbs, PageIntro, CatalogBrowser.
- Tabs, sections and controls at page entry. CatalogBrowser.
- Baseline assessment. Replaced. Restore original layout and equivalent operation.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/stages/[stageId]`

- Source `src/app/(public)/stages/[stageId]/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. Breadcrumbs, PageIntro, Link, GraduationCap, ArrowLeft.
- Tabs, sections and controls at page entry. Link.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/stages`

- Source `src/app/(public)/stages/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. Breadcrumbs, PageIntro, StageCard.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/subjects/[subjectId]`

- Source `src/app/(public)/subjects/[subjectId]/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. CatalogSearchParams, Breadcrumbs, PageIntro, SectionHeading, TeacherCard, CatalogBrowser.
- Tabs, sections and controls at page entry. CatalogBrowser.
- Baseline assessment. Replaced. Restore original layout and equivalent operation.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/subjects`

- Source `src/app/(public)/subjects/page.tsx`.
- Roles and permissions. Public. Public published reads only.
- Components. Breadcrumbs, PageIntro, SubjectCard.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Mock data. Replace operational fixtures with scoped backend state.
- Backend flow and entity candidates. Read published catalog discovery data and apply shareable filters. stages, grades, subjects, courses, teacher_profiles.
- Acceptance. Public published reads only, verify filtering and no-match state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teachers/[teacherId]`

- Source `src/app/(public)/teachers/[teacherId]/page.tsx`.
- Roles and permissions. Public. Public published scope and available profiles.
- Components. Breadcrumbs, Badge, GraduationCap, BookOpen, SectionHeading, CourseCard, EmptyState, DemoNotice.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read accessible teacher profiles and published course offerings. teacher_profiles, courses, teacher assignments.
- Acceptance. Public published scope and available profiles, verify detail and empty state. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teachers/apply`

- Source `src/app/(public)/teachers/apply/page.tsx`.
- Roles and permissions. Public. Verified applicant or authorized reviewer.
- Components. TeacherApplicationForm.
- Tabs, sections and controls at page entry. TeacherApplicationForm.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Submit and administratively review an application. teacher_applications, teacher_intake_challenges, profiles.
- Acceptance. Verified applicant or authorized reviewer, verify persisted submission and decision. Compare layout, section order and RTL at desktop, tablet and mobile widths.

### `/teachers`

- Source `src/app/(public)/teachers/page.tsx`.
- Roles and permissions. Public. Public published scope and available profiles.
- Components. Breadcrumbs, PageIntro, TeacherCard, DemoNotice.
- Tabs, sections and controls at page entry. See original component and role layout.
- Baseline assessment. Partially integrated. Verify remaining original controls and persistence.
- Backend flow and entity candidates. Read accessible teacher profiles and published course offerings. teacher_profiles, courses, teacher assignments.
- Acceptance. Public published scope and available profiles, verify detail and empty state. Compare layout, section order and RTL at desktop, tablet and mobile widths.
