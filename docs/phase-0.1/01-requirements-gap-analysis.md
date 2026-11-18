# Requirements Gap Analysis

**Status:** Review findings; proposed resolutions pending approval. See [review conventions](README.md).

Severity: **Critical** can cause unauthorized access, incorrect money/results, or unsafe launch; **High** blocks reliable scope/design; **Medium** creates meaningful usability or operational uncertainty. Severity is a review judgment, not an approved project risk classification.

## Findings

| ID | Source | Type / severity | Missing, ambiguous, or conflicting requirement | Required clarification / decision |
|---|---|---|---|---|
| G01 | §§1.2, 11 | Missing / High | Previous functional requirements and defined flows are referenced but absent. | Obtain source versions and approval evidence; otherwise develop and approve a replacement baseline. D01 |
| G02 | §§1.1, 1.2, 12 | Incomplete / High | Country, curriculum authorities, launch grades/subjects, language coverage, and launch audience are unspecified. | Define overall coverage versus release coverage without silently reducing the approved business scope. D02 |
| G03 | §§1.2, 11–12 | Missing / High | No release boundary, budget, schedule constraints, product owner, or approval authority. | Identify decision makers, first release outcome, constraints, and change process. D01–D03 |
| G04 | §§4.1–4.4 | Incomplete / Critical | Registration eligibility, minimum age policy, guardian involvement, verification channel, and recovery for children without email/phone are absent. | Approve identity, recovery, guardian, and age-handling rules before designing onboarding. D04, D07 |
| G05 | §§4.1, 6.2 | Ambiguous / Critical | Multiple roles are allowed; role combinations, grants/revocations, administrator subroles, and self-approval restrictions are undefined. | Approve operation-level permissions, separation of duties, and multi-role behavior. D05 |
| G06 | §§4.3–4.4, 6.3 | Incomplete / Critical | “Sensitive,” suspension behavior, active-session handling, and effective revocation deadlines are unspecified across API, files, and playback. | Define account transition permissions and maximum denial delay for every access path. D06 |
| G07 | §§5.2, 6.2 | Incomplete / Critical | Verified parent links lack proof, consent, disputes, multiple guardians, revocation, and per-child billing visibility. | Define link lifecycle and precise allowed disclosures; a relationship must not imply universal billing access. D07 |
| G08 | §§1.2, 5.2–5.3 | Missing / High | Teacher approval, qualifications checks, assignment/removal, content ownership, and teacher compensation are undefined. | Define onboarding and assignment lifecycle; decide whether payouts are in scope. D08 |
| G09 | §§5.3–5.4 | Incomplete / High | Curriculum hierarchy, terms, course prerequisites, rollover, transfers, archived offerings, and co-teaching rules are undefined. | Approve academic vocabulary and lifecycle with representative examples. D09 |
| G10 | §§3.2, 5.3 | Incomplete / High | Content review is named without statuses, reviewer scope, edit-after-publication rules, rejection, or withdrawal behavior. | Define review transitions and learner access to revised/withdrawn content. D10 |
| G11 | §§5.4, 5.6, 6.2 | Ambiguous / Critical | Enrollment, classroom membership, and paid entitlement are separate concepts but their precedence is undefined. | Define access rules for free, paid, expired, suspended, transferred, and refunded learners. D11 |
| G12 | §§5.4, 7.3 | Ambiguous / High | Classrooms and sessions do not establish live teaching, recorded teaching, attendance, meeting delivery, cancellations, or timezone behavior. | Decide delivery modes and session lifecycle. A streaming provider is not approval of live classrooms. D12 |
| G13 | §§5.4, 1.2 | Incomplete / High | Lesson completion, progress denominators, replay, teacher overrides, and reports after content changes are absent. | Define measurable progress rules and historical interpretation. D13 |
| G14 | §§5.5, 5.8, 10 | Incomplete / Critical | Question types, scoring, answer secrecy, publication, randomization, retakes, timing, autosave, reconnection, and concurrent submission rules are absent. | Approve exam and assignment state transitions and deterministic grading rules. D14 |
| G15 | §§5.5, 6.2 | Incomplete / Critical | Result release, parent disclosure, manual marking, appeals, and corrected grades lack rules. | Define publication and audited correction authority without overwriting historical outcomes. D14 |
| G16 | §§5.6, 7.1 | Incomplete / Critical | Payer versus student, currency, pricing period, renewal, overlap, refunds, disputes, manual receipts, and external event reconciliation are undefined. | Approve commercial lifecycle and payment operating model. Receipt bucket proposal does not approve manual payments. D15–D16 |
| G17 | §§6.2–6.3 | Incomplete / Critical | Resource-level role matrix is too coarse; operation/field scope and module-by-module direct/API/backend access are undecided. | Require a complete exposure inventory, field restrictions, and negative authorization cases in later security design. D05, D17 |
| G18 | §§7.1–7.2 | Ambiguous / Critical | “Controlled” profile images, file limits, quarantine, replacement, deletion, and public publication authority are undefined. | Decide classifications and lifecycle for every file category; protect minors’ images explicitly. D18 |
| G19 | §§7.2–7.3 | Incomplete / High | Temporary-link validity, withdrawal after issue, playback protection, and acceptable copying risk are undefined. | Define residual access window and provider requirements without promising copy prevention. D06, D18–D19 |
| G20 | §§1.2, 5.7 | Missing / High | Required notification events, channels, delivery guarantees, preferences, retries, and safeguarding constraints are absent. | Approve event-recipient-channel matrix and operational versus optional messaging rules. D20 |
| G21 | §§1.2, 5.7 | Missing / High | Report catalog, metric definitions, financial reconciliation reports, filters, exports, and privacy scope are absent. | Define minimum reports and their authoritative calculations. D21 |
| G22 | §§1.2, 5.7 | Incomplete / High | Support tickets and settings exist only as table proposals; moderation of student content and escalation/appeal workflow are unspecified. | Confirm feature scope, support responsibilities, content reporting, and emergency withdrawal authority. D10, D21 |
| G23 | §§5.8, 9, 12 | Missing / Critical | Data jurisdiction, guardian consent evidence, retention periods, deletion exceptions, and incident response authority are unresolved. | Obtain qualified policy review once audience and jurisdiction are known; do not infer applicable law or retention duration. D22 |
| G24 | §§9–10 | Missing / High | No measurable load, response-time, availability, upload, playback, accessibility, compatibility, or recovery targets. | Approve workload profiles, thresholds, and measurement conditions. D23 |
| G25 | §§8–9 | Incomplete / High | Backup scope does not identify database, file objects, provider video, configuration, restore verification, RPO, or RTO. | Define complete recovery requirements and evidence before later infrastructure selection. D23–D24 |
| G26 | §§8–9 | Incomplete / High | Hosting choice, network evidence, job guarantees, connection budgets, cost envelope, and migration authority are deferred. | Record measurable constraints now; validate actual compatibility in Phase 0.7. D17, D19, D24 |
| G27 | §§2–3, 8, 12 | Tension / High | Proposed technologies are described as responsible components, while exit criteria require a Prisma connection. | Keep responsibilities logical; approve Prisma only by decision. Amend exit criterion to ORM/access method actually approved. D17 |
| G28 | §§10–12 | Status inconsistency / High | Phase 0.1/0.2 are “Defined” while evidence is a feature inventory; final requirements and flows are unavailable. | Distinguish scope identified, draft available, reviewed, approved, and verified statuses. D01 |
| G29 | §§3.2, 5.7, 6.1 | Incomplete / High | Audit events, content, tamper protection, log access, retention, monitoring, and alert ownership are absent. | Define auditable actions and sensitive-data redaction rules; authorize log readers explicitly. D05, D22–D24 |
| G30 | §§3.1, 10, 12 | Missing / High | Arabic RTL is explicit; responsive behavior, mixed-direction content, accessibility, browser support, and end-to-end UAT ownership are not. | Define supported devices and user acceptance scenarios, including children and assistive technology. D23 |

## Interpretation limits

G27 and G28 are status/wording tensions, not proof of incompatible approved systems. No conflict is resolved by silently promoting a proposal to approved status. No table list proves a feature is required: support tickets, refunds, manual receipts, and similar candidates need explicit workflow and release decisions.

The review does not assess vendor capability, current prices, legal compliance, live configuration, or technical feasibility. Those require later evidence. Cross-references to future design identify dependencies only; they do not perform Phase 0.2–0.8.
