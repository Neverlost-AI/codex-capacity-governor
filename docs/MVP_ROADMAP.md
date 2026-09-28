# Codex Capacity Governor MVP Roadmap

## Document status and authority

This is the founder-reviewable master roadmap for the Codex Capacity Governor MVP. It describes sequencing, dependencies, decision gates, evidence, and possible ownership lanes. It is a planning and governance document only.

**Roadmap inclusion is not implementation authorization.** T001-T006 are accepted; Gate A and Gate B are closed. T005's manual, local, cold-start implementation was merged through PR #11 and T006's outcome/history implementation through PR #13. See [project status](PROJECT_STATUS.md). The founder selected three public builds for T007's initial sample and directed a private-hosted prerequisite. The [T007 protocol](TRANCHE_007_INTERNAL_TESTING_AND_LOCAL_RELEASE_DRAFT.md), [hosted foundation](TRANCHE_007_PRIVATE_HOSTED_FOUNDATION_DRAFT.md) and [starter freeze](T007_PUBLIC_CHALLENGE_FREEZE_DRAFT.md) remain founder-review drafts, not implementation, provisioning, measured-run, demo-publication or release grants. Only explicit founder grants and accepted baselines authorize those distinct stages.

The progress table below supersedes historical readiness and ownership statements
in the original tranche descriptions. Accepted assignments and decision records
remain controlling. This update preserves the full MVP sequence rather than
treating T005 as the whole product.

The founder retains ownership of product meaning, Governor policy rules, forecasting method, reserve philosophy, prioritization, and acceptance. Codex and technical collaborators may research or propose options, but they must not silently decide founder-controlled semantics.

## Controlling MVP outcome

The MVP must prove this complete loop:

```text
Product brief or bounded tranche
→ available Codex budget
→ preflight analysis
→ forecast
→ Governor policy
→ optimized execution plan
→ development run
→ actual usage and outcome
→ forecast-versus-actual comparison
→ improved future planning
```

Codex is the first supported coding agent, while platform-specific assumptions remain behind adapters. Manual capacity and budget entry is a first-class pathway and must work without an AI analysis provider or automated platform connection.

## Product invariants

- Capacity is a finite development budget.
- Validation and correction/recovery capacity are protected rather than treated as leftovers.
- Work is affordable only when implementation, reasonable correction, and required validation fit within the permitted budget.
- Forecasts are planning ranges, not guarantees.
- AI may characterize work; deterministic Governor policy decides what is permitted.
- Manual inputs remain supported throughout the MVP.
- Platform-specific assumptions belong behind adapters.
- Forecast, policy, configuration, and outcome evidence must remain auditable.
- Negative results and poor forecasts are retained rather than hidden.
- No savings, productivity, accuracy, or commercial-validation claim is made without supporting evidence.

## Readiness vocabulary

| State                         | Meaning                                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FULLY_SPECIFIED`             | A bounded assignment exists with explicit acceptance and stop conditions. Implementation still requires the assignment to be approved and granted to an owner.                |
| `IMPLEMENTATION_READY_DRAFT`  | The intended vertical slice is defined well enough to convert into an exact assignment after its dependencies and named founder decisions are resolved. It is not authorized. |
| `ARCHITECTURE_READY`          | Purpose, boundaries, interfaces, and evidence are understood at roadmap level, but an implementation assignment and possibly founder decisions are still required.            |
| `BLOCKED_ON_FOUNDER_DECISION` | Implementation must not begin until the named founder gate is resolved and recorded.                                                                                          |
| `OUTCOME_DEFINED`             | The validation activity and evidence sought are defined; engineering and operational prerequisites remain subject to separate approval.                                       |
| `POST_MVP`                    | Explicitly excluded from the required MVP.                                                                                                                                    |

`ACCEPTED` records completed founder acceptance; `CLOSED` records an accepted
founder gate. Neither state grants new implementation authority.
`CURRENT_COLLABORATOR_TRANCHE` was the original T001 execution marker; it is not
an active future assignment. Future ownership labels remain planning guidance.

## Roadmap at a glance

| Stage                                                 | Readiness                        | Primary role in the MVP                                                                     | Suggested ownership lane         |
| ----------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| Tranche 001 — Manual Preflight Draft                  | `ACCEPTED`                       | Project/manual-draft persistence, validation, UI and tests.                                 | Accepted foundation              |
| Tranche 002 — Run and Outcome History Foundation      | `ACCEPTED`                       | Factual UNGUIDED run/outcome capture with append-only amendments.                           | Accepted foundation              |
| Founder Decision Gate A — Governor Policy Semantics   | `CLOSED`                         | Decision 0002 governs multi-bucket policy semantics.                                        | Founder                          |
| Tranche 003 — Deterministic Governor Policy Engine V1 | `ACCEPTED`                       | Pure policy engine; PR #3 merged.                                                           | Accepted foundation              |
| Founder Decision Gate B — Forecasting Method          | `CLOSED`                         | Decision 0003 governs forecast method and composition mapping.                              | Founder                          |
| Tranche 004 — Forecast Engine V1                      | `ACCEPTED`                       | Pure forecast/projection/comparison; PR #7 merged.                                          | Accepted foundation              |
| Tranche 005 — Complete Capacity Preflight             | `ACCEPTED`                      | Manual local cold-start composition; F1-F9 accepted; PR #11 merged.                          | Accepted foundation              |
| Tranche 006 — Governed Outcomes and Comparison        | `ACCEPTED`                       | First-prototype outcomes, comparison and factual history; loader deferred; PR #13 merged. | Accepted foundation |
| Tranche 007 — Internal measurement and release evidence | `OUTCOME_DEFINED` | Founder-selected TodoMVC, URL Shortener and Exercise Tracker builds after a separately approved private-hosted foundation; exact run setup and budget still pending. | Founder + Codex |
| Tranche 008 — Hosted External Pilot                   | `OUTCOME_DEFINED`                | Collect exploratory evidence from approximately 3–5 developers for about one week.          | Shared                           |

The ordering above expresses dependency and learning sequence, not a promise that every stage is one pull request or that work may begin automatically.

---

## Tranche 001 — Manual Preflight Draft

### 1. Tranche name

Manual Preflight Draft.

### 2. Purpose

Establish the first bounded vertical slice and the first technical-collaboration test. It creates the conventional web/test foundation and proves that a project and manual preflight draft can move through UI, application, and persistence boundaries without forecasting or Governor policy.

The authoritative assignment is [Tranche 001: Manual Preflight Draft](TRANCHE_001_MANUAL_PREFLIGHT_DRAFT.md). This roadmap does not redefine or expand it.

### 3. Readiness state

`FULLY_SPECIFIED` + `CURRENT_COLLABORATOR_TRANCHE`.

### 4. Dependencies

- Founder-approved repository baseline.
- Existing architecture contracts and development workflow.
- No dependency on either founder decision gate.

### 5. Founder decisions required

No new product-policy decision is delegated to the collaborator. Any contract ambiguity that would require new budget, reserve, reset, forecast, or policy semantics is a blocker under the existing assignment.

### 6. User-visible completion condition

A user can create a project, create and save its manual preflight draft, and reopen both with accessible validation and understandable error states.

### 7. Expected architectural surfaces

The exact allowed surfaces are defined in the existing assignment. In summary: pnpm/Next.js/test bootstrap, contracts and runtime schemas, application use cases and repository ports, PostgreSQL/Drizzle persistence for `Project` and `PreflightDraft` only, focused UI, migrations, tests, and local documentation.

### 8. Explicit exclusions

All exclusions in the existing assignment apply, including forecasting, confidence, Governor policy, reserve calculations, reset/defer semantics, AI analysis, platform account access, Claude Code, billing, deployment, and new product semantics.

### 9. Required test/evidence categories

Schema/unit, application, PostgreSQL integration, accessible UI, one Playwright create → save → reopen test, and repository format/lint/type/build/migration checks, as specified in the assignment.

### 10. Acceptance gate

Founder + Codex review of the collaborator pull request results in one of:

- `ACCEPT`
- `ACCEPT WITH REVISION`
- `HOLD`
- `STOP`

Future collaborator work is conditional on this review. `ACCEPT WITH REVISION` requires the revision boundary and acceptance evidence to be recorded before the tranche is treated as accepted.

### 11. What it unlocks next

An accepted application/persistence/testing pattern and the factual basis for converting Tranche 002 into a bounded assignment.

### 12. Suggested ownership lane

Technical collaborator, under the already approved Tranche 001 assignment. This assignment is intentionally the first bounded test of code quality, architecture adherence, communication, scope discipline, independence, testing discipline, and collaboration fit.

Neverlost OS participation or work is a completely separate decision and has no bearing on this repository or review.

---

## Tranche 002 — Run and Outcome History Foundation

### 1. Tranche name

Run and Outcome History Foundation.

### 2. Purpose

Establish an auditable foundation for recording a development run and what happened, without calculating a forecast or making a Governor decision. The foundation should later support linking a governed plan to an actual outcome, but it must not fabricate governance data before Tranches 003–005 exist.

### 3. Readiness state

`IMPLEMENTATION_READY_DRAFT`.

This stage may be converted into a bounded implementation assignment only after Tranche 001 is accepted and the founder resolves the outcome vocabulary needed by that assignment.

### 4. Dependencies

- Accepted Tranche 001 application, contract, persistence, migration, and test patterns.
- Stable persisted identifiers for `Project` and the accepted preflight concept.
- Founder approval of the minimum outcome vocabulary listed below.

### 5. Founder decisions required

Before assignment conversion, approve the minimum semantics for:

- whether `COMPLETED`, `PARTIAL`, and `FAILED` are exhaustive run outcomes and how each is determined;
- validation-result vocabulary and whether validation may be not run, partial, or inconclusive;
- capacity categories recorded as actual consumption, without yet deciding normalization or policy arithmetic;
- the meaning of “remaining capacity” when entered manually and whether it is recorded, derived, or both;
- how corrections, unexpected failures, deferred work, and notes are distinguished;
- whether a run may exist before a governed plan and, if so, how it is explicitly marked as unguided or manually planned;
- whether run/outcome corrections are append-only events, versioned amendments, or another auditable model.

These decisions refine recording semantics only. They must not decide Gate A policy rules or Gate B forecast rules by implication.

### 6. User-visible completion condition

A user can open a project/preflight, create a development-run record using only approved recording fields, record actual consumption and an outcome, and view the project’s run history. The experience accurately distinguishes unavailable future governance data from recorded facts.

### 7. Expected architectural surfaces

- `packages/contracts` runtime and compile-time recording contracts.
- `packages/application` run/outcome commands, queries, and repository ports.
- Persistence adapter and reviewed migrations for the minimum approved run/outcome records.
- `apps/web` record/view history flows and accessible errors.
- Audit/version metadata needed to preserve corrections and negative outcomes.
- Focused documentation and tests.

The final tables, names, and field optionality belong in the separately approved assignment and reviewed migration proposal.

### 8. Explicit exclusions

- Forecast generation, confidence scoring, forecast error, or calibration.
- Governor modes, primary decisions, allocations, reserve math, and optimized guidance.
- Automated execution or coding-agent monitoring.
- AI analysis and platform account/capacity integration.
- Analytics dashboards, cross-project benchmarking, or claims derived from run history.
- Authentication, hosting, billing, or enterprise audit features beyond a separately approved need.

### 9. Required test/evidence categories

- Contract/schema tests for approved outcome and consumption inputs.
- Application tests for create, record outcome, reopen history, not-found, invalid transition, and repository-failure behavior.
- Migration and PostgreSQL integration tests for relationships, ordering, round-trip fidelity, and audit preservation.
- UI/accessibility tests for run entry, outcome entry, empty history, invalid input, and server failure.
- A critical browser flow covering project/preflight → run → outcome → reopened history.
- Compatibility review against Tranche 001 data and migrations.

### 10. Acceptance gate

A later bounded assignment must be founder-approved. Its pull request must prove that only approved recording semantics were implemented, historical evidence is not silently overwritten, Tranche 001 behavior remains intact, and no forecast or policy result is generated.

### 11. What it unlocks next

Durable outcome evidence for later governed runs, Tranche 006 comparison/calibration, and dogfooding. It does not itself unlock policy implementation; Gate A does.

### 12. Suggested ownership lane

Shared. This is not preassigned to the current collaborator. Ownership is decided only after the Tranche 001 review.

---

## Founder Decision Gate A — Governor Policy Semantics

### Gate type

Founder product-decision gate; **not a coding tranche**.

### Purpose

Define the versioned, deterministic rules that decide what work is permitted for a given normalized budget, forecast, reset context, reserve requirement, and uncertainty state. Codex or a collaborator may prepare options, examples, boundary tables, and trade-off analysis. The founder must approve the semantics.

### Required founder decisions

1. **Canonical capacity unit:** the internal unit used by policy and which manually entered source units are supported.
2. **Budget normalization:** conversion authority, precision, rounding, comparability, unknown/unconvertible inputs, and retention of raw values.
3. **Implementation allocation/reserve:** whether implementation is a residual allocation or explicit reserve, plus minimums and override behavior.
4. **Correction/recovery reserve:** fixed or proportional behavior, minimums, risk/uncertainty influence, and when it may be consumed.
5. **Validation reserve:** minimum required validation capacity, validation-tier influence, protection rules, and override behavior.
6. **Reset timing semantics:** exact versus uncertain windows, timezones, rolling resets, missing reset data, and effect on current affordability.
7. **Defer semantics:** when future reset availability justifies `DEFER`, how long deferral remains valid, and what re-preflight is required.
8. **Operating-mode thresholds:** exact boundary behavior for `FULL`, `CONSERVATION`, `LOW`, and `CRITICAL`.
9. **Primary-decision rules:** conditions for `PROCEED`, `NARROW`, `DEFER`, and `STOP / PRESERVE`.
10. **Policy precedence:** which safety rule wins when mode, affordability, reset timing, reserves, validation, or user preference conflict.
11. **Stop conditions:** mandatory conditions that prohibit new work or require preservation/handoff.
12. **Treatment of uncertainty:** conservative margins, missing inputs, invalid forecasts, confidence influence, and fail-safe behavior.
13. **Override and audit semantics:** whether any founder/user override exists, what cannot be overridden, and what explanation/evidence is recorded.

### Gate artifact and acceptance

The gate closes only when approved semantics are recorded in versioned decision records with:

- a terms/data dictionary;
- decision tables covering normal and exact-boundary cases;
- precedence and fail-safe rules;
- worked examples, including conflicting signals and insufficient information;
- explicit invariants and non-overridable stop conditions;
- policy configuration/versioning expectations;
- founder approval date and owner.

Closing Gate A authorizes neither code nor Tranche 003 by itself. A separate bounded assignment is still required.

---

## Tranche 003 — Deterministic Governor Policy Engine V1

### 1. Tranche name

Deterministic Governor Policy Engine V1.

### 2. Purpose

Implement the founder-approved Gate A rules as a pure, deterministic, auditable engine that answers what work is permitted. The engine must produce the same result for the same valid input and versioned configuration.

### 3. Readiness state

`ARCHITECTURE_READY` + `BLOCKED_ON_FOUNDER_DECISION` (Gate A).

### 4. Dependencies

- Closed Founder Decision Gate A.
- Stable contracts for normalized policy input and versioned configuration.
- A separate founder-approved Tranche 003 assignment.
- Tranche 001 patterns where relevant; Tranche 002 is useful for later persistence but not required for pure engine development.

### 5. Founder decisions required

Every Gate A decision. No implementer may infer thresholds, reserve rules, precedence, stop rules, or uncertainty behavior from examples alone.

### 6. User-visible completion condition

Through a minimal approved demonstration or later composed UI, an approved policy input yields exactly one operating mode (`FULL`, `CONSERVATION`, `LOW`, or `CRITICAL`) and one primary decision (`PROCEED`, `NARROW`, `DEFER`, or `STOP / PRESERVE`), with allocations, reasons, guidance, and explicit stop conditions traceable to versioned rules.

### 7. Expected architectural surfaces

- `packages/policy-engine` pure domain types/functions and versioned configuration.
- `packages/contracts` policy input/output schemas where shared boundaries require them.
- Deterministic unit and property/invariant tests.
- Optional application-level adapter for invoking the engine, only if included in the later assignment.

Expected architectural input families are normalized available/allocated capacity, reset context, forecast range/confidence, required validation context, reserve preferences/requirements, uncertainty indicators, and policy version. Expected output families are mode, primary decision, implementation/correction/validation allocation, reasons with rule identifiers, optimization constraints/guidance, stop conditions, and policy version.

### 8. Explicit exclusions

- UI design, persistence schema, AI analysis, platform-specific adapters, and forecasting logic.
- Invented or hard-coded unapproved thresholds.
- Hidden model calls, probabilistic authorization, or provider-specific capacity retrieval.
- Outcome recording and calibration.

### 9. Required test/evidence categories

- Decision-table tests for every approved rule and precedence path.
- Exact-boundary and adjacent-value tests for every threshold.
- Invariant/property tests for reserve protection and single-decision/single-mode outputs.
- Invalid, missing, incompatible-unit, low-confidence, and uncertain-reset tests with approved fail-safe behavior.
- Determinism tests and configuration-version fixtures.
- Explainability tests tying every result to stable rule identifiers and input facts.
- Mutation or equivalent coverage evidence for critical safety branches where practical.

### 10. Acceptance gate

Founder review confirms exact agreement with approved Gate A tables, conservative failure behavior, explainability, deterministic repeatability, pure dependency boundaries, and no policy semantics outside the approved record.

### 11. What it unlocks next

The policy side of Complete Capacity Preflight and a stable consumer interface for Forecast Engine V1. It does not produce a useful forecast by itself.

### 12. Suggested ownership lane

Founder + Codex because the logic encodes founder-controlled product policy. This is guidance only; no implementation is currently authorized.

---

## Founder Decision Gate B — Forecasting Method

### Gate type

Founder product-decision gate; **not a coding tranche**.

### Purpose

Define Forecast Engine V1 as a transparent planning method that produces useful ranges without false precision. Codex or a collaborator may propose methods, evaluate examples, and expose trade-offs; the founder approves the method and meanings.

### Required founder decisions

1. **Initial forecasting method:** rule-based, reference-class, weighted task decomposition, or an approved combination.
2. **Range semantics:** what low, expected, and high mean, including any percentile-like interpretation and whether bounds must be monotonic.
3. **Confidence semantics:** levels, determining factors, display language, and what confidence does not claim.
4. **Task inputs:** approved complexity/risk taxonomy, validation burden, dependencies, novelty, context, and correction exposure.
5. **Historical calibration inputs:** which prior runs are comparable, minimum data quality, recency, configuration/version compatibility, and outlier treatment.
6. **Insufficient-history behavior:** cold-start assumptions, conservative widening, minimum confidence, and manual fallback.
7. **Configurable assumptions:** rates, weights, ranges, provenance, defaults, override authority, and versioning.
8. **Forecast-error calculation:** comparison point(s), signed versus absolute error, unit compatibility, treatment of partial/failed runs, and aggregation limits.
9. **Uncertainty disclosure:** explicit assumptions, unknowns, rounding, range width, and language that prevents a guarantee interpretation.
10. **Calibration use:** how recorded evidence may adjust future inputs without becoming opaque or claiming advanced machine learning.

### Gate artifact and acceptance

The gate closes only when the method is recorded with:

- input/output definitions and invariants;
- worked cold-start and history-informed examples;
- range/confidence/error formulas or decision procedures;
- comparable-run criteria and exclusions;
- configurable values with provenance and versioning;
- explicit no-false-precision and no-guarantee presentation rules;
- founder approval date and owner.

Closing Gate B authorizes neither code nor Tranche 004 by itself. A separate bounded assignment is still required.

---

## Tranche 004 — Forecast Engine V1

### 1. Tranche name

Forecast Engine V1.

### 2. Purpose

Implement the approved Gate B method as a transparent, deterministic planning engine that produces a low/expected/high capacity range, confidence, and explicit assumptions for policy consumption.

### 3. Readiness state

`ARCHITECTURE_READY` + `BLOCKED_ON_FOUNDER_DECISION` (Gate B).

### 4. Dependencies

- Closed Founder Decision Gate B.
- Reviewed task/scope characterization and manual fallback contracts.
- Stable capacity-quantity contract compatible with Gate A normalization where policy composition is tested.
- A separate founder-approved Tranche 004 assignment.
- Tranche 002 history contracts only for history-informed behavior; V1 must retain an approved cold-start path.

### 5. Founder decisions required

Every Gate B decision, plus confirmation that any Gate A capacity representation consumed by policy is compatible with forecast outputs.

### 6. User-visible completion condition

For a reviewed work characterization, a user receives low, expected, and high estimates, confidence, explicit assumptions/unknowns, and a method/configuration version. Presentation communicates a planning range rather than a guarantee and does not imply unsupported accuracy.

### 7. Expected architectural surfaces

- `packages/forecast-engine` pure forecasting/calibration-input logic.
- `packages/contracts` forecast, assumption, task-characterization, and configuration schemas.
- Optional application orchestration ports for loading comparable history.
- Focused tests and method/version documentation.

The output interface must be cleanly consumable by `packages/policy-engine` without either engine importing UI, persistence, AI-provider, or platform-adapter code.

### 8. Explicit exclusions

- Governor mode/decision/reserve logic.
- UI composition beyond any separately approved demonstration.
- AI-only task analysis; a manual characterization path is required.
- Advanced machine learning, opaque online learning, unsupported accuracy claims, and cross-platform normalization.
- Provider-specific capacity retrieval.

### 9. Required test/evidence categories

- Approved worked-example and formula/procedure tests.
- Range-ordering, non-negative-value, rounding, and unit-compatibility invariants.
- Cold-start, insufficient-history, incomparable-history, and outlier cases.
- Confidence and assumption-provenance tests.
- Determinism and configuration-version tests.
- Forecast-error calculation tests for approved completed/partial/failed handling.
- Interface contract tests against policy inputs without embedding policy rules.

### 10. Acceptance gate

Founder review confirms agreement with Gate B, no false precision, traceable assumptions, deterministic/versioned output, clean policy interface, manual fallback, and no unsupported performance claim.

### 11. What it unlocks next

Composition of forecast with deterministic policy in Tranche 005 and quantitative comparison in Tranche 006.

### 12. Suggested ownership lane

Founder + Codex for the first method implementation and verification. This is guidance only; no implementation is currently authorized.

---

## Tranche 005 — Complete Capacity Preflight

### 1. Tranche name

Complete Capacity Preflight.

### 2. Purpose

Compose accepted project/preflight entry, task/scope characterization, Forecast Engine V1, and Governor Policy Engine V1 into the first recognizable Governor experience.

### 3. Readiness state

F1-F9 are founder-accepted in the finalized
[T005 assignment](TRANCHE_005_COMPLETE_CAPACITY_PREFLIGHT.md), and PR #11 was
accepted and merged. This paragraph updates current status; the older detailed
stage description below retains its planning context. T005 is manual, local and
cold-start: one part of preflight → outcome → comparison, not the complete
prototype or product loop.

### 4. Dependencies

- Accepted Tranche 001.
- Closed Gates A and B.
- Accepted Tranches 003 and 004.
- Approved runtime contracts and persistence changes for forecasts, policy results, and configuration/version snapshots.
- Tranche 002 only where run/history linkage is included; preflight generation itself should not require an existing run.

### 5. Founder decisions required

- Minimum task/scope characterization required for a valid preflight.
- Whether MVP AI-assisted characterization is included, optional, or deferred; manual characterization must work regardless.
- Which optimization guidance families appear in V1 and how they relate to deterministic rule explanations.
- User review/edit/confirmation points before a governed plan becomes final.
- Preflight expiration/re-evaluation rules when budget, reset timing, scope, forecast configuration, or policy version changes.

The latest founder review accepted the draft's F1-F7: full existing manual
taxonomy and immutable scope revisions, AI deferred, confirm inputs before
evaluation/save, existing explanation/guidance only, historical reopened results,
immutable negative/positive evaluation evidence, and cold start with governed
outcomes/history in T006. F8's single-operator local boundary and F9's source
precedence are now accepted. Broader first-MVP feature placement is not decided
by accepting this manual slice.

The original V0.1 and later V0.2 Product Briefs have been located and read. See
[source reconciliation](PRODUCT_BRIEF_RECONCILIATION.md). Their discovery does
not expand T005 or override accepted Gate A/B decisions.

### 6. User-visible completion condition

A user provides project/tranche information, available or allocated capacity, reset timing, and optional reserve preferences. After reviewing task/scope characterization, the Governor returns:

- low, expected, and high forecast;
- forecast confidence and explicit assumptions;
- operating mode;
- one primary policy decision;
- implementation allocation;
- correction reserve;
- validation reserve;
- optimization guidance; and
- explicit stop conditions.

The full path works with manual characterization and manual capacity input when AI analysis and platform adapters are unavailable.

### 7. Expected architectural surfaces

- `apps/web` preflight review and result experience.
- `packages/application` orchestration and transactional persistence ports.
- `packages/contracts` composed preflight/plan schemas.
- `packages/forecast-engine` and `packages/policy-engine` as independent invoked engines.
- Persistence adapter/migrations for reviewed characterization, forecast, governed plan, and versioned inputs/configuration.
- Optional `packages/ai-analysis` adapter behind a reviewable structured-output boundary if separately approved.

### 8. Explicit exclusions

- Automatic Codex balance retrieval, private credentials/cookies, or undocumented APIs.
- Claude Code or cross-platform normalization.
- Automatic development execution or enforcement inside Codex.
- Outcome calibration beyond recording the governed plan reference.
- Billing, enterprise policy, production deployment, and unsupported benefit claims.
- AI authority to make the policy decision.

### 9. Required test/evidence categories

- Contract and application composition tests across manual input → forecast → policy → stored plan.
- Engine-version and input-snapshot persistence tests.
- UI/accessibility tests for edit/review/result/error states.
- End-to-end tests for at least one allowed path and each primary conservative/stop family represented by approved fixtures.
- AI-adapter failure/absence tests if AI assistance is included, proving manual fallback.
- Stale-preflight/re-evaluation tests under approved rules.
- Regression coverage for all prerequisite tranche behavior.

### 10. Acceptance gate

Founder review confirms the user-visible result matches approved Gate A/B semantics; every result is traceable to inputs and versions; manual-only operation works; AI cannot authorize work; and no platform-private or post-MVP behavior was introduced.

### 11. What it unlocks next

A complete governed preflight and immutable comparison baseline for Tranche 006, plus the recognizable product flow needed for dogfooding.

### 12. Suggested ownership lane

Shared: founder/Codex own semantic composition and acceptance; a technical collaborator may own a later explicitly assigned UI/application integration slice. No future collaborator assignment is implied.

---

## Tranche 006 — Outcome and Calibration Loop

### 1. Tranche name

Governed Outcomes and Comparison (founder-accepted first-prototype T006 scope).
The prior “Outcome and Calibration Loop” label bundled an automatic loader;
Decision 0006 places that loader outside T006 without removing it from the
fuller product.

### 2. Purpose

Record what actually happened after a governed bounded development run, compare
it with the original issued forecast when compatible, and make factual history
queryable. Normal coding, testing, fixes, prompts and agent handoffs within that
same bounded run do not require new evaluations. T006 does **not** load history
into later forecasts; a separately assigned fuller-product loader requires a
founder-approved method decision.

### 3. Readiness state

`ACCEPTED` implementation, merged through PR #13. The original assignment's
pre-implementation authority language is historical, not current status.
[Decision 0006](decisions/0006-t006-governed-outcome-recording-v1.md) accepts
T6-1–T6-7 and the bounded-run clarification. The [assignment](TRANCHE_006_GOVERNED_OUTCOMES.md)
states the tests and stop conditions. Concern 001 now blocks the loader, not
outcome-only T006. T007's private-hosted foundation, measured attempts and any
release or public demo require separate founder approvals.

### 4. Dependencies

- Accepted Tranche 002 history foundation.
- Accepted Tranches 004 and 005 with immutable forecast/plan inputs and versions.
- Closed Gate B forecast-error and comparable-history decisions.
- Founder-approved outcome vocabulary from Tranche 002 assignment conversion.

### 5. Accepted T006 semantics and later decisions

- T6-1–T6-7 in Decision 0006 settle governed linkage, one bounded run per saved
  evaluation, explicit operator-reported adherence, directly reviewed per-bucket
  percent/bp actuals, append-only amendments and completed-run comparison.
- Existing Decision 0001 run/validation vocabulary remains intact; remaining
  capacity is a factual snapshot, not a derived reconciliation.
- History-informed future forecasts remain outside T006. Decision 0005's
  baseline-denominator direction is draft; V1/V2 compatibility, zero/confidence
  rules and historical reset-cycle comparison need a separate method decision
  before any loader.

### 6. User-visible completion condition

A user opens an immutable governed attempt, records factual consumption,
outcome, validation, remaining snapshot, unexpected failures and deferred work,
and sees a transparent per-bucket comparison when actuals are reviewed and
compatible. Approved adherence evidence is displayed distinctly from the
settled T002 recording vocabulary. Factual/amended history is queryable;
future forecasts remain cold-start in T006. A history loader is separately
assigned after its method decisions.

### 7. Expected architectural surfaces

- `packages/contracts` governed linkage, outcome, comparison, adherence, and reviewed-normalization schemas.
- `packages/application` record/amend outcome, compare, and history-query use cases.
- `packages/forecast-engine` existing pure comparison semantics; a loader/V2 engine change only under a separate approved scope.
- Persistence adapter/migrations preserving original forecast/plan/outcome facts and revisions.
- `apps/web` outcome capture and comparison/history views.

### 8. Explicit exclusions

- Opaque or advanced machine-learning calibration.
- Claims of accuracy improvement without sufficient evidence.
- Automatic coding-agent usage ingestion or private balance retrieval.
- Cross-user benchmarking, leaderboards, advanced analytics, billing, or enterprise reporting.
- Rewriting or deleting negative outcomes to improve reported performance.

### 9. Required test/evidence categories

- Outcome schema and transition/amendment tests.
- Forecast-error and remaining-capacity tests using approved semantics.
- Comparable/incomparable prior-run tests and no-history behavior.
- Persistence audit/history tests proving original snapshots and negative results remain recoverable.
- Application and UI tests for completed, partial, failed, validation, failure, deferred-work, and adherence states.
- End-to-end governed plan → outcome → comparison → historical reopen flow.
- If separately approved, loader/V2 tests for later preflight history input,
  recursive-bias regression, compatibility and deterministic replay.
- Regression tests proving policy decisions are not retrospectively mutated.

### 10. Acceptance gate

Founder review confirms comparison math matches Gate B, evidence remains
auditable, incomplete and negative outcomes are visible, and no accuracy claim
exceeds recorded evidence. Automatic calibration is **not** part of T006 and
needs a later versioned method decision and separate implementation grant.

### 11. What it unlocks next

The first-prototype outcome/history path and structured evidence for a separately
approved T007 dogfooding protocol. A [small proposed T007 protocol](T006_CALIBRATION_AND_MILESTONES_DRAFT.md)
now defines real internal episodes, controlled edge-case rehearsals and local
release criteria for founder review; it is not approved. A future
history-informed forecast loader is still needed for the fuller product and is
not included in T006.

### 12. Suggested ownership lane

Shared. Founder/Codex own evidence semantics and calibration acceptance; later implementation slices may be delegated only through separate assignments.

---

## Tranche 007 — Internal Measurement and Release Evidence

### 1. Tranche name

Internal Measurement and Release Evidence (original roadmap name: Governor Dogfooding).

### 2. Purpose

The original outcome was to use Codex Capacity Governor to govern development of Codex Capacity Governor, testing whether the product supports real planning and whether its records are complete enough to learn from. The founder has now **selected TodoMVC, URL Shortener and Exercise Tracker as the three initial T007 builds**, classified medium/medium/large, with URL restart persistence included. This supersedes the original *initial sample*, not the fact that public builds are different from Governor self-development. Do not claim these three supply self-development evidence; any later such use is separately identified. The [current T007 protocol](TRANCHE_007_INTERNAL_TESTING_AND_LOCAL_RELEASE_DRAFT.md) places a separately approved [private hosted foundation](TRANCHE_007_PRIVATE_HOSTED_FOUNDATION_DRAFT.md) and security verification before any measured attempt. Exact starter/test/profile/budget freeze and execution grants remain pending. T007 remains a product-validation stage with separately approved governed runs rather than one engineering tranche.

### 3. Readiness state

`OUTCOME_DEFINED`.

### 4. Dependencies

- Stable accepted Tranches 005 and 006.
- Closed Gates A and B with versioned policy/forecast methods.
- A separately approved founder-only hosted access/storage/record-isolation foundation, verified before measurement; existing local pairing must not be network-exposed.
- A defined dogfooding protocol and a bounded development tranche suitable for each run.
- Reliable manual budget and actual-outcome entry.

### 5. Founder decisions required

- Number and diversity of internal runs needed before external pilot consideration.
- Required validation level and evidence completeness per run.
- What constitutes useful guidance, material behavioral change, and an unacceptable failure.
- How protocol changes or policy/forecast version changes divide evidence cohorts.
- Criteria to revise, hold, or stop rather than continue gathering confirming evidence.

### 6. User-visible completion condition

For each governed internal development run, the system captures:

**Before:** proposed tranche, available budget, forecast range, confidence, policy decision, operating mode, reserves, optimization recommendations, stop conditions, and relevant versions.

**After:** actual usage, outcome, validation result, remaining capacity, unexpected failures, whether recommendations were followed, forecast error, and deferred work.

The founder can review individual runs and the aggregate evidence without losing negative or incomplete cases.

### 7. Expected architectural surfaces

- Primarily the accepted product, operating protocol, evidence exports/reports, and issue/tranche documents.
- Only separately approved fixes required for evidence integrity or blocking usability defects.
- No automatic permission for new features or broad analytics.

### 8. Explicit exclusions

- Selecting only successful runs or rewriting negative evidence.
- Claiming statistically demonstrated savings, productivity, or accuracy.
- External users, billing, enterprise controls, or new coding-agent integrations.
- Expanding the product merely to make the dogfooding result appear favorable.

### 9. Required test/evidence categories

- Complete before/after record for every included run.
- Reproducible calculation/version evidence for forecast and policy.
- Validation evidence tied to the actual development result.
- Recommendation-followed and deviation notes.
- Forecast-error and data-quality checks.
- Qualitative usefulness/friction notes and documented product defects.
- Explicit retention of partial, failed, stopped, and abandoned runs.

### 10. Acceptance gate

Dogfooding is sufficient to consider an external pilot only when:

- the complete preflight → plan → outcome → comparison loop works reliably;
- no unresolved defect risks corrupting or losing run evidence;
- policy results and stop conditions are understandable and auditable;
- manual input remains usable;
- the team has multiple complete runs across more than one work shape or an explicit founder rationale for less;
- observed forecast errors and failure modes are documented, not hidden;
- product usefulness and workflow friction are assessed with concrete evidence;
- the founder explicitly approves pilot preparation.

These are learning signals, not proof of commercial or performance success.

### 11. What it unlocks next

An evidence-backed founder decision to revise the Governor, continue dogfooding, hold/stop, or prepare the Hosted External Pilot.

### 12. Suggested ownership lane

Founder + Codex for protocol ownership and evidence review. Technical help, if any, requires a separately approved bounded assignment.

---

## Tranche 008 — Hosted External Pilot

### 1. Tranche name

Hosted External Pilot.

### 2. Purpose

Run an exploratory hosted pilot with approximately 3–5 developers for approximately one week, using one real governed development run as the primary evidence unit. The aim is to learn about usefulness, behavior, reliability, and willingness to return—not to establish statistically strong claims.

### 3. Readiness state

`OUTCOME_DEFINED`.

### 4. Dependencies

- Founder acceptance of dogfooding evidence and explicit pilot authorization.
- Stable complete MVP loop with no evidence-integrity or safety blocker.
- Founder decisions on deployment target, authentication/tenancy, privacy, consent, retention, deletion, support, and incident response.
- Tested hosted environment, backups/recovery, monitoring, and pilot operations.
- Participant brief, feedback protocol, and exit criteria.

### 5. Founder decisions required

- Pilot inclusion criteria and participant count/duration.
- Hosting provider and cost ceiling.
- Minimal authentication and tenant isolation appropriate for external users.
- Data classification, consent, retention, deletion, export, and access policy.
- Whether any product brief may be sent to an AI provider; manual operation must remain available.
- Support channel, incident owner, stop authority, and response expectations.
- Voluntary feedback questions, including willingness-to-pay without coercion.
- Criteria for pilot completion, extension, pause, or termination.

### 6. User-visible completion condition

Invited participants can securely use the hosted Governor for real, bounded development tranches and complete the preflight, governed-plan, outcome, and comparison loop. They can understand manual entry, decisions, limitations, data handling, and how to report issues or request deletion.

### 7. Expected architectural surfaces

- Accepted MVP application and data model.
- Minimal hosted configuration, authentication/tenant isolation, backup/recovery, monitoring, privacy/consent, and deletion/export paths required by the approved pilot protocol.
- Pilot onboarding, support, and evidence collection materials.
- Any engineering work must be divided into separately approved bounded tranches.

### 8. Explicit exclusions

- Production-scale or enterprise deployment.
- Billing, paid-plan enforcement, enterprise policy, or broad team administration.
- Private Codex balance retrieval, undocumented APIs, or participant credential/cookie collection.
- Claude Code, multi-agent comparison, cross-platform normalization, or advanced analytics.
- Claims of statistically significant savings, productivity, accuracy, product-market fit, or commercial validation.

### 9. Required test/evidence categories

Minimum per governed run:

- forecast range, confidence, assumptions, and configuration version;
- policy mode, primary decision, allocations/reserves, guidance, stop conditions, and policy version;
- actual consumption, outcome, validation result, remaining capacity, unexpected failures, deferred work, and guidance-followed state;
- forecast-error calculation and data-quality/completeness status;
- usefulness feedback, behavioral-change signal, willingness-to-use-again, and voluntarily provided willingness-to-pay signal.

Minimum product/operational evidence:

- critical-path browser tests in the hosted-like environment;
- access isolation, privacy/deletion, backup/recovery, and failure-path verification;
- incident and support log;
- participant/run denominator, including incomplete and withdrawn cases;
- preserved negative and contradictory evidence.

### 10. Acceptance gate

External users are invited only after the founder confirms:

- the complete loop is stable enough not to lose or corrupt evidence;
- critical-path, access-isolation, backup/recovery, privacy, and deletion checks pass;
- policy explanations and manual workflows are understandable;
- no unresolved high-severity defect or data-handling blocker remains;
- support, incident, stop, and participant communication procedures are ready;
- the exploratory/no-guarantee evidence boundary is explicit.

Pilot completion produces a founder decision to iterate, continue evidence collection, hold, stop, or define a separately governed post-pilot plan. Approximately 3–5 developers over approximately one week cannot justify statistically strong claims.

### 11. What it unlocks next

Evidence for deciding whether a later product phase is warranted and which post-MVP capability, if any, deserves a bounded proposal. It does not automatically authorize commercialization, billing, enterprise work, or another adapter.

### 12. Suggested ownership lane

Shared: founder owns pilot policy, participants, evidence boundary, and acceptance; technical implementation/operations require separately approved assignments. This is not preassigned to the current collaborator.

---

## Remaining MVP and broader product visibility

| Remaining work                      | Purpose and prerequisite                                                                                                                                                                                                                                                                    | Authority now                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| T005 — Complete Capacity Preflight  | Manual local cold-start composition and immutable preflight evidence; PR #11 accepted and merged. | Accepted foundation, not the whole prototype. |
| T006 — Governed Outcomes and Comparison | Accepted governed run linkage, factual outcomes/amendments, reviewed compatible actuals, comparison and queryable history. Preserve T002 UNGUIDED history; no loader. | Founder-accepted implementation merged in PR #13. |
| T007 — private-hosted initial measurement | A founder-only hosted foundation and security gate precede three approved public builds, with the T005/T006 manual loop and accepted evidence protocol. Existing proto-dogfooding is not formal T007. | Tasks/sizes selected; hosting, exact run setup, provisioning and measured attempts not authorized. |
| T008 — Invited External Pilot        | Separately approve participant identity/tenancy, privacy, operations and Neo/other invitations after T007 evidence review. | Not started or authorized; a founder-only private host is not T008 approval. |

The briefs also describe broader whole-project decomposition/sequencing,
model/context/parallelism optimization, richer project/portfolio allocations,
brief upload, simulated capacity and runtime Codex skill/plugin integration.
These remain visible; manual T005 acceptance does not remove them from the eventual
MVP. Their placement must be distinguished explicitly:

| Placement                                                       | Work                                                                                                                                                                                                      | Current decision status                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Deferred from T005; fuller-product assignment/membership unresolved | Paste/upload MVP/tranche specification intake; human-reviewed AI-assisted decomposition; model/context/parallelism guidance; whole-project sequencing; basic Governor-to-Codex runtime integration and simulated capacity feeds. | Founder must bound each chosen capability. Manual input remains supported; none was removed by T005 acceptance. |
| First-prototype stage still requiring approval | T005/T006 provide the local workflow; founder-directed private-hosted preparation, security verification, three T007 attempts and separate release decisions remain. | T006 is merged. Hosted implementation/provisioning, measured attempts, public demo and release require distinct approvals. |
| Fuller-product history-informed forecasting | Approved Gate B/T004 pure capability exists, but T005 supplies no candidates. A reviewed loader and versioned method must be separately assigned outside T006. | Concern 001 still blocks the loader. Decision 0005 is draft; no loader is authorized. |
| Proposed exclusion from the first MVP, pending founder decision | Rich project/portfolio allocation and purchased-credit/model-price cost forecasting.                                                                                                                      | Recommendation only: defer beyond the first MVP. Separate ACCEPT/CHANGE/HOLD required for each; no accepted exclusion is implied. |

Automatic provider access and commercial/team/API features retain their existing
post-MVP boundaries. A future improved Codex adapter is not the same question as
first-MVP inclusion of a basic runtime integration. The accepted builder/reviewer
workflow governs development of this repository, not Governor-to-Codex runtime
execution, plan enforcement or automatic capacity retrieval.

T005's UI must disclose uncalibrated planning estimates, MEDIUM confidence as
known characterization rather than demonstrated accuracy, and capacity-window
percentages rather than purchased-credit cost estimates.

### Pre-loader calibration method concern — unresolved

[Concern 001](FORECAST_CALIBRATION_CONCERN_001.md) records that actual/originalExpected
ratios are applied to the cold-start baseline even when originalExpected was
already historically adjusted. A synthetic repeated-identical-workload diagnostic
exposes drift/oscillation away from stable actuals; it does not establish real
prediction accuracy. [The planning analysis](T006_CALIBRATION_AND_MILESTONES_DRAFT.md)
proposes a distinct baseline-denominator V2. Decision 0006 explicitly narrows
concern 001 to block **automatic history loading**, not outcome-only T006.
Resolve its method, compatibility and repeatability questions before a loader.
Do not change Decision 0003 or silently enable a loader.

The first prototype's local technical loop is T005 plus T006 outcomes/history.
The founder-directed next sequence is a separately approved founder-only private
host, hosted security/workflow verification, three frozen T007 public builds,
reviewed sanitized copies of actual results for a **separately approved public
interactive demo**, and continued private measurement. Neo and others enter
only through separately authorized T008. Visitor changes in a future demo
must be isolated simulations, never writes to original records. These three
builds collect initial factual calibration data but cannot establish forecast
accuracy or activate history loading. The fuller product still requires
history-informed forecasts and separately scoped paste/upload and human-reviewed
AI decomposition. The manual T005 slice alone does not demonstrate savings.

## Post-MVP and stretch boundary

The following are documented for context but are not part of the required MVP and carry readiness `POST_MVP`:

- improved Codex workflow adapter;
- automated documented capacity sources, if legitimately available;
- Claude Code adapter;
- cross-platform normalization;
- multi-agent comparison;
- API budget governance;
- team allocation;
- enterprise policy;
- billing;
- advanced analytics; and
- machine-learning calibration.

Claude Code remains after core Governor stability unless the founder explicitly changes scope through a later decision and bounded assignment. No post-MVP item is implied by the presence of placeholder adapter boundaries.

## Collaboration governance

Tranche 001 is intentionally the first bounded technical-collaboration test. The founder and Codex review its pull request before any future collaborator assignment. The allowed review outcomes are `ACCEPT`, `ACCEPT WITH REVISION`, `HOLD`, and `STOP`.

Tranches 002–008 are not preassigned to that collaborator. The suggested ownership lane on each stage communicates likely responsibility only. After each accepted tranche or evidence stage, the founder decides whether to authorize a new assignment, change ownership, revise the roadmap, hold, or stop.

Neverlost OS participation remains a completely separate decision. This roadmap neither depends on nor authorizes work in any other repository.

## Unresolved founder product questions

The roadmap intentionally leaves these questions open until their named decision point:

- Gate A, Gate B and T002 vocabulary are resolved by accepted Decisions
  0002, 0003 and 0001 respectively; their existing semantics are not open questions.
- Tranche 005 F1-F9, implementation acceptance and PR #11 merge are complete;
  broader product placement above remains separate.
- Pre-loader calibration concern 001: repeated workloads with adjusted original
  expectations may drift. Decision 0006 settled its outcome-only T006 gate
  effect; resolve the method through a separate reviewed decision before a loader.
- Tranche 006 recording semantics and loader placement are settled by Decision
  0006; its implementation was founder-accepted and merged through PR #13.
- T007 founder-only hosted foundation, security verification, exact starter/test/profile
  freeze, per-attempt ceiling, worksheet and separate execution/release grants;
  fuller-product intake/AI/loader assignments.
- Public-demo sanitization, visitor-simulation isolation and publication decision
  after actual results exist; no source DB access for visitors.
- T008 invited-pilot entry criteria and distinct participant identity/tenancy,
  privacy, retention/deletion, support and incident policy.

These are explicit governance boundaries, not missing implementation details for a collaborator to fill in.
