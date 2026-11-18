# MVP Scope and Priorities

**Status:** Proposed release slicing only; no scope reduction or implementation approval.

## Proposed first-release outcome

A learner in an explicitly selected curriculum and grade can discover approved teaching, obtain authorized access, study lessons, complete a supported assessment, and see released progress/results. Assigned teachers can author and assess; verified parents can see permitted child information; authorized administrators can operate and audit the service.

The overall platform still includes all three stages and the subjects within the targeted curricula. A smaller pilot requires explicit D02/D03 approval and a documented expansion path; none is presumed. No release date or budget is invented.

## Priorities for review

| Priority | Proposed scope | Minimum boundary / unresolved choice |
|---|---|---|
| Must | Identity, account status, scoped roles, teacher approval, verified parent links, admin controls | F01–F05; identity/guardian/MFA and revocation policy must be decided. |
| Must | Selected academic catalog, courses, lessons/resources, moderation/publication, enrollment and access | F06–F09/F21; launch curriculum, lesson types, and access precedence need approval. |
| Must | Basic progress, question bank, exams/assignments, marking and result release | F12–F15; approve a supported subset of question/assignment types. No type is selected here. |
| Conditional Must | Commercial plans, payment confirmation, reconciliation, refunds/disputes, expiry | F16–F18 are mandatory for a paid launch. Free pilot versus paid launch is D03/D15, not a review assumption. |
| Must | Essential in-product reports and operational notifications | F19–F20; specify exact reports/events before approval. External channels remain undecided. |
| Must | Arabic RTL core journeys, privacy controls, auditability, recovery and operational ownership | F23–F25, N01–N15 as applicable; numeric service targets require decisions. |
| Should | Classroom/group management and basic membership views | F10; becomes Must if approved teaching or assessment assignment depends on groups. |
| Should | Ticket interface, broader reports/export, richer discovery/search | F22/F20/F07; basic reporting/escalation route remains Must even if ticket UI is deferred. |
| Could | Live sessions, advanced attendance, advanced question types, richer analytics and optional notification channels | F11 and expansions of F13/F19/F20; only if owner selects them. |

## Candidate deferrals, not approved exclusions

Live meeting delivery, advanced adaptive learning, recommendation engines, gamification, offline mode, native mobile apps, multi-currency, automatic recurring billing, teacher payouts, certificates, and bulk data imports have no approved launch requirements in the supplied material. Decide inclusion or exclusion explicitly if stakeholders expect them. Deferring any baseline module requires a recorded scope decision; a table listing alone does not mandate its complete feature set.

Multi-tenant SaaS is outside the approved first-version model. Changing that model requires an explicit baseline change. Alternative database/auth/file-storage architecture is outside this review.

## Dependency order for requirements closure

1. Confirm sources, owners, audience, jurisdiction, release model and curriculum (D01–D04, D22).
2. Define identity, guardians, roles, teacher assignment and account/access lifecycle (D05–D11).
3. Define learning modes, progress, assessment, commercial and payment lifecycles (D12–D16).
4. Set exposure, file/video, notification, reporting, service and operating constraints (D17–D24).
5. Approve selected release scope and its acceptance scenarios; hand off only when separately authorized.

This is a dependency sequence for documentation review, not an implementation plan. No later phase begins automatically after approval.
