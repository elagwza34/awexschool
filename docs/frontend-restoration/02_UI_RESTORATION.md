# UI Restoration

The isolated reference checkout is at `3909ab1`. Preserve section order, labels, direction, spacing, responsive breakpoints and interaction semantics. Compare desktop (1440 px), tablet (768 px) and mobile (390 px). The reference renders with its historical mock data.

The [reference captures](./reference/) contain 24 Chromium screenshots covering home, search, student, teacher, parent, administrator, owner and customer service at all three widths.

The first restored route is `/search`. It uses the original breadcrumbs, heading, filter layout, result count and empty state, with server-supplied data. Result cards still use the live course card and require visual reconciliation with the original cards. Homepage composition and the original role dashboards are pending.

`/pricing` uses the original informational page and its disclosure dialogs. The illustrative plans retain the reference copy and require no database or purchase flow.
