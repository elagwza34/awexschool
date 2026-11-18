# Risks and Dependencies

**Status:** Qualitative review, all risks OPEN. Likelihood and impact are judgments based on missing requirements, not incident evidence. Owners are proposed.

## Risk register

| ID | Risk / trigger | Likelihood / impact | Proposed owner | Required treatment and closure evidence | Links |
|---|---|---|---|---|---|
| R01 | Incomplete inventory is treated as approved requirements and implementation starts prematurely | High / High | Product owner | Approve traceable behavior and scope; retain explicit phase authorization gate | G01–G03/G28; D01–D03 |
| R02 | Minors are enrolled or exposed without settled guardian/privacy rules | Unknown / Critical | Safeguarding / privacy owner | Resolve audience/jurisdiction; approve identity, disclosure, retention and escalation policy | G04/G07/G23; D04/D07/D22 |
| R03 | Multi-role, stale privilege, privileged backend, or direct access bypasses intended scope | Medium / Critical | Security owner | Approve operation-level access boundaries and revocation targets; require negative-path test specification later | G05/G06/G17; D05/D06/D17 |
| R04 | Payment retries, races, disputed receipts, or lifecycle gaps grant incorrect access or duplicate financial effects | Medium / Critical | Finance owner | Define trusted settlement, atomic/idempotent effects, reconciliation and refunds; testable examples | G11/G16; D11/D15/D16 |
| R05 | Exam races, reconnection, leaked answers, or mutable questions produce incorrect or unfair results | Medium / Critical | Assessment owner | Approve immutable version, timing, submission, scoring, release and correction rules | G14/G15; D14 |
| R06 | Content, files, student submissions or profile images become visible outside intended audiences | Medium / Critical | Security / academic owners | Approve category-level access/publication policy and issued-link residual windows | G10/G18/G19; D10/D18 |
| R07 | First release attempts every stage/subject/module without a capacity or scope boundary | High / High | Sponsor | Approve rollout, staffing/content availability, budget and acceptance boundary | G02/G03; D02/D03 |
| R08 | Hosting, ORM, workers or network assumptions prove incompatible after design commitment | Medium / High | Technical owner | Define constraints; keep stack proposals conditional until Phase 0.7 evidence | G26/G27; D17/D19/D24 |
| R09 | Video/file egress, messaging or peak exam usage exceeds budget or capacity | Unknown / High | Finance / operations owners | Approve load/cost model and alerts; validate later using current provider evidence | G19/G24/G26; D19/D23/D24 |
| R10 | Backup plan restores database records without required file/video objects or operational configuration | Medium / High | Operations owner | Approve recovery scope, RPO/RTO and full restore acceptance procedure | G25; D23/D24 |
| R11 | Undefined metrics and changing content generate contradictory learner/parent/finance reports | High / High | Academic / finance owners | Approve report formulas, version semantics and reconciliation examples | G13/G21; D13/D21 |
| R12 | Arabic, accessibility or mobile failures prevent target learners from completing core tasks | Medium / High | Product owner | Approve device/accessibility targets and representative RTL acceptance journeys | G30; D23 |
| R13 | Unowned failed jobs, notifications, incidents or support issues leave learning/payment problems unresolved | High / High | Operations owner | Assign operating owners, retries, alert/escalation thresholds and reconciliation duties | G20/G22/G29; D20/D21/D24 |
| R14 | Independent schema authorities or ambiguous deletion policies damage historical/financial records | Medium / Critical | Technical / privacy owners | Approve migration ownership and retention/deletion constraints before later schema design | G23/G26/G27; D17/D22/D24 |

“Critical” risks are proposed candidates for the baseline's P0 gate; no approved P0 definition was supplied. Sponsor/security owners must ratify classification and closure evidence. The review neither closes risks nor accepts residual risk on their behalf.

## Dependencies and required evidence

| Dependency | Needed evidence | Blocks | Owner / stage |
|---|---|---|---|
| Previous requirements and user flows | Actual versioned documents or explicit replacement decision | Complete authoritative baseline | Product; Phase 0.1 |
| Academic stakeholders and launch content | Curriculum examples, content rights, teachers, representative learner/parent needs | Academic scope and realistic launch | Academic/product; Phase 0.1 |
| Business and finance rules | Plans, payer model, supported methods, refund/dispute authority | Paid MVP and access rules | Finance; Phase 0.1 |
| Privacy/safeguarding review | Target jurisdiction/audience and approved policy requirements | Registration, guardian visibility, retention | Qualified reviewer/sponsor; Phase 0 |
| Measurable operating envelope | Cohort size, concurrent use, peak exam submissions, files/video consumption, budgets | Capacity, cost, provider selection | Product/operations; requirements now, audit later |
| Provider and hosting evidence | Current plan/network/runtime limits, delivery security, queue/retry behavior, costs | Stack/connection and deployment decision | Technical/operations; Phase 0.7 |
| Security/data/UX design | Later role-operation/field matrices, exposure inventory, ERD, flows, bucket policy design, UI specifications | Final Phase 0 exit | Assigned design owners; Phase 0.2–0.6, not performed here |
| Test and release authority | Approved scenarios, target values, named UAT signatories and final GO/NO-GO process | Readiness approval and any eventual implementation | Product/QA/sponsor; criteria now, final gate Phase 0.8 |

Supabase Database/Auth/Storage are preserved architectural dependencies. This review does not verify subscriptions, quotas, configuration, backups, integrations, or live security. Technical and cost evidence must be obtained under later authorized work.
