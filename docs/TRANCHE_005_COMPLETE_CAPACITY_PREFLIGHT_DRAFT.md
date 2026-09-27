# Tranche 005: Complete Capacity Preflight

## Assignment status and authority

- **Status:** DRAFT / NOT APPROVED — founder review required.
- **Authority granted now:** planning only; no T005 implementation.
- **Planning baseline:** merged main `1f0bdbf30cd4d37f1f3f17153308e28b7c298260`.
- **Proposed implementation owner:** Codex, subject to founder assignment.
- **Proposed implementation branch:** `feature/tranche-005-complete-capacity-preflight`.
- **PR target:** `main`; founder owns product decisions and acceptance.
- **Controlling semantics:** accepted Decisions 0001, 0002 and 0003, plus the
  accepted T001-T004 assignments and current runtime boundaries.

No implementation branch should be created until the founder resolves the
decision checklist below, approves the final assignment and explicitly grants
implementation authority. Its accepted documentation commit on main becomes the
implementation baseline; this planning baseline is not that future baseline.

## Objective

Compose the existing manual project/preflight flow, Forecast Engine V1 and
Governor Policy Engine V1 into the smallest complete local preflight experience.
A user supplies reviewed work characterization and independent manual capacity
buckets, confirms the inputs, obtains a traceable result, and saves/reopens its
immutable evidence. No development execution is performed by the application.

The proposal is deliberately cold-start and manual-only. Comparable-history
loading, governed-run linkage and outcome/calibration UI belong to T006. These
scope recommendations require founder approval where identified below.

## Current implementation and compatibility assessment

1. T001 stores one editable `PreflightDraft` per project. Its scalar budget has
   free-text units and no bucket identities or observation time. Its reset
   contract uses host IANA validation. These are structural legacy fields, not
   valid policy inputs or forecast characterization by implication.
2. T002 stores only UNGUIDED runs, manual outcomes and linear full-snapshot
   amendments. It has no governed-plan relationship or compatible normalized
   history loader. Preserve these contracts and existing records.
3. `evaluateForecastV1` produces non-authorizing deterministic evidence.
   `projectForecastToPolicyDemandV1` replays the retained forecast to reject
   inconsistent evidence and returns per-bucket demand/uncertainty or typed
   `NOT_COMPOSABLE`. The engine already rejects aliased history observations
   and duplicate provider/window/reset bucket identities.
4. `evaluatePolicyV1` alone owns normalization, exact arithmetic, reserves,
   freshness, uncertainty, resets, modes and decisions. Its public outcome is
   `INPUT_REJECTION` or `POLICY_EVALUATION`. Actor strings alone are not
   authenticated evidence. Required-bucket authority and minimum-scope evidence
   must match the evaluated scope, set and time.
5. Application services currently coordinate T001/T002 only. Database schema
   contains projects, editable preflight drafts, development runs, outcome
   observations and actual consumption. There is no composed evaluation,
   forecast/plan snapshot repository or result UI.

Use the actual engine contracts rather than old scalar placeholders or outdated
scaffold status text. No accepted engine semantics need changing for this
composition. Historical reset-cycle comparability and upstream authentication
remain deferred; this tranche may not resolve either implicitly.

## User-visible completion condition (proposed)

From an existing or newly created project, a user can:

1. open the existing manual draft without losing T001 values;
2. explicitly enter a repository/scope reference, work items and required
   capacity buckets for a new composed preflight revision;
3. review all material inputs, exclusions, acceptance criteria, observations,
   reset evidence, reserves and attestations before requesting evaluation;
4. receive per-bucket low/expected/high planning ranges, confidence, assumptions
   and unknowns; for a successful policy evaluation, see its mode, primary
   decision, allocations, reasons and stops;
5. distinguish input rejection, failed composition and evaluable restrictive
   policy outcomes, with actionable field/error context;
6. save/reopen the complete immutable evaluation, inputs, provenance and versions
   without rerunning it as though it were a current authorization; and
7. correct inputs or change scope through a new reviewed revision/evaluation,
   retaining the prior evidence.

A failed save must not be reported as a saved plan. A non-authorizing result
must never expose an enabled execution/continue action implying authorization.
An engine PROCEED result is a policy result, not founder approval to implement a
repository tranche or authority for automatic execution.

## Founder decisions required before implementation

All rows are **HOLD pending founder review**. Recommendations are proposals,
not defaults the builder may silently implement.

| ID                                                 | Existing resolution and remaining question                                                                                                               | Recommended bounded V1 choice                                                                                                                                                                                                                                                                                                                                                                                                                       | Alternative / tradeoff                                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 — Minimum characterization and context identity | Decision 0003 settles category and seven factors; T001 does not supply them or repository identity. How is one reviewed scope identified?                | Require non-empty work items with all existing fields, permitting explicit UNKNOWN only where supported. Require an explicit repository reference without inspecting that repository. Keep the parent T001 tranche ID and assign each immutable composed revision its own scopeTrancheId; bind both engines and every receipt to that revision. Never infer factors from prose or copy legacy budget fields without explicit re-entry/confirmation. | Reuse the mutable T001 tranche ID directly, but a separate revision binding would still be required to avoid carrying authority across changed content. |
| F2 — AI boundary                                   | Roadmap leaves AI inclusion open.                                                                                                                        | Defer all AI assistance and adapters; manual characterization only.                                                                                                                                                                                                                                                                                                                                                                                 | Optional proposal-only AI requires a separate input, privacy/provider and confirmation assignment.                                                      |
| F3 — Review and finalization                       | Gate A forbids relaxing overrides; roadmap does not define application confirmation or finalization.                                                     | Confirm the complete revision before server evaluation. Evaluate and persist that frozen revision and the result together; a result acknowledgment is evidence only. No editable final result or additional authorization flag. Corrections require a new revision.                                                                                                                                                                                 | Preview then finalize is possible, but requires a separately defined stale-preview/concurrency protocol.                                                |
| F4 — Guidance families                             | Engine reasons/stops are approved; new optimization heuristics are not.                                                                                  | Display existing per-bucket rule/reason/stop explanations and neutral next-step text: obtain fresh evidence, re-preflight after reset, explicitly define smaller scope, or preserve state. No model, context-size, parallelism or dependency optimization heuristics.                                                                                                                                                                               | Broader optimization guidance needs explicit rules and independent acceptance tests.                                                                    |
| F5 — Saved-result lifecycle                        | Gate A settles 30-minute/event freshness, resets and immutable evidence; saved-result validity and input-change behavior remain unspecified.             | Treat reopened results as historical. A fresh review/evaluation is required before treating one as current guidance; never refresh observedAt automatically. Any material input/configuration/scope change produces a new revision. Display the original evaluation time and current reevaluation requirement; reuse Gate A checks rather than inventing a new TTL.                                                                                 | Reusable saved guidance needs an approved revalidation protocol, authoritative activity input and precise boundary tests.                               |
| F6 — Persistence and negative evidence             | Architecture requires reproducible stored evaluations but does not name final tables or failure-record semantics.                                        | Store immutable composed input revisions and attempt records. Each attempt retains actual forecast/projection/policy outcomes or typed failure evidence; only a POLICY_EVALUATION yields a governed-plan snapshot, including restrictive decisions. Persist complete inputs/configurations/results atomically. Never fabricate a mode/decision for rejection or NOT_COMPOSABLE.                                                                     | Store only successful plans, but that loses negative evaluation evidence and needs founder approval.                                                    |
| F7 — History and run linkage                       | T002 permits UNGUIDED only; T006 owns outcome/calibration composition.                                                                                   | Submit an explicit empty calibrationCandidates array in the T005 product flow. Do not load/import history, normalize actuals, add GUIDED runs or a plan reference to existing run contracts. T005 stores a plan ID for future linkage only.                                                                                                                                                                                                         | Governed run creation/history supply expands the assignment and requires explicit contract, migration and evidence rulings.                             |
| F8 — Local provenance and trusted boundary         | T003 requires UPSTREAM_TRUSTED_BOUNDARY evidence; upstream authentication was explicitly deferred. What local boundary may establish the required claim? | Limit operation to a founder-confirmed, single-operator local prototype, recording explicit confirmation receipts bound to exact revision/bucket set and server record time. Do not claim actor-name authentication or accept browser-supplied trust flags. Founder must approve the local trust assumption and receipt-to-contract mapping, or hold any path capable of authorizing work.                                                          | Build identity authentication in a separate approved tranche, or restrict T005 to non-authorizing demonstrations. No implied security guarantee.        |
| F9 — Product Brief source                          | Decision 0003 references a Product Brief, but no standalone brief is tracked in this checkout.                                                           | Founder confirms README's product definition, architecture, roadmap and accepted decisions are sufficient controlling sources for T005, or provides the missing brief for reconciliation.                                                                                                                                                                                                                                                           | Hold final assignment approval until the separate brief is supplied and reviewed.                                                                       |

These choices interact: F1/F8 define the binding of authoritative inputs; F3/F5
define when confirmation applies; F6 determines what is retained; F7 keeps
historical identity and actual normalization out of this tranche. Approval of F8
must not be presented as resolving the deferred upstream authentication system.

## Technical scope after approval

### Contracts and runtime validation

Add reviewed transport-neutral composed revision, confirmation receipt,
evaluation attempt and governed-plan snapshot schemas. Exact names may vary,
but meanings may not. Distinguish draft/user-submitted evidence from evidence
established by the approved application boundary.

- Reuse forecast and policy runtime schemas; do not duplicate formulas or weaken
  validations to accept UI values.
- Require exact equality of both engine bucket sets and each corresponding
  bucketId/providerId/capacityWindowId/resetCycleId. Never join solely by an
  amount or silently drop a bucket. Validate duplicate composite identities.
- Bind characterization, bucket authority and minimum-scope attestation to the
  same immutable revision identity; preserve actor/reference and record time.
- Manual raw capacity uses exact decimal strings and existing whitelisted units.
  Preserve observedAt, resetsAt and normalizedUtc with explicit offsets and no
  finer than millisecond precision. sourceTimezone remains factual text; no
  inferred offset or host timezone validation in the composed boundary.
- Preserve optional reserve requirements, reset kind and explicit post-reset
  availability separately for every bucket. Never default to a full reset.
- Retain every explicit UNKNOWN; never fill an omitted factor with UNKNOWN or
  known values. T005 UI absence is not evidence of certainty.
- Validate complete stored snapshots on reads. Invalid stored evidence is a
  visible integrity error, not a silently repaired or authorizing result.

The legacy T001 reset form may retain its current behavior. The composed form
must use the policy reset contract and must not route through the legacy IANA
check or convert arbitrary T001 units by guessing their meaning.

### Framework-independent application use cases

Provide the narrow operations needed to prepare/review a composed revision,
evaluate confirmed inputs, atomically persist the evaluation, list saved results
for a project and reopen a result. Inject IDs, clock, repositories and versioned
configurations at the application boundary. Pure engines remain clock-free.

The evaluated sequence is:

1. Validate the project/draft association and approved confirmation/context.
2. Freeze the reviewed input snapshot and take explicit server evaluation time.
3. Invoke evaluateForecastV1 with complete accepted Gate B configuration and
   the approved history boundary (recommended empty candidates).
4. For FORECAST_EVALUATION, invoke the existing projection for every required
   bucket. Preserve expected demand unchanged and uncertainty separately.
5. If any projection is NOT_COMPOSABLE, retain that evidence and the forecast;
   do not call policy with a partial set, clamp demand or invent a decision.
6. Otherwise form the exact Gate A input from matching capacity/evidence and
   projected demand/uncertainty; invoke evaluatePolicyV1 with complete accepted
   Gate A configuration. Supply minimum-scope evidence explicitly; no inference.
7. Validate the composed stored outcome and atomically save the actual inputs,
   configurations, engine evidence and receipts. Return a saved identifier only
   after successful commit.

Reuse existing semantic replay in projection. Client-supplied forecasts,
confidence, modes or decisions must not become authoritative server results.
LOW forecast confidence can still project to UNKNOWN_OR_INVALID and produce
an evaluable STOP / PRESERVE; this differs from NOT_COMPOSABLE and input rejection.

### Proposed persisted records and relationships

- A ComposedPreflightRevision belongs to one existing Project and PreflightDraft,
  references its parent tranche and owns its immutable evaluated scope identity.
  It snapshots brief, exclusions, acceptance criteria, work items, repository
  reference, every raw bucket input and reviewed provenance.
- A PreflightEvaluationAttempt belongs to that revision and stores explicit
  evaluation/record times, complete forecast/policy configuration snapshots,
  engine versions and actual outcomes. Projection failures/rejections are
  retained in their typed form without a fictional plan.
- A GovernedPlanSnapshot exists only for a POLICY_EVALUATION and references the
  corresponding attempt; it retains exactly one aggregate mode/decision and
  all per-bucket results. STOP, NARROW and DEFER plans authorize no work.
- Confirmation evidence is immutable and references exact revision/set/content.
  PostgreSQL JSONB snapshots behind typed repositories are a proposed storage
  technique, not permission to store unvalidated payloads.
- Optional predecessor links explain a later corrected/re-preflight revision;
  they do not mutate or delete the earlier evidence. Whether a singular latest
  pointer is needed is a technical index/query choice, never an overwrite.

A minimum of two physical tables may store these logical records together;
avoid speculative normalized tables or an event platform. Technical layout must
preserve the approved atomicity, references and immutable evidence semantics.
No destructive history update/delete application workflow is permitted.

### UI boundary

Extend the focused project experience with a clearly separate composed preflight
flow. Label legacy drafts as manual structural evidence. Provide keyboard
operable work-item and bucket entry, explicit confirmation, field errors with
an error summary/focus strategy, understandable save failures and retained inputs.

Display independent bucket ranges and allocations, evaluation time, versions,
confidence explanation, unknowns, assumptions, limiting buckets, stops and
existing rule identifiers. Do not total capacity or conceal restrictive buckets.
Use planning-range language; no probability, accuracy or savings claims.

Show NOT_COMPOSABLE and INPUT_REJECTION without a fabricated Governor mode or
decision. For above-cycle demand, retain the unclamped forecast and explain that
Gate A V1 cannot consume it. Do not translate it into NARROW, DEFER or STOP.
Distinguish policy's UNKNOWN_OR_INVALID stop from a missing or malformed field.

Reopened evidence displays its historical status under F5. NARROW requires an
explicitly new coherent scope; DEFER requires fresh observations and a new
preflight after the qualifying reset. Neither enables present work.

### Migration boundary

Only additive reviewed PostgreSQL/Drizzle changes for the approved composed
records are permitted. Keep migrations 0000/0001 and T001/T002 records unchanged.
No backfill may manufacture bucket identities, observation times, provenance,
normalization, forecasts or guided status. Existing project/draft/run/outcome
queries must continue working after migration.

Tests must cover references, snapshot round-trip, immutable prior results,
atomic failure, duplicate submission/concurrency without evidence loss, and
migration from existing T001/T002 fixtures. Exact retry/idempotency mechanics
may be technical choices but must not duplicate or overwrite a confirmed
evaluation silently. Rollback must preserve stored evidence; document that
downgrading the app is safer than dropping new evidence tables.

## Exact allowed architectural surfaces

- `packages/contracts/**`: composed schemas/types and focused tests; accepted
  policy/forecast semantics remain unchanged.
- `packages/application/**`: orchestration, injected dependencies, repository
  ports and application tests; narrow package wiring to invoke accepted engines.
- `apps/web/src/app/**`, `apps/web/src/components/**`: focused manual review,
  result/list/reopen flow and tests.
- `apps/web/src/server/**`: application wiring and database repository adapters.
- `apps/web/drizzle/**`: new additive migration and corresponding generated
  metadata only, after approved persisted record review.
- `apps/web/e2e/**`: critical paths and conservative-family evidence.
- Root/package manifests and test configuration only if essential for existing
  engine/application dependency wiring. New dependencies require approval.
- Documentation directly needed to operate, test and review T005.

No behavior changes in packages/policy-engine or packages/forecast-engine are
authorized. Import and exercise their public APIs through application code;
report any required engine correction separately rather than absorbing it.

## Prohibited semantics and deferred work

Do not change Decisions 0001-0003, weights, confidence, history eligibility,
normalization, reserve floors, uncertainty arithmetic, mode/decision precedence,
freshness or reset/defer policy. Preserve:

`PROCEED < DEFER < NARROW < STOP / PRESERVE`

`FULL < CONSERVATION < LOW < CRITICAL`

No inferred required buckets, minimum-coherent scope, profile completeness,
post-reset replenishment, provider conversion or narrower scope. No cross-bucket
substitution/borrowing. No relaxed override or fabricated trust claim.

No AI/model calls, provider integration, automatic history/actual normalization,
automatic Codex retrieval, execution enforcement, GUIDED-run changes, T006
comparison UI/calibration loading, T007 formal dogfooding, T008 pilot, external
authentication system, billing, deployment, Claude Code or other repositories.
The intentionally deferred historical reset-cycle ambiguity is not reopened.

## Required tests after implementation is authorized

| Level                 | Required evidence                                                                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract              | Valid round-trip of every composed result family; invalid shapes/context/future evidence; duplicate IDs/composite identities; exact bucket-set parity; sub-millisecond rejection; semantic contradictions cannot authorize.                                      |
| Application           | Real forecast → projection → policy APIs with injected time/configuration; cold start; UNKNOWN; missing/invalid evidence; above-cycle and invalid forecast NOT_COMPOSABLE; transaction failures; server recomputation rather than trusting client output.        |
| Policy composition    | PROCEED, NARROW, DEFER, STOP fixtures; DEFER + NARROW → NARROW; one healthy bucket cannot relax another; bounded uncertainty applied once by Gate A; LOW minimum-scope true/false; stop precedence and complete post-reset reserve evidence unchanged.           |
| Freshness/context     | Exactly 30 minutes and next millisecond; known affected-bucket activity; passed reset; exact 24-hour defer horizon; changed inputs/revisions/configuration invalidate reuse under the approved F5 behavior; confirmation cannot migrate to another revision.     |
| Integration/migration | Legacy T001/T002 fixtures survive additive migration; complete configurations/inputs/outputs/receipts reopen identically; no history overwrite; wrong project/draft ownership rejected; atomic persistence and concurrency/retry failures retain prior evidence. |
| UI/accessibility      | Field labels and keyboard flow, multiple independent buckets/items, review confirmation, UNKNOWN disclosure, restrictive disabled actions, typed failure displays, historical reopened result, save failure/input retention and no silent legacy conversions.    |
| E2E                   | Manual-only create/review/evaluate/save/reopen allowed result; conservative paths covering NARROW, DEFER and STOP; above-cycle non-composable path; stale evidence requires new evaluation; T001/T002 critical paths remain green.                               |

Use exact real engine fixtures for the approved examples: 12-point cold start
gives 900/1,200/1,500 bp at MEDIUM, projected expected stays 1,200 and Gate A
adjusts demand to 1,500. Do not preinflate expected in application code. At
current A=7,800, default reserves are 1,170 each and I=5,460; another bucket at
A=1,300 remains CRITICAL and independently forces the restrictive result.

The runtime flow is recommended cold-start only. Tests may prove the existing
engine accepts history independently, but must not add an unapproved product
history loader to obtain HIGH confidence.

Required repository gates:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm db:generate
git diff --check
```

Report actual test/file counts and coverage. db:generate must produce only the
reviewed T005 additive schema delta and become clean after generation. Validate
formatter-supported committed LF Git objects separately from Windows CRLF
checkout behavior; do not call checkout line-ending differences pre-existing
content defects or rewrite unrelated files. Do not weaken tests or gates.

## Acceptance criteria

1. Every F1-F9 decision is resolved explicitly and incorporated before code.
2. Manual-only composition and save/reopen work without AI/provider/history access.
3. Every required bucket and all authority/context evidence match across engines.
4. Forecast ranges, expected demand and uncertainty retain their accepted meaning;
   policy alone owns normalization, reserves and authorization consequences.
5. All actual typed outcomes remain distinguishable and non-composable evidence
   never becomes a fabricated policy result.
6. Immutable complete inputs/configurations/results can reproduce evaluations;
   corrected inputs create new evidence, and save failures never imply success.
7. Confirmation and reopened-result behavior match approved F3/F5/F8 without
   inferring authentication or silently renewing capacity observations.
8. UI explains limiting buckets, existing rule IDs, protected reserves, unknowns,
   and restrictive results accessibly with no unsupported claims.
9. Legacy T001/T002 behavior remains intact; no GUIDED run or calibration loader
   is added, and accepted engine/decision behavior remains unchanged.
10. Additive migrations and all required checks pass with reviewable evidence.
11. A separate fresh-context governor_reviewer reviews the exact candidate commit
    and any fixes under the accepted three-review limit.
12. Founder acceptance is required before merge; no further tranche follows
    automatically from a technical PASS.

## Branch, documentation and handoff expectations

After approval, record the resolved assignment on main through a focused PR and
identify its exact accepted commit before creating the implementation branch.
Use the governor-build-review skill: coordinator controls authority, builder
authors implementation/tests/fixes, and a different reviewer authors no changes.
Report exact candidate SHA, agent separation, attempt ledger and any unresolved
findings. Stop after three review attempts, or earlier for a real founder choice.

Implementation PR must include composition/dependency summary; Decision 0002/0003
and assignment checklists; requirements-to-test mapping; representative
multi-bucket cold-start, unknown, stale, defer/narrow and above-cycle examples;
typed failure examples; exact gate results; migration/rollback notes; immutable
reproduction evidence; screenshots/accessibility evidence; changed files; clean
status; and explicit deferred work. Keep PR open until founder acceptance.

Document public application operations, confirmation/trust assumptions, record
relationships, migration procedure, result lifecycle, accepted configuration
snapshots, and how to reproduce a saved evaluation without changing it.

## Explicit stop conditions

Stop affected implementation and report the smallest founder decision if:

- any F1-F9 answer is absent or conflicts with a controlling source;
- the missing Product Brief reveals a requirement not reconciled here;
- the proposed local boundary cannot honestly establish approved provenance;
- a form or adapter requires an unsupported conversion, guessed timezone,
  inferred bucket/attestation or normalization of raw T002 evidence;
- a forecast cannot compose without changing accepted policy/forecast behavior;
- saved guidance requires an unapproved validity/confirmation/override rule;
- storage cannot preserve complete immutable evidence or existing history;
- governed-run linkage, history loading, AI, external authentication, deployment
  or another future tranche appears necessary for completion;
- a new broad dependency/refactor or product-semantic change is needed; or
- tests expose an engine defect outside T005's integration boundary.

Do not resolve these with a guessed default, a hidden flag or a disclaimer.

## Founder review checklist

For each row, reply ACCEPT, CHANGE (with replacement), or HOLD:

- F1: full accepted manual taxonomy, explicit repository reference and immutable
  revision scope identity.
- F2: AI assistance deferred.
- F3: confirm frozen inputs, then evaluate and persist; no separate preview
  finalization or safety-relaxing action.
- F4: existing deterministic explanations and neutral guidance only.
- F5: saved results historical; current guidance requires reviewed reevaluation.
- F6: immutable input/attempt/plan evidence, including negative outcomes,
  transactionally saved with no invented policy fields.
- F7: cold-start flow only; history loading and governed-run linkage deferred.
- F8: explicit local trust assumption and receipt mapping, or hold authorizing
  paths until that boundary is separately approved.
- F9: confirm available product sources suffice, or supply the Product Brief.

After these decisions, separately approve the final assignment, owner and
implementation authority. This draft alone is not safe authority to begin T005.
