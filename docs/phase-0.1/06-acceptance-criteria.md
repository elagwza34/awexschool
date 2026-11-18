# Acceptance Criteria

**Status:** Proposed specifications for approval, not executed tests. No implementation exists in this review. Product criteria describe future verification; documentation criteria determine Phase 0.1 readiness now.

## Phase 0.1 documentation acceptance

| ID | Pass condition | Current result |
|---|---|---|
| DOC01 | Source/version, review scope, evidence limits and approved architecture are explicitly recorded. | Met in this package |
| DOC02 | All 14 baseline functional areas and material security/operational requirements have traceable matrix rows. | Met in this package |
| DOC03 | Gaps, proposed priorities, decisions, risks and acceptance criteria are linked by stable IDs. | Met in this package |
| DOC04 | Named accountable owners and approvers accept authority; missing prior documents are supplied or formally replaced. | Not met; D01 |
| DOC05 | Launch scope and all business behavior affecting selected requirements are decided and approved. | Not met; D02–D16/D20–D22 |
| DOC06 | Measurable service, privacy, access, recovery, file and workload parameters are approved; no selected requirement depends on undefined pass values. | Not met; D06/D18/D22–D24 |
| DOC07 | Technical decisions deferred to later Phase 0 have approved constraints, responsible owners and evidence gates. | Not met; D17/D19/D24 |
| DOC08 | Owner review records acceptance or rejection of each material proposal and residual risk; later work requires separate authorization. | Pending review |

## Product behavior and quality criteria

For every scenario, later verification must identify approved requirement version, test identity/role, data state, environment, expected result, observed result, and evidence. Each parameter references a decision rather than an invented approved value. A scenario with an unresolved parameter is **blocked**, not passed.

| ID | Requirements | Proposed testable acceptance condition | Parameters / approval dependency |
|---|---|---|---|
| AC01 | F01 | Given each approved adult/minor onboarding path, valid verification yields one linked identity/profile; failed or repeated onboarding cannot grant unapproved roles. Recovery preserves correct account ownership. | D04/D07; retry/recovery policy |
| AC02 | F02, N02/N04 | Given unauthorized, expired, tampered, or wrong-scope requests, every supported access route denies protected data/actions. Editing self-managed data cannot grant roles or reveal sensitive fields. | D05/D17; approved route/action/field inventory |
| AC03 | F02, N02 | Given an active session whose account or role is disabled/revoked, affected operations stop within the approved deadline. File/playback residual access matches explicitly accepted limits. | D06; per-route deadline and lifecycle |
| AC04 | F03 | Given unapproved or unassigned teacher status, publishing/grading outside scope is denied; assignment/removal changes access under the approved lifecycle and leaves an audit record. | D05/D08 |
| AC05 | F04/F06 | Given rollover, transfer, or archived offering, current academic placement matches approved rules while historical enrollments/results retain their original context. | D02/D09/D22 |
| AC06 | F05 | Given an unverified, disputed, unrelated, or revoked parent link, child data is denied as specified. Verified parents receive only permitted fields/results/billing for each linked child. | D06/D07 |
| AC07 | F07 | Public users see only published public catalog fields; learners see lesson/resource access according to the approved access decision table. Unpublished content is not discoverable through alternate routes. | D10/D11 |
| AC08 | F08 | Given each content transition, only approved actors can execute it; rejection prevents publication and revision/withdrawal applies the agreed effect to current and historical learner views. | D10 |
| AC09 | F09 | Evaluate enrollment/membership/entitlement combinations for active, expired, refunded, suspended and transferred users; actual access matches every approved decision-table row. Duplicate/concurrent enrollment has one defined outcome. | D11/D15 |
| AC10 | F10/F11 | Assigned staff manage only their groups; unrelated users cannot view membership. If sessions are selected, reschedule/cancel/timezone/attendance cases match the agreed lifecycle and recipient rules. | D03/D09/D12/D20 |
| AC11 | F12 | Given approved activity examples, progress equals the approved formula; duplicate events, replay, content revision and authorized overrides produce documented outcomes. | D13 |
| AC12 | F13, N06 | A submitted assessment references fixed question content/options/marking rules; subsequent question edits do not alter that attempt. Learner payloads exclude unreleased answer keys. | D14 |
| AC13 | F14 | Concurrent/repeated submissions produce one authoritative final outcome. Deadline, reconnect, autosave and retake cases follow the approved clock and conflict rules without losing acknowledged responses. | D14; timeout/grace/save parameters |
| AC14 | F15 | Approved scoring examples yield exact expected marks; unreleased results/answers remain hidden. Manual marking, appeals and corrections require proper scope and preserve the earlier result with audit history. | D14 |
| AC15 | F16 | For each approved plan, payer/student combination and overlapping period, displayed price/currency and effective access period match the approved commercial rules. | D15 |
| AC16 | F17, N06 | Forged, failed, duplicate and out-of-order payment events never create unauthorized or duplicate paid access; trusted successful settlement yields one reconciled order/payment/access effect. | D16; source of truth and reconciliation timing |
| AC17 | F18, N06 | Full/partial refund, dispute, cancellation and expiry cases produce the approved financial and entitlement outcomes; concurrent/retried events preserve authoritative history. | D15/D16; supported cases and settlement timing |
| AC18 | F19 | Each selected event sends permitted data only to intended recipients through selected channels; retry/duplicate/failure and preference cases meet approved delivery rules. | D20; event list, delivery and retry targets |
| AC19 | F20 | Report fixture totals match approved calculations and source records; teacher/parent/finance views and exports respect role and field scope. | D05/D13/D21 |
| AC20 | F21, N11 | Cross-owner upload/read/replace/delete attempts are denied. Disallowed type/size/content fails validation; quarantined files remain inaccessible. Approved link expiry, publication and deletion cases match policy. | D18; limits, validation, lifetime, residual-access rules |
| AC21 | F22 | Users can report content through the approved route; authorized staff triage/escalate/withdraw according to policy without disclosing reporter or child data beyond approved scope. | D10/D21/D22; response/escalation targets |
| AC22 | F23, N10/N16 | Representative student/teacher/parent/admin tasks complete on the approved browser/device matrix, in Arabic RTL and mixed-direction content, meeting approved keyboard/screen-reader and accessibility criteria. | D23; conformance target and task list |
| AC23 | F24, N13 | Each selected sensitive event records approved actor/action/resource/time/outcome fields without secrets; unauthorized log access/change is denied, and required alerts reach accountable operators. | D05/D22/D24; event list, retention and alert targets |
| AC24 | F25, N05 | Approved data-access/correction/deletion requests follow verification and retention rules; protected historical records and approved exceptions remain explainable and traceable. | D22; retention schedule, deadlines, policy review |
| AC25 | N01/N04 | Later architecture/configuration evidence retains approved Supabase services, one platform and linked identity model; client artifacts contain no secret/service credentials or independent password store. | Preserved baseline; later evidence only |
| AC26 | N03 | Later security specification lists each exposed resource and privileged path with operation/field scope, GRANT/RLS intent and allowed/denied scenarios; no path relies on assumed RLS inheritance. | D17; Phase 0.5 evidence |
| AC27 | N07/N08 | Under approved steady and peak workloads, measured journey latency/error rate and service availability meet approved limits using the defined measurement window and dependency treatment. | D23; all numeric thresholds and workloads |
| AC28 | N09 | Later isolated restore exercise recovers approved database, object, media and configuration scope within approved RPO/RTO, and validates references, access rules and representative learning/payment records. | D23/D24; recovery targets and evidence |
| AC29 | N12 | If video is selected, representative devices meet approved startup/buffering/protection targets; unauthorized playback is denied under the accepted token lifetime and copying-risk model. | D12/D19/D23 |
| AC30 | N13 | Failed/repeated jobs and provider outages trigger approved retries, deduplication, reconciliation, alerts and escalation without duplicate financial or assessment effects. | D16/D20/D24; job inventory and deadlines |
| AC31 | N14 | Later operating design identifies isolated environments, one schema-change authority, reviewed release/restore gates and proven hosting/network constraints before configuration or implementation approval. | D17/D24; later design/audit evidence |
| AC32 | N15 | Approved workload and consumption assumptions produce an itemized monthly cost estimate within the approved envelope, with limits, overage assumptions and alert owners recorded. | D19/D23/D24; budget and capacity numbers |
| AC33 | N16 | Public metadata/indexing and Arabic search/date/numeral/money display match approved rules; private learner, parent, finance and unpublished content is excluded from public discovery. | D02/D23; locale and search rules |

Passing DOC01–DOC03 establishes package completeness only. Product scenarios remain unexecuted and cannot establish implementation readiness during this documentation review.
