# Teacher subject assignments

Each teacher has exactly one `SubjectId`. A subject can be assigned to multiple teachers; teacher subject values are not unique. Every course must have the same subject as its assigned teacher.

The public subject page lists its teachers. Mathematics includes Ahmed Hassan and Mahmoud Samir as a multiple-teacher example. Physics courses belong to Khaled Ibrahim; Omar Salem teaches science. Teachers without mock courses display an explicit empty state.

The teacher profile uses a single subject selector. Saving a subject that contradicts existing course assignments shows an error and preserves the saved profile. Courses must be reassigned before such a change; reassignment is not implemented in this preview. Session creation also checks that the course belongs to the preview teacher and matches the saved subject.

All behavior is frontend simulation. No database, Supabase, authentication, or backend changes were made. Future backend integration must enforce the same assignment constraints independently.

Validation covers fixture consistency, multiple teachers on a subject page, course teacher links, empty profiles, and rejection of conflicting profile updates.

Verification: lint, TypeScript validation, production build, and all 50 Playwright tests passed. Existing responsive checks cover 375px, 768px, and 1440px viewports. Preview screenshot: [Mathematics teachers](previews/subject-multiple-teachers.png).
