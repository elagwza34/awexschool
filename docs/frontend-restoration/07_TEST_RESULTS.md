# Test Results

Reference capture used Chromium in the isolated original checkout. The capture set covers eight routes at three viewport sizes.

The catalog search unit regression failed before the filter implementation and passed afterward. The full unit suite passed after the first search integration. A mobile Chromium smoke check confirmed that `/search` responds directly with RTL, reads the filter from the URL and submits an updated URL. That check does not establish database-backed browser acceptance.

The configured Playwright preview timed out while starting its build and server. A separate production build completed, and Chromium smoke against that build passed search filters, RTL, unavailable-data feedback and opening the original pricing dialog. ESLint and TypeScript passed. The browser smoke used no database credentials. Successful results from an isolated Supabase instance, Firefox, WebKit and production smoke are separate acceptance gates.

The preview runner now builds with the scrubbed environment before Playwright starts its server timer. Search and pricing passed six focused checks across Chromium, Firefox and WebKit. Separately, the exact published-course reader and filter returned 36 rows through the production publishable key and correctly found the selected course. This was a read-only SDK check, separate from browser verification and deployment.

The final local production build also loaded a real published search result, the homepage grade finder and pricing against the public Supabase connection in Chromium at 1440 px, Firefox at 768 px and WebKit at 390 px. Guest verification of the protected Customer Service requests URL redirected to login in all three browsers. Build, ESLint and the full unit suite passed on the combined changes.

The Customer Service SQL passed the contract check and a synthetic PostgreSQL scenario covering own-profile visibility, ticket assignment, separation from technical support, reply persistence, manager escalation, status, activity and inactive-account exclusion. Windows reported a file lock while deleting that temporary cluster after the assertions. A full Supabase Auth/PostgREST fixture rehearsal for the new staff screens is pending. Production received read-only queries.
