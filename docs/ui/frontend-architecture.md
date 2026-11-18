# Frontend architecture — UI-01 / UI-02

## Initial project audit

The workspace contained only `docs/phase-0.1/` and its eight Markdown review files. No framework, application source, package manifest, lockfile, routing, components, styles, build configuration, or local AGENTS.md existed. The supplied conversation AGENTS instructions applied. Existing review documents were preserved without edits.

The user subsequently authorized this frontend-only implementation. It does not represent approval of the prior review's unresolved business rules or authorization for backend integration.

## Foundation

- Next.js App Router with React, strict TypeScript, Tailwind CSS v4/PostCSS, ESLint flat configuration.
- shadcn/ui new-york configuration, RTL enabled, copied source components owned by this project. Dialog, tabs, input and label were added through the shadcn CLI; button uses the same composable variant/Slot convention.
- Locally served Cairo variable font. No runtime third-party fonts, images, SDKs, or analytics.
- Exact direct dependency versions and npm lockfile; no Supabase, NestJS or payment packages.
- Server-rendered/static public pages by default. Client components are limited to interactions, filters, dialogs, tabs, auth visuals and the text walkthrough.
- Explicit `lang="ar"`, `dir="rtl"`, logical spacing, directional navigation icons, isolated LTR math and email fields.

## Source organization

```text
src/
  app/
    layout.tsx                 global language, font, metadata, skip link
    globals.css                semantic tokens, Tailwind, shared layout utilities
    (public)/                  public shell and all UI-02 routes
    (portals)/
      student/                 separate layout and mock dashboard page
      teacher/                 separate layout and mock dashboard page
      parent/                  separate layout and mock dashboard page
      admin/                   separate layout and mock dashboard page
    not-found.tsx              unknown-route state
  components/
    ui/                        shadcn primitives and button
    layout/                    public header/footer and portal boundary
    shared.tsx                 brand, badges, intro, headings, breadcrumbs, notices
    catalog-cards.tsx          course, subject, stage and teacher cards
    demo-dialog.tsx            reusable local-only feedback
  features/
    catalog/                   typed contracts, fixtures, adapter, filters, course UI
    home/                      grade finder and vector learning illustration
    lessons/                   local text walkthrough
    auth/                      shared visual forms and screen
  lib/                         class composition and stable route helpers
tests/                         production browser QA
```

There are no route handlers, server actions, credential files, database scripts, SQL, migrations or production deployment configuration. Dashboard previews were added after the owner's subsequent explicit request; their scope is documented separately.

## Typed data and future integration

`Stage`, `Grade`, `Subject`, `Teacher`, `Course`, `Unit`, `Lesson`, `LessonStep`, `CatalogQuery`, and `CatalogService` define frontend contracts. A separate typed `PricingPlan` fixture module owns illustrative packages. Catalog and lesson content are separate from interactive rendering components. Fixtures include 3 stages, 12 grades, 6 subjects, 4 fictional teachers, 8 courses, 24 units, and 72 lesson records. Available fixtures intentionally do not fill every grade or subject; empty states explain that limitation.

`CatalogService` and the mock adapter expose the initial asynchronous list/detail contract. Catalog filtering is currently synchronous/local for instant feedback. Page composition consumes fixtures/selectors directly where appropriate for this prototype. This is a prepared seam, not a completed remote data layer: later integration must replace both direct selectors and client-side fixtures with approved service calls/DTO mapping and server-side pagination.

Keep business behavior out of shared primitives. Centralize request handling and external DTO mapping in future feature services. Do not insert SDK calls into cards. A future NestJS service may own authorized business operations; future Supabase Auth/Storage use must follow separately approved identity, resource and storage policies. No credentials or service endpoints are configured now.

## Layout and access boundaries

The later student navigation revision removes the sidebar/mobile disclosure for the student role only. `student-navigation.ts` defines seven top-navigation page links and `StudentView` renders each page's content. Student root is an overview; courses, progress, schedule, activity and profile each have independent child routes. Shared portal header/actions remain reused, while other role sidebars are preserved. See [student page layout](student-top-navigation.md).

Public pages share `(public)/layout.tsx`, including the `/dashboards` preview chooser. Each role has a separate layout using `PortalBoundary` and a public mock dashboard at `/student`, `/teacher`, `/parent` or `/admin`. `PortalShell` centralizes responsive sidebar/header navigation, role switching and demo notifications. Role views compose reusable metrics, progress, charts, tables and panels from `features/dashboards`; typed dashboard fixtures are separate from rendering. These layouts implement no authentication or authorization. Any eventual protected routes require reviewed server-side access control; neither hidden UI nor route groups are security controls.

## State and bundle discipline

The later management preview adds a small React context at `(portals)/layout.tsx` for temporary nonsecret teacher/profile, provider-settings and class-simulation state across portal navigation. It adds no storage or service SDK and resets on reload. Separate teacher profile/classes and admin user/content/integration routes compose feature components. This context is not an authentication or permission boundary. See [management scope](teacher-admin-management.md).

State lives locally in the component that owns the interaction. No global store, form framework, animation library, video SDK, network cache library, or API client is added. Radix-backed components provide accessible focus/keyboard behavior. Cairo and local vector illustrations avoid external asset calls. Playwright/axe are development-only QA dependencies. Search parameters support direct links and refresh; Arabic queries are normalized for common letter/diacritic variants.

Public metadata has a title template and Arabic description. The prototype is intentionally `noindex,nofollow`; publishing and production SEO require separate review. A production Next.js server renders search/filter URLs; no business backend API exists. Repeated query parameters are normalized and bounded before use. Fixture detail parameters are constrained to the build-time inventory; adding fixtures requires rebuilding. Search owns the current route-level loading boundary; shared skeleton and error/empty/404 components provide consistent fallback presentation.

## References consulted

- [Next.js installation and validation guidance](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn/ui manual setup](https://ui.shadcn.com/docs/installation/manual)
- [shadcn/ui Tailwind v4 guidance](https://ui.shadcn.com/docs/tailwind-v4)

The installed package versions and source are authoritative for this build. No Nagwa assets, code, claims, or visual layout were copied. The educational discovery hierarchy is stages → grades → subjects → courses → units → lessons.

The linked-chat addition shares one `ChatWorkspace` between student and teacher routes. `chat-data.ts` derives permitted fixture contacts from enrollment/course assignments, and the preview context holds temporary messages. This introduces no service connection or persistence.

Teacher navigation now reuses the shared top-navigation renderer alongside the student role. `teacher-navigation.ts` defines eight page links; `TeacherView` owns overview/course/schedule/report/review composition. Admin and parent sidebars remain.
