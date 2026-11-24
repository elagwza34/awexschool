# Direct and group chat boundaries

## Current direct-chat UI

`/student/chat`, `/teacher/chat`, and the role administration-chat routes render `LiveChat` with fixture contacts and messages. This UI is intentionally **read-only**: the composer, attachment upload, recording, and submit controls are absent, and a visible status explains that sending is unavailable. Fixture account and thread identifiers are rejected by `canWriteDirectChat` and by `sendPortalMessage` before Storage or RPC calls. A real attachment path must belong to the authenticated UUID account.

`ChatWorkspace` still contains the reusable live write path, and Supabase migrations define direct-chat tables, RPCs, Storage, and RLS. Their existence does not mean the fixture UI is connected to live conversations. Complete authenticated direct-chat integration remains deferred; Phase 01 did not alter production RLS.

## Group-chat preview

Group-chat workspace messages and attachments use browser-local `PortalPreviewProvider` state. They do not invoke Supabase mutations. Reloading or leaving the preview layout resets that state. This preview is not evidence of live group persistence or authorization.

## Verification scope

Phase 01 unit tests cover client write gating, fixture identifier rejection, message validation, and authenticated attachment-path ownership. The separate live Playwright project includes an authenticated fixture-chat read-only check, but it is **BLOCKED / NOT RUN** without a disposable local Supabase instance. Historical broad-suite chat results and screenshots described earlier frontend-only behavior and are not current live-chat verification.

See the root [README](../../README.md) for the scoped QA commands and local-only environment requirements.
