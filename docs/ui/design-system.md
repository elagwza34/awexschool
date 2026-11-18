# Design system and reusable components

## Direction

“liveschool” is the platform name supplied by the owner. Its visual identity uses quiet editorial typography, warm educational paper, dark green structure, restrained ochre accents, and small illustrated learning surfaces. The Latin wordmark retains left-to-right direction within the Arabic RTL interface. Arabic copy mixes clear standard Arabic with a light Egyptian conversational tone. No invented enrollment numbers, ratings or testimonials are shown.

The UI/UX skill's design-system search returned a minimal, spacious structure with Arabic-friendly typography. Its strict-RTL educational product search returned no match after one retry; RTL behavior therefore follows explicit project requirements, logical CSS, semantic controls and browser verification rather than a claimed database recommendation. The suggested generic black/pink palette was adapted to this project's green/paper identity.

## Tokens

Canonical CSS tokens live in `src/app/globals.css`; Tailwind maps them through `@theme inline`.

| Role                | Value / use                                                         |
| ------------------- | ------------------------------------------------------------------- |
| Background          | `#fbfcf9`, warm off-white                                           |
| Foreground          | `#203c32`, deep green-black                                         |
| Primary             | `#205c49`, navigation/actions                                       |
| Primary foreground  | White                                                               |
| Secondary           | `#edf4ef`, quiet controls and notices                               |
| Muted foreground    | `#596761`, supporting copy                                          |
| Border / input      | `#dde4de` / `#c9d4cd`                                               |
| Destructive         | `#b42318`                                                           |
| Focus ring          | `#287260`                                                           |
| Subject/stage tones | Central `tones` map in shared components: mint, peach, blue, lilac  |
| Font                | Cairo Variable, Arial/sans-serif fallback; locally served           |
| Shape               | 8–24px radii; larger radius for editorial panels                    |
| Layout              | 1240px maximum container; 20px phone and 32px larger-screen gutters |
| Spacing             | 4px base rhythm; 48–80px section spacing                            |

Foreground text generally uses 16px; supporting card/navigation text uses 14px, metadata 12px. Illustrative microcopy may be smaller but does not carry essential navigation. Arabic line-height is generous (body 1.85, headings 1.55). Touch controls target at least 44px height. Subject/teacher identity uses illustrations or initials; fictional people are not misrepresented through real photos.

## Component inventory

| Component                                | Responsibility / behavior                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Button                                   | Primary/outline/secondary/ghost/link variants, Slot composition, disabled/focus states                       |
| Dialog                                   | Radix-backed modal, title/description, focus containment, Escape and focus restoration; Arabic close control |
| Tabs                                     | Radix-backed tabs with explicit RTL direction, keyboard navigation and selected semantics                    |
| Input / Label                            | shadcn source primitives with associated labels and form constraints                                         |
| SiteHeader / SiteFooter / Brand          | Shared public navigation, mobile disclosure, footer navigation                                               |
| Breadcrumbs                              | Labeled navigation and ordered ancestry; current-page semantics                                              |
| PageIntro / SectionHeading               | Consistent page/section hierarchy and optional actions                                                       |
| Badge / DemoNotice                       | Category metadata and explicit demo-state disclosure                                                         |
| StageCard / SubjectCard                  | Reusable academic discovery links                                                                            |
| CourseCard / TeacherCard                 | Reusable listing cards and detail links                                                                      |
| GradeFinder                              | Dependent stage/grade selects and local navigation                                                           |
| CatalogBrowser                           | Search, subject/grade filters, query URLs, result count, reset, empty state                                  |
| CourseContent / UnitList                 | Course tabs, native keyboard-accessible unit disclosures, lesson links                                       |
| CourseEnrollPreview / DemoDialog         | Price illustration and truthful non-transactional feedback                                                   |
| LessonPreview                            | Three-step local text walkthrough; no video or progress storage                                              |
| AuthForm / AuthScreen                    | Shared login/register visuals, visible labels, password visibility, local validation, no data submission     |
| EmptyState / loading / error / not-found | Consistent empty, route loading, recoverable failure and 404 states                                          |
| PortalBoundary                           | Future layout organization only; no dashboard or access control                                              |

## Accessibility and responsive rules

Subsequently requested dashboard previews reuse these tokens and primitives. Their shared `PortalShell` supplies desktop/sidebar and mobile/disclosure navigation; reusable panels provide metrics, course progress, weekly bar charts, schedules, activity timelines and locally filtered user/review tables. Wide tables have focusable labeled scrolling regions. These are public mock views, not authenticated dashboards; see [dashboard scope](dashboard-previews.md).

- Global RTL, native form controls, visible focus, skip link and one primary content landmark.
- Named navigation landmarks; meaningful control labels; decorative icons hidden from assistive technology.
- LTR isolation for mathematical expressions and email input; directional back/forward icons follow RTL.
- Form labels and help text are associated; browser-native required/type/length validation is retained.
- Search results and lesson-step changes use polite announcements. Dialogs disclose demo outcomes without implying successful authentication or payment.
- Mobile navigation is a nonmodal disclosure, closes with Escape, and restores toggle focus. Dialogs handle modal focus separately.
- Grid layouts collapse from 3/4 columns to 2/1; detail sidebar moves below content. No hover-only features.
- No essential animation. Reduced-motion preference disables transitions/animations; loading pulse is motion-safe.
- UI is light-theme only. No dark-theme switch or unverified dark theme is offered.

Automated accessibility checks are evidence for covered pages, not a certification. Human Arabic screen-reader testing, educational content review and full assistive-device coverage remain future work.
