# liveschool — Egyptian educational frontend

Arabic-first frontend prototype with UI-01/UI-02 public pages and separately requested student, teacher, parent and admin dashboard previews. Uses fictional Egyptian educational fixtures. No Supabase connection, backend API, real authentication, payment processing, subscriptions or exam engine.

Open `/dashboards` to choose a preview, or visit `/student`, `/teacher`, `/parent` and `/admin` directly. These are public mock views, not protected accounts.

Student and teacher navigation use horizontal top tabs with separate section pages. Admin and parent retain their sidebars.

Teacher profile/class previews are at `/teacher/profile` and `/teacher/sessions`. Separate admin sections are `/admin/users`, `/admin/content` and `/admin/integrations`. Meeting-provider setup and automatic class meetings are simulations only; they do not connect to Google Meet or Zoom.

## Run locally

Requires Node.js 20.9 or newer compatible with the installed Next.js release. This workspace was verified with Node.js 24.19.0 and npm 11.17.0.

```powershell
npm ci
npm run dev
```

Open the local address printed by Next.js. No environment variables or external accounts are required. Cairo fonts are served locally from the installed package.

## Verify

```powershell
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests launch the production server on `127.0.0.1:3100`, then stop it. Run the build first. Chromium installation is a local QA prerequisite, not an application dependency. A separate production preview can be launched with `npm run start` after building.

## Documentation

- [Frontend architecture and project audit](docs/ui/frontend-architecture.md)
- [Design system and component library](docs/ui/design-system.md)
- [Route inventory](docs/ui/route-inventory.md)
- [UI implementation report, verification and limitations](docs/ui/implementation-report.md)
- [Dashboard preview scope and verification](docs/ui/dashboard-previews.md)
- [Teacher/admin management and meeting simulation](docs/ui/teacher-admin-management.md)
- [Student horizontal navigation and page inventory](docs/ui/student-top-navigation.md)
- [Student class calendar](docs/ui/student-calendar.md)
- [Student profile preview](docs/ui/student-profile.md)
- [Linked student–teacher chat preview](docs/ui/linked-chat.md)
- [Teacher horizontal navigation and pages](docs/ui/teacher-top-navigation.md)
- [Earlier Phase 0.1 review](docs/phase-0.1/README.md)

The later UI-only authorization permits this frontend prototype; it does not approve unresolved business decisions in the earlier review. Integration and any later phase require separate authorization.
