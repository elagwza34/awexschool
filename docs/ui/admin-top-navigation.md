# Admin horizontal navigation

All four portal roles now use the same horizontal route navigation. The former admin sidebar and mobile menu were removed. Active links scroll into view within the tab row on small screens. Existing admin URLs and their controls remain available.

| Route | Purpose |
| --- | --- |
| `/admin` | Overview metrics and shortcuts |
| `/admin/users` | Users grouped by student, parent, teacher and administration |
| `/admin/content` | Content management preview |
| `/admin/integrations` | Google Meet and Zoom simulation |
| `/admin/chat` | Administration conversations |
| `/admin/reports` | Platform learning activity chart |
| `/admin/schedule` | Weekly schedule preview |
| `/admin/activity` | Latest platform updates |

The chart, schedule and updates moved from the overview to dedicated pages. Links use normal route navigation, `aria-current`, direct URLs and browser history. No backend or production resources changed.

Verification: lint, TypeScript validation, production build and all 65 Playwright tests passed. New coverage verifies all admin tabs, browser history, direct rendering, RTL, overflow and accessibility at mobile/tablet/desktop sizes (375px, 768px, 1440px). Existing management and chat flows pass with the new navigation. Screenshots: [mobile](previews/admin-tabs-375.png), [desktop](previews/admin-tabs-1440.png).
