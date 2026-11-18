# Compact interface review

Spacing and presentation were simplified across the public website and all seven portal roles. Existing routes, mock contracts, text, actions and preview behavior were preserved.

## Changes

- Smaller public and portal headers, navigation rows and page padding.
- Shared section/panel spacing tokens in `globals.css`, tighter card padding and gaps, reduced corner rounding and heading sizes.
- Smaller decorative course images and a horizontal teacher card layout retaining names, subjects and profile links.
- Compact dashboard shortcuts retaining icons, labels, descriptions and actions.
- Two-column metric cards on mobile; three-metric dashboards use three columns on desktop.
- Tighter forms, dialogs, tables, calendars, chat contact cards, empty states and footer spacing. Calendar time geometry and chat message viewport heights were preserved.
- Body font sizes, Arabic font, RTL alignment, focus styles, navigation and large touch targets remain available. Content was not hidden or collapsed to obtain these reductions.

## Before/after measurement

The audit compares 19 representative routes at 375px, 768px and 1440px (57 samples). Main content text and counts of links, buttons and input fields matched exactly, with no document horizontal overflow. The combined document height across these samples decreased by **15%**, including minimum viewport-height pages.

| View | Width | Before | After | Reduction |
| --- | --- | --- | --- | --- |
| Homepage | 375px | 8807px | 6847px | 22% |
| Homepage | 1440px | 4285px | 3225px | 25% |
| Course catalog | 375px | 4874px | 4122px | 15% |
| Student overview | 375px | 2622px | 1639px | 37% |
| Admin overview | 375px | 3264px | 2067px | 37% |
| Teacher profile | 375px | 3836px | 3477px | 9% |

The text/count comparison applies to the sampled main content, not every interactive state. Functional regression tests cover the interactive journeys separately. Measurements are rounded and depend on viewport size and fixtures.

Archived result artifacts (the original baseline snapshot was superseded by the subsequent visual review): [after](qa/density-after.json), [comparison](qa/density-comparison.json). The reusable audit is `node scripts/ui-density-audit.mjs before|after`, against the local production preview on port 3000; capture `before` before future changes.

Screenshots: [student mobile](previews/compact-student-375.png), [catalog mobile](previews/compact-catalog-375.png), [home desktop](previews/compact-home-1440.png), [team mobile](previews/compact-team-375.png), [teacher profile desktop](previews/compact-teacher-profile-1440.png).

No dependencies, backend integration, Supabase resources or production services were changed.

Final verification: lint, TypeScript validation, production build and all 70 Playwright tests passed on the final compact interface. Existing checks cover RTL, responsive layouts, navigation/history, calendars, chat exchanges, profile forms, staff creation, filters and automated accessibility. The 57-sample density audit also passed with zero content/count mismatches or document overflow.
