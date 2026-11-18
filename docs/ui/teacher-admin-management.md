# Teacher/admin management and meeting simulation

## Authorization

The owner requested a complete teacher profile, specialization/curriculum selection, separated user/content administration, user/role tabs, and Google Meet/Zoom configuration linked to teacher-created classes. After clarification, the owner explicitly selected **interfaces and simulation only**. No real provider connection, OAuth, backend, database change, external calendar event, meeting, invitation or production operation is implemented.

## Delivered routes

| Route | Behavior |
|---|---|
| `/teacher/profile` | Full/display names, fictional contact details, governorate, qualification, experience, biography, teaching approach, specialization/detail, curriculum, academic year/term, stages and dependent grades; local image preview. |
| `/teacher/sessions` | Title, assigned course, date/time, duration, provider and description; host/settings summary; overlap validation; temporary class list and simulated meeting result. |
| `/admin/users` | Four role-based tabs in requested RTL order: **طالب، ولي أمر، مدرس، إدارة**. Each tab shows and searches only its role's mock users, with existing detail dialogs. This replaces the earlier Users/Roles split. |
| `/admin/content` | Independent content review list and status filters, with no user-management tabs. |
| `/admin/integrations` | Meet/Zoom tabs, fictional host details, Google calendar identifier, Cairo timezone, default duration, automatic creation, connection-simulation confirmation and disable action. |

The admin overview links to separate management sections. Teacher navigation includes profile/classes. Sidebar highlighting follows subroutes and scrolls vertically when needed. Teacher header/profile summary reflect saved mock profile changes. Created class previews also appear in the teacher overview schedule.

Profile specialization/curriculum edits do not grant access or reassign the public catalog. The class course list remains the two fixture courses assigned to the sample teacher. Removing a stage removes its selected grades; saving requires at least one stage and grade.

## State boundary

`(portals)/layout.tsx` wraps the four previews in `PortalPreviewProvider`. Teacher text/profile, nonsecret provider settings and class records live in React memory. Client-side portal navigation preserves them; reloading or leaving the portal layout resets them. No browser storage, cookies, credentials or remote persistence are added.

Images use temporary browser object URLs, revoked on replacement/unmount. The 2 MB PNG/JPEG/WebP limit is a demo constraint, not a production upload policy. Images are not uploaded or retained across navigation. Edits do not change the public fictional teacher catalog.

Typed contracts/defaults are in `management-types.ts` and `management-fixtures.ts`. No OAuth client credentials, secrets, refresh tokens or real join URLs are accepted or generated.

## Class/meeting outcomes

| Saved settings | New class outcome |
|---|---|
| Simulation off | `awaiting_connection`: local class only |
| Simulation on, automatic creation off | `disabled`: local class only |
| Simulation on, automatic creation on | `simulated`: class plus `MEET-DEMO-…` or `ZOOM-DEMO-…` reference |

References cannot join meetings. Actual connection status always remains **not connected**, separately from simulation status. Every result explicitly states that no external meeting/event/invitation was created.

Provider choice loads its saved default duration. Classes capture host/settings at creation; later changes do not alter previous records. Temporary classes for the sample teacher cannot overlap on the same date across providers. Only one-off, same-day classes are demonstrated. Recurrence and real update/cancellation synchronization are not implemented.

### Try the linked flow

1. Open `/admin/integrations`; choose Meet or Zoom and keep fictional details.
2. Enable automatic creation and confirm connection simulation.
3. Switch to Teacher using the role selector and open Classes and meetings.
4. Create a class; inspect its demo meeting reference.
5. Try an overlapping time, then reload to verify temporary state resets.

Use client-side portal links/role switching between steps. Reloading the teacher URL after enabling the admin simulation resets the entire demonstration.

## Future real integration — notes only

Google Calendar event creation can include conference creation data and `conferenceDataVersion=1`, with a new `createRequest.requestId`. The authorized account needs write access to the selected calendar. Conference creation status must be handled before presenting a working join link. None of these requests occurs here. References: [Calendar event creation](https://developers.google.com/workspace/calendar/api/guides/create-events), [event conference fields](https://developers.google.com/workspace/calendar/api/v3/reference/events).

Zoom authorization depends on account ownership: user authorization versus server-to-server access for an organization's own account. Confidential-client token/API calls belong on the server. Future meeting handling must distinguish host-only `start_url` from attendee joining details. References: [Zoom OAuth](https://developers.zoom.us/docs/integrations/oauth/), [Meetings API](https://developers.zoom.us/docs/api/meetings/).

Before integration, approve host/account ownership, consent/scopes, server runtime, protected token storage, teacher/course authorization, scheduling conflicts, idempotent application operations, failure/retry/reconciliation, cancellation/update behavior, invitations and safeguards for minors. These remain proposed requirements, not approved business decisions or implementation.

## Verification

Production build, ESLint and strict TypeScript checks passed. **All 26 Playwright scenarios passed** in the final production run, including all 132 valid fixture page URLs. Management coverage verifies the five routes at 375/768/1440px, role/content separation, profile save/reset, dependent grades, provider defaults, automatic-creation states, cross-route Meet/Zoom flows, overlap validation, and absence of external/business requests or browser storage. All five default management screens and the connection/role dialogs passed axe A/AA/2.1 AA checks.

Visual review captures: [teacher profile](previews/teacher-profile.png), [mobile profile](previews/teacher-profile-mobile.png), [admin roles](previews/admin-roles.png), [integration details](previews/admin-integrations.png), [enabled Meet simulation](previews/admin-meet-simulation.png), [created class preview](previews/teacher-session-created.png), [mobile class preview](previews/teacher-session-mobile.png).

Real OAuth/provider end-to-end, physical devices and human screen-reader checks are outside this change. Existing development-toolchain advisories remain as recorded in the earlier report. No dependencies were added.

Role-tab follow-up: ESLint and production build/TypeScript passed. Five focused browser checks passed for per-role filtering, existing user dialogs, content separation, management layouts at 375/768/1440px and accessibility. [Mobile role tabs](previews/admin-user-tabs-mobile.png).
