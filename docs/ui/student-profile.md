# Student profile preview

`/student/profile` is available through the sixth horizontal student navigation link, **بروفايلي**. It includes full/display names, fictional email/optional phone, optional governorate/school, interests, academic stage, dependent grade, curriculum and academic year. A profile summary and read-only fictional guardian summary are displayed alongside the form.

The student draft uses the existing React-only portal preview context. Saving updates the header name/initials and student heading/grade during client-side portal navigation. Reloading or leaving the portal layout resets the fixture. Cancel discards unsaved edits and restores the last saved preview draft.

Changing stage resets the grade to a valid grade within it. Academic profile edits do not change catalog enrollments, lessons, calendar audience or access rights. The guardian summary neither creates nor modifies any relationship. No date of birth, national identifier, password or real account details are requested. There is no avatar upload in this preview.

No backend, external request, authentication, Supabase, database or browser-storage behavior is added. Fixtures and contracts are separate from rendering. ESLint, strict TypeScript, production build and all **37 Playwright checks passed**. Coverage includes shared student navigation at 375/768/1440px and accessibility scans, plus profile save, cross-page reflection, dependent grades and reload reset. No POST or browser-storage writes occurred in the profile flow.

Visual captures: [desktop profile](previews/student-profile.png), [mobile profile](previews/student-profile-mobile.png). Physical devices and human screen-reader checks remain outside the automated verification.
