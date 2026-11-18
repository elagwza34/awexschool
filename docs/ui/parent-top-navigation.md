# Parent dashboard navigation

The parent portal uses the shared horizontal navigation used by student and teacher portals. Admin navigation remains unchanged.

| Route | Content |
| --- | --- |
| `/parent` | Selected child's metrics, encouragement and section shortcuts |
| `/parent/courses` | Children only; each child card opens their courses |
| `/parent/courses/[childId]` | Courses for the child in the URL; return link to all children |
| `/parent/progress` | Selected child's learning activity chart |
| `/parent/schedule` | Selected child's weekly lesson schedule |
| `/parent/activity` | Selected child's latest updates |

Each section has its own URL, active link, browser history and direct navigation. The tab row scrolls within the viewport on small screens. The selected child persists across parent routes through a provider in the parent layout and resets on reload or leaving the parent layout. Existing mock data and preview-only behavior are preserved.

No backend, authentication or external service integration was added.

The courses tab always opens the children list, even if a child was previously selected. Course details remain selected by URL on reload; opening a child's courses also updates the child followed in the other parent sections. Unknown child IDs return 404. Nested course pages keep the courses tab active. No course cards appear before choosing a child.

Child-first flow validation: lint, TypeScript, production build and 11 relevant dashboard/parent Playwright tests passed. Coverage includes both child routes, unknown IDs, child-specific course filtering, navigation, accessibility and responsive layouts. Screenshots: [children on mobile](previews/parent-children-375.png), [child courses on mobile](previews/parent-child-courses-375.png).

Validation: lint, TypeScript validation, production build and all 54 Playwright tests passed. Parent coverage checks direct routes, active links, browser history, child selection persistence, RTL, overflow and accessibility at 375px, 768px and 1440px. Screenshots: [mobile](previews/parent-tabs-375.png), [desktop](previews/parent-tabs-1440.png).
