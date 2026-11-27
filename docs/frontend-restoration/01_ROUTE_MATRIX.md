# Original Route Traceability Matrix

Baseline `3909ab1` compared with `6423691`. The baseline assessment is a code review. Acceptance requires browser, persistence and role verification for each operational route. Dynamic entries represent page definitions.

| Original route | Intended access | Baseline state | Restoration requirement | Acceptance |
|---|---|---|---|---|
| `/` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/assignments` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/chat` | Administrator or owner, subject to operation scope | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/admin/content` | Administrator or owner, subject to operation scope | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/admin/curricula` | Administrator or owner, subject to operation scope | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/admin/enrollments` | Administrator or owner, subject to operation scope | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/admin/finance` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/group-requests` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/integrations` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/learn/[courseId]` | Administrator or owner, subject to operation scope | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/admin/schedule` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/teacher-applications` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/admin/team` | Administrator or owner, subject to operation scope | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/admin/users` | Administrator or owner, subject to operation scope | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/admin` | Administrator or owner, subject to operation scope | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/contact` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/courses/[courseId]/lessons` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/courses/[courseId]` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/courses` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/customer-service/activity` | Customer Service | Missing | Restore page and scope | Pending |
| `/customer-service/requests` | Customer Service | Missing | Restore page and scope | Pending |
| `/customer-service` | Customer Service | Missing | Restore page and scope | Pending |
| `/dashboards` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/faq` | Public | Complete (informational) | Visual parity check | Pending |
| `/grades/[gradeId]` | Public | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/groups` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/lessons/[lessonId]` | Public | Replaced | Restore original layout and equivalent operation | Pending |
| `/login` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/manager/activity` | Manager | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/manager/requests` | Manager | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/manager/team` | Manager | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/manager` | Manager | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/owner` | Owner | Missing | Restore page and scope | Pending |
| `/parent/admin-chat` | Parent | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/parent/assignments` | Parent | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/parent/attendance` | Parent | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/parent/courses/[childId]` | Parent | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/parent/courses` | Parent | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/parent/help` | Parent | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/parent/learn/[courseId]` | Parent | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/parent/progress` | Parent | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/parent/schedule` | Parent | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/parent` | Parent | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/pricing` | Public | Replaced | Original informational page restored | Browser acceptance pending |
| `/register` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/search` | Public | Replaced | Original route and filters connected to published Supabase data. Card parity and database-backed browser evidence pending. | In progress |
| `/stages/[stageId]` | Public | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/stages` | Public | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/student/admin-chat` | Student | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/student/assignments` | Student | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/student/attendance` | Student | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/student/chat` | Student | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/student/courses` | Student | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/student/help` | Student | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/student/learn/[courseId]` | Student | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/student/library` | Student | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/student/profile` | Student | Replaced | Restore original layout and equivalent operation | Pending |
| `/student/progress` | Student | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/student/schedule` | Student | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/student` | Student | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/subjects/[subjectId]` | Public | Replaced | Restore original layout and equivalent operation | Pending |
| `/subjects` | Public | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/support/activity` | Support | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/support/requests` | Support | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/support` | Support | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/admin-chat` | Teacher | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/teacher/assignments` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/attendance` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/chat` | Teacher | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/teacher/content` | Teacher | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/teacher/courses` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/finance` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/groups` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/learn/[courseId]` | Teacher | Blocked by routing | Restore only after role and data guards are proven | Pending |
| `/teacher/profile` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/progress` | Teacher | Mock data | Replace operational fixtures with scoped backend state | Pending |
| `/teacher/reviews` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/schedule` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher/sessions` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teacher` | Teacher | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teachers/[teacherId]` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teachers/apply` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/teachers` | Public | Partially integrated | Verify remaining original controls and persistence | Pending |
| `/workspace/[role]/[area]` | Role matched to route, access contract pending verification | Mock data | Replace operational fixtures with scoped backend state | Pending |
