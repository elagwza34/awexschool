# Test Results

Reference capture used Chromium in the isolated original checkout. The capture set covers eight routes at three viewport sizes.

The catalog search unit regression failed before the filter implementation and passed afterward. The full unit suite passed after the first search integration. The permanent preview browser regression checks the original route, Arabic RTL, unavailable-data feedback and shareable search URLs. That preview uses no database credentials. Successful results from an isolated Supabase instance, Firefox, WebKit and production smoke are separate acceptance gates.
