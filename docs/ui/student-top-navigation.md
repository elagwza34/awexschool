# Student top navigation and separate pages

The owner requested horizontal tabs at the top of the student dashboard and a separate page for each section. This change applies only to the student layout. Teacher, parent and admin keep their existing sidebar navigation and routes.

| Visible section | URL | Content |
|---|---|---|
| نظرة عامة | `/student` | Welcome, summary metrics, continue-learning preview and shortcuts |
| مقرراتي | `/student/courses` | The sample student's three course cards and lesson links |
| التقدّم والنشاط | `/student/progress` | Weekly activity, weekly goal and course completion indicators |
| الجدول الأسبوعي | `/student/schedule` | Dated week/day calendar with timed classes, filtering and class details |
| آخر المستجدات | `/student/activity` | Sample learning activity timeline |

Student pages use the shared portal header, demo notice, role selector, notification dialog and footer. The sidebar and mobile sidebar toggle are absent for this role. Navigation is a row of real Next.js links styled as tabs, with `aria-current="page"`, visible keyboard focus and horizontal scrolling on smaller viewports. Real links are used because these are separate URLs rather than in-page tab panels. Refresh, direct links and browser history remain supported.

`student-navigation.ts` owns the section/URL contract; `StudentView` composes the existing shared panels and typed fixtures. Detailed course, progress, schedule and activity panels are no longer repeated on the overview. No dependencies, backend calls, authorization, data storage or real learning behavior were added.

ESLint, strict TypeScript, production build and all **31 Playwright checks passed**. Coverage includes all five student URLs at 375/768/1440px, a single horizontal navigation row, absence of a sidebar, active-page indication, no document overflow, refresh/history, section-specific content and axe accessibility scans. Public URL inventory is now 136 pages.

Captures: [overview](previews/dashboard-student.png), [mobile overview](previews/dashboard-student-mobile.png), [courses](previews/student-courses.png), [progress](previews/student-progress.png). Physical device and human screen-reader checks remain outside the automated review.

The subsequent profile addition introduces `/student/profile` as the sixth top-navigation page, labeled **بروفايلي**. The latest verification covers six student pages and 137 public fixture URLs; see [student profile](student-profile.md).
