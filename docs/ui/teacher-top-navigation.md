# Teacher horizontal navigation

The teacher dashboard now uses top horizontal navigation, matching the student layout. Its sidebar and mobile sidebar toggle are removed. Admin/parent sidebars and student navigation are unchanged.

| Section | URL |
|---|---|
| نظرة عامة | `/teacher` |
| بروفايل المدرس | `/teacher/profile` |
| مقرراتي | `/teacher/courses` |
| الحصص والاجتماعات | `/teacher/sessions` |
| الجدول الأسبوعي | `/teacher/schedule` |
| التقدّم والنشاط | `/teacher/progress` |
| أعمال للمراجعة | `/teacher/reviews` |
| شات الطلاب | `/teacher/chat` |

Four new section routes separate courses, schedule, activity reporting and review work from the overview. Existing profile, session and chat URLs are retained. The overview keeps summary metrics/profile and links; detailed panels appear only on their section pages. Existing course links, review filters, temporary meeting simulation and linked chat remain in place.

The shared portal shell uses one reusable top-navigation renderer for student/teacher sections. Links expose the current page and scroll horizontally on smaller screens; the active link stays in view. `teacher-navigation.ts` owns the route/label contract, and `TeacherView` composes existing shared panels. These are separate page links, not in-page tab panels.

No dependencies, backend, authentication, Supabase changes or persistence are introduced. Current fixture URL inventory is 143 pages. ESLint, strict TypeScript, production build and all **47 Playwright checks passed**. Verification covers all eight teacher URLs at 375/768/1440px, no navigation sidebar, active-link visibility, navigation/history, existing actions and accessibility. Existing chat and simulated-meeting flows passed regression checks.

Captures: [desktop overview](previews/dashboard-teacher.png), [mobile course page](previews/teacher-tabs-mobile.png). Physical devices and human screen-reader checks remain outside the automated review.
