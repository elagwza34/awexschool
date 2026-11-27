# Test Results

Reference capture used Chromium in the isolated original checkout. The capture set covers eight routes at three viewport sizes.

The catalog search unit regression failed before the filter implementation and passed afterward. The full unit suite passed after the first search integration. A mobile Chromium smoke check confirmed that `/search` responds directly with RTL, reads the filter from the URL and submits an updated URL. That check does not establish database-backed browser acceptance.

The permanent preview browser regression also checks unavailable-data feedback. Its preview uses no database credentials. Successful results from an isolated Supabase instance, Firefox, WebKit and production smoke are separate acceptance gates.
