# UI Restoration

The isolated reference checkout is at `3909ab1`. Preserve section order, labels, direction, spacing, responsive breakpoints and interaction semantics. Compare desktop (1440 px), tablet (768 px) and mobile (390 px). The reference renders with its historical mock data.

The [reference captures](./reference/) contain 24 Chromium screenshots covering home, search, student, teacher, parent, administrator, owner and customer service at all three widths.

The search route uses the original breadcrumbs, heading, filters, count and course-card presentation. The public course schema has no term field, and anonymous clients cannot read lessons. Search omits those two metadata labels until a compatible public summary exists.

The homepage combines the original animated introduction and discovery sections. Stages, grades, subjects, courses and teacher cards use Supabase. Illustrative testimonials and achievements are labeled as examples. The lesson CTA points to the catalog while public lesson preview remains pending. Customer Service pages reuse the original staff workspace presentation with persisted assigned-ticket data.

`/pricing` uses the original informational page and its disclosure dialogs. The illustrative plans retain the reference copy and require no database or purchase flow.
