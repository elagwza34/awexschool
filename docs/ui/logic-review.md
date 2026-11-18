# Frontend interaction logic review

**Follow-up:** these historical findings are addressed in [Logic review fixes](logic-fixes.md). The evidence below records the pre-fix state.

Reviewed using ui-ux-pro-max guidance for form submission feedback, error recovery, navigation history and keyboard access. Scope is the existing frontend simulation; this is not a backend/security audit. No fixes to the newly discovered issues were applied as part of this review.

## Confirmed findings

### Public navigation links return 404 — high priority

The footer still links to `/pricing`, but the corresponding public page is absent from the current source tree and production route manifest. The header also links to `/faq`, which returns 404. Both broken destinations were confirmed from rendered homepage links; see [broken-links-review.json](qa/broken-links-review.json). This breaks public navigation and existing pricing-dialog tests. The public-route check failed with `/pricing: expected 200, received 404`.

Recommendation: resolve whether pricing should remain in scope. If retained, restore the page; if intentionally removed, remove its links and update the route contract/tests consistently. The missing page was observed during review and was not part of the four approved dashboard route removals.

The FAQ link likewise needs an implemented destination or removal until that page is available.

### 1. Teacher schedule silently omits created lessons — medium priority

`TeacherSchedulePreview` limits session entries with `sessions.slice(0, 3)`. After creating four different dated lessons, the session list contains all four but `/teacher/schedule` omits the earliest-created lesson. The page description promises all weekly appointments and provides no indication that entries are hidden. Entries are selected by creation order rather than lesson date.

Reproduction: create lessons 1–4 on 20–23 November 2026, then navigate internally to the teacher schedule. Lessons 2–4 appear; lesson 1 does not. This is distinct from the intended temporary storage reset on reload.

Recommendation: show all relevant lessons sorted by date/time, or add explicit week filtering/pagination and an accurate visible count.

### 2. Teacher profile accepts a whitespace-only display name — medium priority

The required name input accepts spaces. Submission trims the name but the save handler validates only subject assignments, so an empty display name is stored while the form reports success. This can remove the teacher's visible name from the portal header and linked chats.

Reproduction: set “اسم الظهور للطلاب” to three spaces and save. A success status is shown. Student profile validation already rejects trimmed empty names, making behavior inconsistent between roles.

Recommendation: validate trimmed required names in the shared save boundary and show field-linked errors without replacing the saved profile.

### 3. Chat role filtering leaves an excluded recipient selected — medium priority

Filtering changes `filteredContacts` but the active recipient is resolved from all `contacts`. On admin chat, selecting the parent filter while Ahmed Hassan is active hides him from the contact list but keeps his message panel and enabled composer. A user can send to the previously selected teacher while browsing a parent-only list.

Recommendation: when role filters exclude the selected contact, clear the active conversation or select a visible contact, and clear/separate the draft. Search behavior can be decided independently, but the active recipient must remain unambiguous.

### Homepage star ratings use unsupported ARIA labeling — accessibility priority

The three testimonial ratings attach `aria-label="تقييم 5 من 5"` to a generic `div` without a semantic role. The focused WCAG scan fails on the homepage with `aria-prohibited-attr` (serious impact), before reaching the missing pricing page. Recommendation: give the static rating an appropriate image/group semantic role and accessible name, with decorative stars hidden from assistive technology, or use equivalent visible/screen-reader text. Verify the resulting accessibility tree with a fresh scan.

## Evidence and limits

All three interaction cases were reproduced in a local Chromium session at 1440px using fictional data. `scripts/logic-review.mjs` reproduces the interactions without external delivery or persistent storage; results are in [logic-review.json](qa/logic-review.json). It waits for the destination route before recording schedule results to avoid reading stale content during navigation.

The existing role membership filters, single-subject teacher contract, temporary state lifetime and staff queue separation were inspected. Real authentication, invitations, permissions and message delivery remain unimplemented by design and are not counted as bugs.

## Previously requested removal

Platform Activity and Latest Updates were removed from navigation, shortcuts and page routes. `/admin/reports`, `/admin/activity`, `/student/activity` and `/parent/activity` are no longer available. Learning progress and staff change logs are separate existing features.

## Validation results

Production build and TypeScript validation pass. Lint has no errors and one warning for the current brand image using `<img>` instead of Next Image. The full existing test suite returned 68 passed and 4 failed, including missing pricing and broken public-link failures. A focused follow-up of removal and dashboard navigation completed with all 21 tests passing. These successful checks do not cover or dismiss the interaction findings reproduced above.

## Source locations

- Missing FAQ destination: [site-header.tsx](../../src/components/layout/site-header.tsx:15).
- Missing pricing destination: [site-footer.tsx](../../src/components/layout/site-footer.tsx:25).
- Truncated schedule: [teacher-profile-summary.tsx](../../src/features/dashboards/teacher-profile-summary.tsx:59).
- Required name normalization: [teacher-profile-editor.tsx](../../src/features/dashboards/teacher-profile-editor.tsx:70), [save boundary](../../src/features/dashboards/preview-context.tsx:84).
- Filtered contacts and active recipient: [chat-workspace.tsx](../../src/features/dashboards/chat-workspace.tsx:106).
- Rating semantics: [homepage](../../src/app/(public)/page.tsx:233).
