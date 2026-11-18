# Open Decisions Register

**All 24 decisions are OPEN.** No owner is appointed, due date committed, or option approved. Owner roles below are proposed. “Gate” identifies the latest point for closure; Phase 0.1 decisions should be resolved before accepting detailed requirements. Later gates require requirements-level constraints now, with technical evidence later.

| ID | Decision / options to evaluate | Proposed accountable owner | Required decision evidence | Gate / links |
|---|---|---|---|---|
| D01 | Authoritative prior requirements, approval authority, and status vocabulary | Sponsor / product owner | Source list, versions, named approvers, change process; replacement plan if prior documents unavailable | Phase 0.1; G01/G03/G28 |
| D02 | Countries, curriculum authorities, languages, grades/subjects and initial cohort | Academic owner / product owner | Approved launch coverage and overall roadmap; representative curriculum examples | Phase 0.1; G02 |
| D03 | MVP boundaries, free pilot versus paid release, constraints and success measures | Sponsor / product owner | Signed scope including modules, deferrals, budget/time constraints, measurable learning/business outcome | Phase 0.1; G03/G12 |
| D04 | Registration, verification channels, identifiers, recovery and age eligibility | Product / identity owner | Adult/minor journeys, exception cases, proof and recovery abuse controls | Phase 0.1; G04 |
| D05 | Multi-role combinations, administrator subroles, grant/revoke authority and separation of duties | Security / operations owner | Actor-action-resource-field permissions, forbidden combinations and escalation controls | Phase 0.1; G05/G17/G29 |
| D06 | Account transitions, session policy, admin MFA, revocation and issued-link residual access | Security / product owner | Per-path maximum denial delay; suspension/deletion/session behavior and test cases | Phase 0.1; G06/G19 |
| D07 | Parent verification, child consent where required, disputes, multiple guardians and billing scope | Safeguarding / product owner | Evidence rules, approval/revocation process and disclosure matrix | Phase 0.1; G04/G07 |
| D08 | Teacher vetting, approval, assignment, content ownership and compensation scope | Academic / operations owner | Lifecycle, authority, replacement/exit process; explicit payout inclusion/exclusion | Phase 0.1; G08 |
| D09 | Academic hierarchy, terms, offering/year rollover, transfers, co-teaching and archives | Academic owner | Agreed glossary and example academic scenarios | Phase 0.1; G09 |
| D10 | Content review, revision, withdrawal, abuse escalation and reviewer independence | Academic / safeguarding owner | State transitions, publication authority and access after withdrawal | Phase 0.1; G10/G22 |
| D11 | Enrollment versus membership versus entitlement; access after expiry/refund/suspension | Product / academic / finance owners | Decision table covering allowed/denied cases and precedence | Phase 0.1; G11 |
| D12 | Recorded, live, downloadable and text teaching; session/attendance scope | Academic / product owner | Selected delivery modes and scheduling/cancellation behavior | Phase 0.1; G12 |
| D13 | Progress/completion, revised content, replays and teacher overrides | Academic owner | Metric definitions and worked examples | Phase 0.1; G13 |
| D14 | Question types, exam timing/retakes, reconnection, scoring, result release and appeals | Assessment owner | State model, scoring examples, concurrency/deadline rules and disclosure timing | Phase 0.1; G14/G15 |
| D15 | Payer/beneficiary, currency, plans, periods, renewal, cancellation, refunds and disputes | Finance / product owner | Commercial rules and entitlement examples, including partial/overlapping changes | Phase 0.1; G16 |
| D16 | Payment methods/provider requirements, manual receipts, event trust and reconciliation | Finance / operations owner | Allowed methods, settlement source of truth, exception/duplicate/refund reconciliation process | Requirements Phase 0.1; provider validation Phase 0.7; G16 |
| D17 | Proposed stack acceptance, access-path boundaries, ORM need and migration authority | Technical / security owner | Constraints and decision criteria now; later approved architecture/access inventory and compatibility evidence | Constraints Phase 0.1; design Phase 0.3–0.5; G17/G26/G27 |
| D18 | File classifications, profile-image privacy, limits, quarantine, access and deletion | Security / product owner | Category-operation matrix, size/type limits, signed-link lifetime and publication authority | Requirements Phase 0.1; security detail Phase 0.5; G18/G19 |
| D19 | Video protection, provider requirements, jobs/queue need and cost tradeoffs | Technical / product owner | Delivery requirements and residual copying risk acceptance; later provider evidence | Requirements Phase 0.1; compatibility Phase 0.7; G19/G26 |
| D20 | Notification events, recipients, channels, preferences and delivery expectations | Product / operations owner | Event-channel matrix, privacy rules and failure-handling targets | Phase 0.1; G20 |
| D21 | Minimum reports, metrics, exports, support and moderation service expectations | Academic / finance / operations owners | Report catalog, calculation examples, support escalation and response expectations | Phase 0.1; G21/G22 |
| D22 | Jurisdiction, privacy/minors policy, consent, retention/deletion and incident obligations | Sponsor / qualified privacy reviewer | Approved policy requirements and responsible person; jurisdiction-specific advice where needed | Requirements Phase 0.1; specialist review before Phase 0 exit; G23/G29 |
| D23 | Workload, performance, availability, RPO/RTO, accessibility, devices and localization | Product / operations / technical owners | Numeric targets with workloads/windows, browser/device matrix, acceptance thresholds and budget assumptions | Phase 0.1; G24/G25/G30 |
| D24 | Hosting constraints, operations/support, restore ownership, monitoring, costs and deployment gates | Operations / technical / finance owners | Operating requirements now; later audit, recovery evidence, vendor costs and named owners | Requirements Phase 0.1; evidence Phase 0.7–0.8; G25/G26/G29 |

## Decision record and change rules

For closure record: ID, exact question, considered options, chosen outcome, rationale, evidence, affected requirement/criterion IDs, approver, approval date, version, and downstream consequences. A meeting note, candidate priority, recommendation, or silence is not approval.

Requirements may be approved with an explicitly bounded later technical decision only when the behavioral requirement, constraints, accountable owner, due gate, and acceptance evidence are settled. Unknown business behavior or unspecified service targets cannot be relabeled as harmless design detail. Reopen affected requirements when a later feasibility result changes those constraints.
