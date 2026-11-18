# Shared dashboard calendar

The weekly schedule routes for student, teacher, parent, and administrator now render one shared `DashboardCalendar` component. `StudentCalendar` remains a compatibility wrapper. The teacher's former schedule list and the parent/admin schedule records were replaced with the calendar; the separate attendance pages retain their existing records UI.

The calendar supports Saturday-first weekly and daily views, previous/next navigation, date selection, course filtering, Cairo times, overlapping event lanes, cancelled event styling, and keyboard-accessible lesson dialogs. The week scrolls horizontally inside its own region on small screens; the page itself does not overflow. A daily view offers a narrow-screen alternative.

Managed sessions use the existing roster snapshots. Students see their own sessions, parents see the selected currently linked child's sessions, teachers see sessions they own, and administrators see all sessions. Illustrative course calendar fixtures remain visible according to current enrollments/teacher assignments. Parent child changes reset calendar filters and dismiss any previous child's details.

Teacher/parent/admin calendars add group and status filters; administration also adds a teacher filter. Group filtering applies to managed group sessions; course-level illustrative fixtures do not have group membership. Date filtering uses the calendar's week/day range, with daily view for an exact date.

Dialogs preserve course, teacher, date, time, duration, provider, cancellation reason, group, description, and simulated meeting reference where available. Students/parents see only the chosen learner's attendance. Teachers/admins can inspect the session roster and attendance in read-only form. Attendance editing and lesson lifecycle actions remain in their dedicated pages.

Preview state, providers, and business rules are unchanged. No backend, Supabase connection, real meetings, or database changes were introduced. The existing illustrative calendar reference date remains 2026-11-15; the Today button returns to that demo date. Staff dashboards without a schedule section were not given a new schedule feature.

Validation: build and TypeScript passed. ESLint found zero errors and the existing logo image warning. The 108-case full regression run passed 107 cases; the remaining teacher navigation assertion expected the former list heading. After updating that assertion, all five teacher navigation tests passed. Four new calendar tests cover role and child scoping, teacher/group/status filters, week/day rendering, dialogs, accessibility, and 375/768/1440px layouts. Existing session, attendance, overlap, and date-navigation tests passed. Screenshots: `previews/admin-calendar-desktop.png` and `previews/parent-calendar-mobile.png`. Native screen-reader and physical-device testing were not performed.
