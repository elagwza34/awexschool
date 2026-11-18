# Refined application style

The approved visual direction was applied across the public website and all portal roles using the existing shadcn/Radix/Tailwind architecture.

- Card and container corners use 8px radii; buttons and fields use 6px.
- Navigation and shared tabs use an active green underline, replacing filled capsule tabs. Keyboard behavior and route history are preserved.
- Neutral gray backgrounds, subtle borders, quieter category tints and lighter heading weights reduce visual noise.
- Decorative shadows, paper textures and prominent background shapes were reduced. Avatars, progress bars and status indicators retain their semantic shapes.
- Shared panel padding is 12–16px. Section spacing is 24–32px. Primary buttons and form controls retain a minimum 44px height.
- Team directories in admin and manager views use compact rows with responsive wrapping. Names, emails, roles and preview links remain present.

No library replacement, route change, business logic change, backend integration or Supabase modification was made.

Visual audit artifacts for this iteration use the `refined` label: run `$env:UI_AUDIT_LABEL='refined'; node scripts/ui-density-audit.mjs before` before changes, and `after` against the updated local preview. Separate labels prevent replacing earlier audit artifacts.

The 57 sampled main-content text and link/button/field counts match before and after, with no document overflow. This iteration builds on the already compact layout; combined sample height decreased by a further 1%. See [comparison](qa/refined-comparison.json), [before](qa/refined-before.json) and [after](qa/refined-after.json).

Screenshots: [admin desktop](previews/refined-admin-1440.png), [student mobile](previews/refined-student-375.png), [team desktop](previews/refined-team-1440.png), [course mobile](previews/refined-course-375.png).

Verification: lint, TypeScript validation, production build and all 71 Playwright tests passed. The new style check validates 8px card radii, 6px button radii, minimum 44px button height and underlined active navigation across all seven portal roles. Existing functional, responsive, RTL and automated accessibility checks pass.
