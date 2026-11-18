# Session lifecycle and attendance preview

Teachers can create a lesson for an assigned course and active group, edit it, cancel it with a reason, and record each attendee as present, absent, late, or unmarked. Unmarked attendance never becomes absence automatically. No attendance percentage or late penalty is assumed.

Each lesson stores a snapshot of its group roster. Later membership changes do not rewrite that roster. An explicit edit with no recorded attendance refreshes the roster from active group members. While any attendance mark is stored, the course, group, date, time, and duration are locked; the title, description, and provider remain editable. Clearing every mark back to unmarked removes this lock.

Cancellation preserves the lesson, reason, and attendance history. Cancelled lessons cannot be edited or marked, do not count as absence, and release their time slot. Restoring a cancelled lesson is not supported.

Overlapping managed lessons are rejected when they share a teacher, group, or student. Adjacent lessons are allowed. The older illustrative calendar fixtures are excluded from this conflict check. Date validation rejects invalid dates and lessons crossing midnight.

Students see updated appointments and their own attendance. Parents select a linked child to see that child's records. Administrators can filter records by teacher, group, date, and status, and inspect attendance without editing it.

New routes: `/teacher/attendance`, `/student/attendance`, `/parent/attendance`. Teacher session actions remain at `/teacher/sessions`; administration records are at `/admin/schedule`.

All records are temporary frontend state and reset on reload or leaving the portal layouts. There is no authentication enforcement, database persistence, Supabase connection, real meeting creation, or notification delivery. Meeting details remain simulated. Changing integration settings alone does not rewrite existing lessons; explicitly changing a lesson's provider regenerates its simulated meeting details.

Validation: production build and TypeScript validation passed. ESLint reported zero errors and one existing `next/no-img-element` warning in `src/components/shared.tsx`. All 96 Playwright tests passed, including eight session lifecycle tests covering conflicts, cancellation, per-student attendance, guardian scoping, roster history, accessibility, and 375/768/1440px layouts. Mobile and desktop captures are available in `previews/teacher-attendance-mobile.png` and `previews/teacher-attendance-desktop.png`.
