# Public route inventory

> Historical frontend-only route inventory. Live portal access is now filtered by `src/proxy.ts` and `src/features/auth/dashboard-roles.ts`; legacy previews are not public account routes. Public catalog/groups readers use Supabase when configured. See the root [README](../../README.md) for current route and authentication behavior.

All routes are frontend views with local fixtures. Dynamic route params are validated; unknown IDs return 404. Known fixture details are pre-rendered where search parameters are unnecessary. Search/filter pages render using local data on the Next.js server and client; no backend API is implemented.

| Route                         | Purpose                                            | Example / behavior                                                                     |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/`                           | Public homepage                                    | Hero, grade finder, stages, subjects, courses, teachers                                |
| `/stages`                     | Educational stages                                 | All 3 stages                                                                           |
| `/stages/[stageId]`           | Grade selection                                    | `/stages/preparatory`; 3 valid stage IDs                                               |
| `/grades/[gradeId]`           | Grade subjects and courses                         | `/grades/preparatory-1`; 12 valid grade IDs; unfilled grades show empty state          |
| `/subjects`                   | Subject catalog                                    | 6 subject examples                                                                     |
| `/subjects/[subjectId]`       | Subject-specific courses                           | `/subjects/math?grade=primary-4`; supports `grade` and `q`                             |
| `/courses`                    | Course listing                                     | Supports `q`, `grade`, `subject`; filters are shareable                                |
| `/courses/[courseId]`         | Course details                                     | `/courses/math-prep-1`; overview/content/teacher tabs, demo price                      |
| `/courses/[courseId]/lessons` | Units and lessons                                  | Native unit disclosures and lesson navigation                                          |
| `/lessons/[lessonId]`         | Public lesson preview or restricted-content visual | `/lessons/math-prep-1-u1-l1`; first lesson of each course has a local text walkthrough |
| `/search`                     | Search results                                     | `/search?q=رياضيات`; query normalization, filters, count and empty state               |
| `/teachers`                   | Teacher listing                                    | 6 fictional teacher profiles                                                           |
| `/teachers/[teacherId]`       | Teacher profile and courses                        | `/teachers/ahmed-hassan`                                                               |
| `/pricing`                    | Pricing preview                                    | 3 illustrative packages, disclosure dialogs, FAQs                                      |
| `/login`                      | Login visual                                       | Local native validation and demo dialog only                                           |
| `/register`                   | Registration visual                                | Fictional data only, display role choice, demo dialog                                  |
| Unknown path or ID            | 404                                                | Clear return-home link                                                                 |

The original catalog fixture inventory yields **122 valid public page URLs** before query variations: 9 fixed pages, 3 stage pages, 12 grade pages, 6 subject pages, 8 course details, 8 unit listings, 72 lessons and 4 teacher profiles. The chooser, four role overviews, five management screens and five separate student section pages two linked-chat pages and four independent teacher section pages bring the current total to **165 page URLs**. Framework assets such as `/icon.svg` are not counted as public page URLs.

## Dashboard preview routes — subsequently authorized

| Route         | Preview                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `/dashboards` | Four-role chooser in the public shell                                                    |
| `/student`    | Progress, example enrolled courses, weekly activity, schedule and lesson navigation      |
| `/teacher`    | Assigned course previews, mock student-work review list, schedule and local demo actions |
| `/parent`     | Two fictional children, child-dependent courses, metrics, activity and schedules         |
| `/admin`      | Overview with separate users, content and integration section links                     |
| `/teacher/profile` | Full professional profile, specialization, curriculum and grade selections |
| `/teacher/sessions` | Class creation and automatic meeting simulation using admin settings |
| `/admin/users` | Users and roles tabs, search and informational dialogs |
| `/admin/content` | Separate content review list and status filters |
| `/admin/integrations` | Nonsecret Google Meet/Zoom settings and connection simulation |

`(portals)` owns the role layouts and shared responsive shell. These views are public previews with no authentication, authorization, remote persistence or business mutations. Sidebar items link to overview anchors or dedicated management routes. Role switching changes the preview URL without changing permissions. Nonsecret mock state survives client-side portal navigation through a shared React provider, and resets on reload or leaving the portal layout. See [management simulation](teacher-admin-management.md).

## Truthful interaction boundaries

Student navigation is now horizontal with separate `/student/courses`, `/student/progress`, `/student/schedule` and `/student/activity` URLs alongside `/student`. These are real page links, not overview anchors. Student pages have no sidebar; the other roles retain theirs. See [student navigation](student-top-navigation.md).

- Search and filters run against fixtures; no search service is called.
- Pricing actions open information dialogs, with no checkout or purchase.
- Registration/login submit handlers prevent navigation, reset form values, and show an explicit demo result. No credentials are persisted or transmitted.
- Restricted lesson visuals do not constitute real content protection. Public preview is a text walkthrough with local step state; no player or streaming provider is configured.
- There are no real subscriptions, assessments, progress records or notification deliveries.

Student profile: `/student/profile` is the sixth top-navigation item, with personal and academic fields and temporary preview saving. See [student profile](student-profile.md).

Linked chat: `/student/chat` and `/teacher/chat` provide a shared temporary messaging preview for enrolled student/assigned teacher pairs. See [chat scope and verification](linked-chat.md).

Teacher navigation now uses eight top page links. New section routes: `/teacher/courses`, `/teacher/schedule`, `/teacher/progress`, `/teacher/reviews`. Existing profile, class and chat routes remain unchanged. See [teacher navigation](teacher-top-navigation.md).

Teacher subject assignments now add two teacher profiles to the original catalog inventory. Each teacher has one subject, and subjects may list multiple teachers. See [Teacher subject assignments](teacher-subject-model.md).

Parent navigation adds four independent section routes: `/parent/courses`, `/parent/progress`, `/parent/schedule`, `/parent/activity`. See [Parent navigation](parent-top-navigation.md).

`/parent/courses` lists children only. `/parent/courses/[childId]` displays the chosen child's courses (two mock child routes); unknown IDs return 404.

Administration messaging adds `/admin/chat`, `/student/admin-chat`, `/teacher/admin-chat` and `/parent/admin-chat`. See [Administration chat](admin-chat.md).

Admin horizontal navigation adds `/admin/reports`, `/admin/schedule` and `/admin/activity`, replacing overview anchor navigation. See [Admin navigation](admin-top-navigation.md).

Staff roles use `/admin/team`, `/manager`, `/manager/requests`, `/manager/team`, `/manager/activity`, `/support`, `/support/requests` and `/support/activity`. See [Staff role previews](staff-roles.md).

Current removal: the Platform Activity and Latest Updates sections and shortcuts were removed. `/admin/reports`, `/admin/activity`, `/student/activity` and `/parent/activity` are restricted previews and return HTTP 307 to `/account` with `message=section-unavailable` and the role `portal` parameter. Only retired `/owner`, `/owner/permissions`, and `/owner/settings` routes return 404. Earlier route tables describe historical additions; progress views and staff audit activity remain separate existing features.

Public logic follow-up: `/pricing` currently redirects to `/courses`, and `/faq` is available with keyboard-accessible question disclosures. See [Logic fixes](logic-fixes.md).

Enrollment foundation adds `/admin/enrollments` and `/teacher/groups`, and recognizes the known `/parent/courses/malak` fixture path while enforcing parent links in the preview UI. See [Enrollment foundation](enrollment-foundation.md).

Session lifecycle adds `/teacher/attendance`, `/student/attendance`, and `/parent/attendance`. `/teacher/sessions` includes editing, cancellation, and attendance actions; `/admin/schedule` provides filtered lesson and attendance records. See [Session lifecycle and attendance](session-attendance.md).

Assignment previews add `/teacher/assignments`, `/student/assignments`, `/parent/assignments`, and `/admin/assignments`. See [Assignments and submissions](assignments-preview.md).

The four existing `/student/schedule`, `/teacher/schedule`, `/parent/schedule`, and `/admin/schedule` routes now use the shared weekly/day calendar. Attendance records remain separate. See [Shared dashboard calendar](shared-calendar.md).

Content management replaces the old `/admin/content` review fixture and adds `/teacher/content` plus the grade-scoped `/student/library` published reading preview. See [Content management](content-management.md).
