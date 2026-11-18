# Functional and Non-Functional Requirements Matrix

**Status:** Candidate detailed baseline for review. Sources and confirmed obligations are distinguished from proposed detail. All acceptance criteria are unexecuted.

**State:** I = baseline scope identified, detail incomplete; C = explicit baseline obligation confirmed, detailed acceptance still pending; P = newly proposed requirement. **Priority:** Must/Should/Could are proposed MVP priorities, not approvals. All rows inherit the scope and approval conventions in [README](README.md).

## Functional requirements

| ID | Source / state | Requirement to specify and approve | Proposed priority | Decisions | Acceptance |
|---|---|---|---|---|---|
| F01 | §§1.2, 4 / I | Register, verify, sign in/out, recover accounts, and provision the matching application profile through an approved onboarding lifecycle. | Must | D04, D06–D07 | AC01 |
| F02 | §§4.1–4.4, 6 / C | Authorize each operation using current account status, trusted role assignments, and resource scope; define role combinations and lifecycle transitions. | Must | D05–D06 | AC02–AC03 |
| F03 | §§1.2, 5.2 / I | Approve teachers, assign/remove teaching scope, and control what teacher profile data is public. | Must | D08 | AC04 |
| F04 | §§1.2, 5.2–5.4 / I | Maintain student academic identity, year/grade placement, transfers, and archived learning records. | Must | D09, D22 | AC05 |
| F05 | §§1.2, 5.2, 6.2 / I | Create, verify, dispute, and revoke parent-child relationships; expose only approved linked data. | Must | D07 | AC06 |
| F06 | §§1.2, 5.3 / I | Manage approved curricula, stages, grades, subjects, years/terms, and offering lifecycle without altering historical assignments. | Must | D02, D09 | AC05 |
| F07 | §§1.2, 5.3 / I | Discover published courses and lessons, view allowed public information, and navigate units/resources. | Must | D02, D10–D11 | AC07 |
| F08 | §§3.2, 5.3 / I | Author, submit, review, reject, publish, revise, and withdraw content using approved ownership and review rules. | Must | D08, D10 | AC08 |
| F09 | §§5.4, 5.6 / I | Enroll learners and enforce the relationship between enrollment, group membership, and entitlements throughout their lifecycles. | Must | D11, D15 | AC09 |
| F10 | §§1.2, 5.4 / I | Create classrooms, manage memberships and assigned staff, and define group privacy and archive rules. | Should | D03, D09, D12 | AC10 |
| F11 | §5.4 / I | Schedule/reschedule/cancel sessions and handle attendance and delivery mode if included in the launch scope. | Could | D03, D12, D19 | AC10 |
| F12 | §§1.2, 5.4 / I | Record lesson activity and calculate completion/progress under an approved version-aware rule. | Must | D13 | AC11 |
| F13 | §§1.2, 5.5 / I | Author and version supported question types, options, marking data, and reusable question classifications. | Must | D14 | AC12 |
| F14 | §§1.2, 5.5, 10 / I | Assign assessments, enforce timing/attempt rules, persist responses, and submit once under concurrency and reconnection. | Must | D14 | AC13 |
| F15 | §§3.2, 5.5 / I | Grade supported automatic/manual work, publish results, restrict answer disclosure, and audit corrections and appeals. | Must | D14 | AC14 |
| F16 | §§1.2, 5.6 / I | Publish approved plans/prices and sell access for an identified student and payer under defined periods and overlap rules. | Must for paid launch | D03, D15 | AC15 |
| F17 | §§5.6, 10 / I | Verify payment outcomes, reconcile events, and grant access only after the approved successful payment or approved exception workflow. | Must for paid launch | D15–D16 | AC16 |
| F18 | §§5.6–5.7 / I | Handle refunds, disputes, expiration, cancellation, and reconciliation under approved authority and entitlement effects. | Must for paid launch | D15–D16 | AC17 |
| F19 | §§1.2, 5.7 / I | Deliver defined operational notifications, handle failures, and apply approved preferences and recipient privacy. | Must for selected events | D20 | AC18 |
| F20 | §§1.2, 5.7 / I | Provide approved student, teacher, parent, academic, operational, and finance reports with fixed metric definitions and scoped access. | Must for basic reports | D21 | AC19 |
| F21 | §§7.1–7.2 / C | Authorize upload/read/replace/delete for each file class, validate files, and manage publication and temporary access. | Must | D06, D18 | AC20 |
| F22 | §§1.2, 5.7 / I | Define support, abuse reporting, escalation, and content moderation responsibilities and any required ticket interface. | Should for ticket UI; Must for reporting route | D10, D21–D22 | AC21 |
| F23 | §§3.1, 1.2 / I | Provide public discovery and role-scoped student, teacher, parent, and admin journeys in Arabic RTL. | Must | D03, D05, D23 | AC22 |
| F24 | §§3.2, 5.2, 6.1 / C | Record and expose sensitive-operation audit history only to authorized reviewers. | Must | D05, D22–D24 | AC23 |
| F25 | §§5.8, 12 / I | Fulfil approved data access, retention, correction, and deletion workflows while preserving justified financial/assessment history. | Must | D22 | AC24 |

## Non-functional requirements

Each metric below needs approved values, workload, environment, evidence, and owner before it can pass. No numeric target is assumed approved.

| ID | Source / state | Required outcome or proposed measurable specification | Priority | Decisions | Acceptance |
|---|---|---|---|---|---|
| N01 | §§2, 3.3, 9 / C | Retain Supabase Cloud PostgreSQL, Auth, Storage; no separate password store; retain single-platform model. | Must | None to preserve baseline | AC25 |
| N02 | §§4, 6 / C | Deny unauthorized access at every supported route; specify revocation deadline, session policy, and admin MFA policy. | Must | D05–D06, D17 | AC02–AC03 |
| N03 | §§5.1, 6.2–6.3 / C | Document exposed resources, GRANT/RLS intent, field restrictions, privileged boundaries, and negative cases without assuming ORM connections inherit user RLS. | Must | D17 | AC26 |
| N04 | §§3.1, 4.3 / C | Keep secret/service credentials out of client assets and logs; do not authorize from editable profile fields or user metadata. | Must | D05, D24 | AC02, AC25 |
| N05 | §§5.8, 12 / I | Classify personal/minor/payment data; approve collection, location, access, retention, deletion, and incident policies. | Must | D02, D22 | AC24 |
| N06 | §§5.8, 10 / C | Preserve integrity, immutable assessment versions, UTC timestamps, audited corrections, and atomic/idempotent financial outcomes. | Must | D09, D14–D16 | AC12–AC17 |
| N07 | §9 / P | Set p95/p99 latency and error-rate limits per critical journey under named concurrent-user and exam-submission workloads. | Must | D23 | AC27 |
| N08 | §9 / P | Set service availability target, measurement window, dependency/error treatment, and permitted maintenance. | Must | D23–D24 | AC27 |
| N09 | §9 / I | Set RPO/RTO per data class; include database, file objects, video, configuration, and verified restore evidence. | Must | D23–D24 | AC28 |
| N10 | §§3.1, 12 / I | Set accessibility conformance target, keyboard/screen-reader coverage, RTL/mixed-direction rules, supported browsers and viewports. | Must | D23 | AC22 |
| N11 | §§5.8, 7.2 / I | Set size/type/quota limits, content validation, quarantine rules, link lifetime, deletion behavior, and upload failure recovery. | Must | D18, D23 | AC20 |
| N12 | §7.3 / I | Specify playback startup/buffering goals, supported devices, protection requirements, and copying risk acceptance if video launches. | Conditional Must | D12, D19, D23 | AC29 |
| N13 | §§5.7, 9 / I | Set alert thresholds, job retry/idempotency expectations, reconciliation, escalation owners, and log redaction/retention. | Must | D16, D20, D22, D24 | AC23, AC30 |
| N14 | §§8–9 / C | Separate environments, establish one schema-change authority, review/restore gates, secrets handling, and hosting compatibility evidence. | Must | D17, D24 | AC31 |
| N15 | §9 / I | Approve capacity forecast and monthly budget covering database, Auth, files, egress, video, messaging, jobs, and hosting; define budget alerts. | Must | D19, D23–D24 | AC32 |
| N16 | §§3.1, 5.8 / I | Specify Arabic content/search behavior, dates, timezone display, numerals, monetary formatting, and public SEO/indexing exclusions. | Should; privacy exclusions Must | D02, D09, D23 | AC22, AC33 |

## Traceability and completeness

All 14 baseline functional areas are represented: users F01–F02; curriculum F06; teachers F03; students F04/F09; parents F05; courses F07–F08; bank F13; exams/assignments F14–F15; classrooms F10–F11; progress F12; subscriptions/payments F16–F18; reports F20; notifications F19; moderation F08/F22. Operational table proposals also map to F21–F25 and N13.

An ID is not approval. Owners must expand each approved requirement into actors, preconditions, authorized scope, happy path, error/abuse paths, state transitions, data classification, and approved acceptance parameters. Unsupported question types, delivery modes, payment methods, or role actions remain undecided until explicitly recorded.
