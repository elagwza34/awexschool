# Content management preview

Implemented the first UI backlog priority: course, unit, lesson, resource, and publication management. Other backlog items (assignment reopening, student detail dossiers, notification center, permission editor, account recovery) are not part of this change.

Routes:
- `/teacher/content`: manage the sample teacher's content.
- `/admin/content`: manage and review all content; replaces the old illustrative review table.
- `/student/library`: read the latest approved content for the sample student's grade.

`src/features/content` contains typed contracts, fixture adapters, structural validation, preview state, editor, and reader. The eight catalog courses seed independent editorial snapshots. Existing catalog course ownership follows the canonical course assignment registry. New content-only courses keep their selected teacher and are not automatically enrolled or added to group/meeting/assignment selectors.

Teachers create courses only in their single registered subject. Administrators can select a teacher; the subject follows that teacher automatically. The grade, subject, and teacher are fixed in the course editor after creation. Existing catalog ownership can still change through the separate assignment registry. Editors support unit/lesson titles, lesson duration, objectives, text, PDF/video/link resource metadata, reordering, and deletion inside a draft. Closing the editor discards unsaved changes.

Workflow: draft → review → approved preview publication, or changes requested with an administrator note. Pending review locks editing until withdrawn. Editing an approved course creates a new working revision and preserves the old published snapshot. Only administrator approval replaces that snapshot. Unpublishing requires a reason, hides the published snapshot, and retains a draft. Incomplete courses can be saved as drafts but cannot be submitted for review. Revision checks reject stale editor saves.

The student library is a grade-scoped reading preview, not enrollment or entitlement. Draft names, bodies, and resources do not replace the published student content before approval. Readers show text and resource metadata only; there is no real upload, PDF download, video playback, or external resource navigation. Link metadata validates HTTPS and all content renders as plain text.

All state is temporary and resets on reload or leaving the portal layout. Existing public catalog pages, enrollment data, meeting creation, assignments, and authentication remain unchanged. No backend, Supabase, storage persistence, migrations, production resources, or real publication was added. Role/action guards are mock interaction rules, not authorization security.

Known boundaries: there is no rich-text/video editor, autosave, deleted-item history, multi-editor collaboration, real file handling, or public catalog synchronization. Adding new content courses to enrollment selectors is a separate integration step. If a teacher's registered subject changes after creating standalone drafts, incompatible drafts cannot be submitted or approved until subject ownership is resolved. Production approval and retention rules remain business decisions.

Validation: production build and TypeScript passed. ESLint reported zero errors and the existing logo `next/no-img-element` warning. All 116 Playwright tests passed, including eight content cases covering draft validation, review feedback, approval, snapshot isolation, unpublishing, cancellation, ownership/subject/grade filters, reordering/deletion, resource metadata, absence of external writes/storage, accessibility, and 375/768/1440px layouts. The full edit/review/read journey reported no browser errors. Screenshots are in `previews/admin-content-desktop.png`, `previews/teacher-content-editor-mobile.png`, and `previews/student-content-library-mobile.png`. Physical devices and native screen readers were not tested.
