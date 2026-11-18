# Student class calendar

`/student/schedule` now shows a dated calendar instead of the previous schedule list. The route and frontend-only scope are unchanged.

- Saturday-first week, seven dated columns, Cairo time labels and classes positioned by start time/duration.
- Week/day views, previous/next controls, Today reset and date picker.
- Course filtering, empty-period messages and a textual color legend.
- Accessible class-details dialog: course, teacher, date, start/end, duration and meeting provider. No real join action.
- Overlapping events use separate visual lanes. Mobile week view scrolls inside a named focusable region; day view offers a compact alternative.

Typed fixtures and date/layout helpers live in `calendar-data.ts`. The sample reference date is the supplied client date, **15 November 2026**, with an initial week of 14–20 November. Fixtures are fixed examples, not a live schedule. Wall-clock times are Cairo times; UTC arithmetic is used only for date-only movement/formatting, avoiding host-timezone dependence.

The calendar merges temporary teacher-created classes from the existing preview context, limited to the sample student's course IDs. Primary-course classes do not appear for this preparatory student. This is fixture-based filtering, not real authorization. Reloading/leaving the portal layout still resets temporary state.

No dependencies, backend, Supabase connection, database change, external calendar, invitations or real meeting integration were added. Editing, drag/drop, recurrence, attendance and rescheduling are not implemented.

## Verification

ESLint, strict TypeScript and production build passed. The full browser run passed 36 scenarios; the final typography/mobile-navigation follow-up passed all 10 calendar/student-page checks. Coverage includes three viewport sizes, week/day modes, classes and details, date navigation, filtering/empty periods, temporary teacher-class visibility, overlap lane separation and keeping the active top-navigation link in view. Automated accessibility scans cover the day view and empty state. Physical devices and human screen-reader checks remain outside scope.

Captures: [desktop week calendar](previews/student-calendar.png), [mobile day calendar](previews/student-calendar-mobile.png).
