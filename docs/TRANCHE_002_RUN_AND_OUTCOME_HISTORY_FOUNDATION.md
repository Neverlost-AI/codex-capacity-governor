# Tranche 002: Run and Outcome History Foundation

## Assignment status

- **Status:** Founder-approved for Codex implementation
- **Type:** Bounded vertical slice
- **Decision dependency:** Accepted
  [`Decision 0001: Tranche 002 recording vocabulary`](decisions/0001-tranche-002-recording-vocabulary.md)
- **Founder approval date:** 2026-08-24
- **Implementation owner:** Codex
- **Recommended implementation branch:**
  `feature/tranche-002-run-outcome-history`
- **Pull-request target:** `main`
- **Required baseline:** Clean founder-confirmed `main` containing this approved
  decision record and assignment
- **Product owner and acceptance owner:** Founder

This document is the complete founder-approved implementation boundary for
Tranche 002. It authorizes Codex to implement only this bounded tranche after the
approved documentation is committed and the recommended implementation branch
is created from the required baseline. It does not authorize any later tranche
or any future Governor policy or forecasting semantic.

This dated assignment is the separate bounded assignment anticipated by the
roadmap. For T002 only, it supersedes the roadmap's earlier
`IMPLEMENTATION_READY_DRAFT` planning label. It does not change the readiness or
authority of any other tranche or founder gate.

Read `README.md`, `AGENTS.md`, `docs/ARCHITECTURE_CONTEXT.md`,
`docs/DEVELOPMENT_WORKFLOW.md`, `docs/MVP_ROADMAP.md`, the accepted Tranche 001
assignment, and Decision 0001 before implementation.

## Objective

Implement the smallest complete, auditable run-history path through the accepted
Tranche 001 architecture:

> Open a saved project/preflight → create an explicitly unguided development run
> → record actual consumption and outcome evidence → reopen the project's run
> history → append an amendment without losing the original observation.

This tranche establishes factual run/outcome recording for later governed-plan,
comparison, calibration, and dogfooding work. It does not calculate, recommend,
infer, or imply any future Governor result.

## User-visible completion condition

From a clean local checkout using the documented application and PostgreSQL
setup, a user can:

1. open an existing project with its saved manual preflight draft;
2. create a development run that is visibly and persistently marked `UNGUIDED`;
3. record a run outcome of `COMPLETED`, `PARTIAL`, or `FAILED`;
4. record an independent validation result of `NOT_RUN`, `PASSED`, `PARTIAL`,
   `FAILED`, or `INCONCLUSIVE`;
5. optionally record manual actual-consumption values categorized as
   `IMPLEMENTATION`, `CORRECTION`, `VALIDATION`, or `OTHER`;
6. optionally record a manual remaining-capacity snapshot with amount, source
   unit, observation time, and source intact;
7. separately record unexpected failures, deferred work, and factual notes;
8. leave the view or restart the application and reopen the project's ordered
   run history with the saved evidence intact; and
9. append a reasoned correction that becomes the current observation while the
   original observation remains visible and recoverable in the audit history.

The UI must make unavailable governance data explicit. It must not display or
imply a forecast, forecast confidence, affordability result, operating mode,
Governor decision, reserve calculation, reset/defer recommendation, calibration
result, or automated Codex measurement.

## Approved input and decision boundary

Decision 0001 is accepted. The implementer must use its vocabulary, explicit
non-precedence rules, relationships, cardinalities, source meaning, and amendment
behavior exactly and must not settle or revise them through code, UI copy,
database defaults, or tests.

Any future change to an approved definition, relationship, cardinality, source
meaning, or amendment rule requires a superseding founder decision and assignment
revision. Pull-request assumptions cannot substitute for founder approval where
product meaning or evidence handling changes.

### Resolved founder decisions

For implementation purposes, the seven previously open decisions are resolved as
follows:

1. Run outcomes are exactly `COMPLETED`, `PARTIAL`, and `FAILED`, with the
   definitions in Decision 0001. The system applies no automatic precedence
   between `PARTIAL` and `FAILED`; the recorder selects exactly one factual value.
2. Validation results are exactly `NOT_RUN`, `PASSED`, `PARTIAL`, `FAILED`, and
   `INCONCLUSIVE`, independently from run outcome. The system applies no automatic
   precedence between `PARTIAL` and `FAILED`; the recorder selects exactly one
   factual value.
3. Every T002 run requires both an existing `Project` and that project's existing
   `PreflightDraft`.
4. Each outcome observation permits at most one manual consumption entry per
   approved category. Omission is unknown or unrecorded, never implicit zero.
5. Remaining capacity is an optional manual snapshot. Its structured `source` is
   the literal `manual` and describes the entry mechanism; observed-platform
   origin may appear only in factual notes and creates no platform integration.
6. Corrections are complete, linear, append-only outcome observations with a
   required amendment reason, preserved predecessors, and stale-write rejection.
7. T002 provides no update-in-place or delete use case for any run or historical
   outcome evidence.

## Persisted records and relationships

The names below are the approved reviewed V1 model. They may be adjusted only for
a documented technical naming need that does not change semantics and is called
out in the pull request.

### `DevelopmentRun`

Persist one record with:

- `id` — UUID;
- `projectId` — required reference to an existing `Project`;
- `preflightDraftId` — required reference to the existing `PreflightDraft`
  associated with that project;
- `guidanceKind` — literal `UNGUIDED` in T002; and
- `createdAt` — system record time.

Creating this record does not assert when execution started or ended, elapsed
time, completion, validation, consumption, remaining capacity, or Governor
guidance.

### `RunOutcomeObservation`

Persist an immutable full observation with:

- `id` — UUID;
- `runId` — required reference to one `DevelopmentRun`;
- `supersedesObservationId` — absent for the initial observation and required for
  an amendment;
- `runOutcome` — `COMPLETED`, `PARTIAL`, or `FAILED`;
- `validationResult` — `NOT_RUN`, `PASSED`, `PARTIAL`, `FAILED`, or
  `INCONCLUSIVE`;
- `unexpectedFailures` — ordered factual text entries;
- `deferredWork` — ordered factual text entries, stored separately from
  failures;
- `notes` — optional factual free text;
- optional remaining-capacity snapshot fields: amount, unit, observation time,
  and literal source `manual`;
- `amendmentReason` — absent on the initial observation and required, non-empty
  factual text on an amendment; and
- `recordedAt` — system record time.

A run may exist without an outcome observation. A run has at most one initial
observation and one linear amendment chain. The latest observation is the
current recorded view; every earlier observation remains queryable.

### `ActualCapacityConsumption`

Persist zero or more immutable entries associated with one
`RunOutcomeObservation`:

- `id` — UUID;
- `outcomeObservationId` — required parent reference;
- `category` — `IMPLEMENTATION`, `CORRECTION`, `VALIDATION`, or `OTHER`;
- `amount` — finite and non-negative;
- `unit` — required, trimmed, non-empty source unit;
- `source` — literal `manual`; and
- `recordedAt` — system record time.

An outcome observation has at most one entry for each category. An absent
category is unrecorded or unknown, not zero. Values in different units remain
independent raw evidence; T002 performs no conversion, comparison, summation,
reconciliation, or normalization.

### Relationships and integrity

- One `Project` has zero or more `DevelopmentRun` records.
- One `PreflightDraft` has zero or more `DevelopmentRun` records.
- Each T002 run belongs to exactly one project/preflight association.
- One run has zero or one initial outcome observation and zero or more linear
  amendments.
- One outcome observation has zero to four consumption entries, at most one per
  approved category.
- An amendment must reference the current latest observation for the same run.
- An observation may be superseded at most once; amendment forks are invalid.

Use database constraints for stable relational invariants and application
validation/transactions for cross-record rules that cannot be expressed safely
in a simple constraint. Do not weaken audit behavior because a chosen database
operation is inconvenient.

## Technical scope

### Contracts and runtime validation

- Add runtime schemas and inferred TypeScript types for the approved run,
  outcome, consumption, remaining-capacity, and amendment boundaries.
- Treat the existing compile-time-only `ExecutionOutcome` and `ValidationResult`
  declarations as placeholders. Replace or refine them deliberately so there is
  one unambiguous T002 contract rather than parallel incompatible meanings.
- Preserve existing T001 schemas and public behavior.
- Keep core contracts transport-neutral and free of React, Next.js, Drizzle,
  PostgreSQL, and browser types.
- Represent `guidanceKind` as the literal `UNGUIDED` for T002. Do not add a fake
  governed-plan identifier or persist an unimplemented governed state.
- Reuse the existing non-negative finite quantity validation where compatible,
  but constrain T002 boundary sources to literal `manual`.
- Do not add normalization, arithmetic, cross-unit comparison, status derivation,
  or policy validation.

### Runtime validation requirements

At every relevant form/server/application/persistence boundary:

- validate identifiers as UUIDs;
- validate timestamps as ISO date-times with explicit offsets;
- reject missing or unsupported enum values;
- reject negative, infinite, and `NaN` capacity amounts;
- trim and reject empty units, list entries, required notes, and amendment
  reasons;
- validate optional remaining-capacity fields as all present or all absent;
- require remaining-capacity source and consumption source to be `manual`;
- reject duplicate consumption categories within one observation;
- reject an outcome for a nonexistent run;
- reject a run whose project and preflight do not match;
- reject a second initial outcome;
- reject an amendment without a current observation, valid predecessor, or
  reason;
- reject an amendment that targets a stale or different-run predecessor; and
- preserve valid entered values after recoverable UI/server errors where
  practical.

Validation must not infer a status from another field. For example, `FAILED`
validation does not automatically set run outcome to `FAILED`, and non-empty
deferred work does not automatically set run outcome to `PARTIAL`.

### Application boundary and use cases

Add only the framework-independent commands and queries needed for:

1. `createDevelopmentRun` — verify project/preflight association and create an
   `UNGUIDED` run;
2. `recordRunOutcome` — atomically create the initial immutable observation and
   its zero or more consumption entries;
3. `amendRunOutcome` — atomically append a full observation against the expected
   current observation, preserving the prior chain and rejecting stale writes;
4. `listProjectRuns` — return project runs in a deterministic documented order
   with their latest outcome summary, if any; and
5. `getRunHistory` — return the run identity, current observation, and complete
   ordered amendment history.

Define repository ports at the application boundary. Application and contract
code must not import UI, ORM, database-driver, provider, or browser code.

Test and expose distinct errors for project not found, preflight not found,
project/preflight mismatch, run not found, duplicate initial outcome, stale or
invalid amendment, invalid input, and recoverable repository failure. Do not add
authentication or generalized workflow/state-machine infrastructure.

### Persistence and migration boundary

- Add only the reviewed run, outcome-observation, and actual-consumption tables,
  constraints, foreign keys, and indexes required by this assignment.
- Extend the accepted Drizzle/PostgreSQL adapter behind new application ports.
- Add one reviewable forward migration generated from the approved schema.
- Preserve the accepted `projects` and `preflight_drafts` tables and all T001
  data. Do not rename, rewrite, backfill, or reinterpret T001 columns.
- Do not add `Forecast`, `GovernedExecutionPlan`, `CalibrationObservation`, policy
  configuration, platform-capacity, analytics, or speculative placeholder
  tables/columns.
- Apply initial outcome creation and amendment creation transactionally with
  their consumption entries.
- Enforce at most one initial observation per run, at most one successor per
  observation, and at most one consumption entry per category per observation.
- Never update or delete a historical outcome observation or its consumption
  entries through an application repository method.
- Add indexes only for the required project-run ordering, run-history ordering,
  predecessor lookup, and relational integrity.
- Document forward migration and rollback/data-retention risks. A rollback that
  drops recorded evidence must be called out as destructive and must not be run
  automatically.

### Audit and amendment behavior

- The initial outcome observation is immutable after commit.
- An amendment is a new complete observation, not a mutation or field delta.
- Require the client/application to supply the expected current observation ID
  when amending.
- Record the predecessor and reason on every amendment.
- Create the amendment and its capacity entries in one transaction.
- Reject concurrent stale amendments instead of accepting a fork or silently
  applying last-write-wins behavior.
- History reads return every observation in a stable chronological/chain order
  and identify which one is current.
- UI copy must say that an amendment preserves earlier evidence.
- No delete, redact, or history-rewrite workflow is in scope. If legal/privacy or
  retention needs appear, stop for a separate founder decision rather than
  inventing deletion semantics.

### User-interface boundary

- Extend the existing project experience with a focused run-history section.
- Provide an empty state when a project has no runs.
- Provide a create-run action that clearly labels the new run `UNGUIDED` and
  explains that no Governor plan or recommendation exists.
- Provide a focused outcome form using the approved status vocabularies,
  categorized manual capacity fields, optional remaining-capacity snapshot,
  separate repeatable unexpected-failure and deferred-work inputs, and factual
  notes.
- Provide an ordered project run-history view showing runs without outcomes,
  latest outcome summaries, and links to full evidence/audit history.
- Provide an amendment flow that starts from the current observation, requires a
  reason, and warns that it appends rather than replaces history.
- Make original and amended observations distinguishable by record time,
  predecessor relationship, and amendment reason.
- Use explicit labels, logical headings, keyboard-operable controls, associated
  field errors, and an understandable error summary or focus strategy.
- Distinguish validation, not-found, stale-amendment/conflict, and recoverable
  server/persistence failures in plain language.
- Do not add dashboards, charts, forecasts, comparisons, performance claims,
  broad navigation, or a generalized design system.

## Allowed architectural surfaces

An approved T002 implementation may change only:

- `packages/contracts/**` for reviewed T002 runtime schemas, types, compatibility
  cleanup of the placeholder outcome vocabulary, and focused tests;
- `packages/application/**` for the five named use cases, explicit repository
  ports, errors, and tests;
- `apps/web/src/server/db/**` and the existing Drizzle configuration for the
  approved persistence adapter changes;
- `apps/web/drizzle/**` for one reviewed forward migration and Drizzle metadata;
- `apps/web/src/app/**` and `apps/web/src/components/**` for the bounded run,
  outcome, history, and amendment UI/server actions;
- `apps/web/e2e/**` and existing test configuration for required tranche tests;
- package manifests or the lockfile only if an existing dependency declaration
  must be wired for an approved implementation need—new dependencies require
  prior explanation and approval; and
- documentation directly needed to run, migrate, test, review, and hand off
  T002.

Do not edit roadmap, architecture, policy/forecast package placeholders, or
unrelated T001 code to fit an implementation preference. A narrowly necessary
T001 integration edit must preserve behavior, be explained in the pull request,
and have regression coverage.

## Prohibited semantics and surfaces

Do not implement, simulate, derive, stub with invented behavior, or imply:

- forecasts, forecast ranges, forecast error, or confidence;
- affordability or capacity sufficiency;
- Governor operating modes;
- `PROCEED`, `NARROW`, `DEFER`, or `STOP / PRESERVE` decisions;
- implementation allocations or correction/validation reserve calculations;
- reset timing, reset policy, or defer policy;
- calibration calculations, comparable-run selection, or automatic learning;
- AI analysis or AI-derived outcome classification;
- automatic Codex capacity retrieval, account access, credentials, cookies, or
  undocumented APIs;
- a `GovernedExecutionPlan`, governed-run state, plan adherence, or recommendation
  followed/not-followed state;
- capacity normalization, conversion, reconciliation, totals across incompatible
  units, percentages, efficiency, or productivity claims;
- automatic derivation of run outcome or validation result from other evidence;
- authentication, billing, production deployment, analytics dashboards,
  cross-project benchmarking, or another coding-agent integration;
- deletion/rewriting of historical evidence; or
- Gate A, Gate B, Tranche 003–008, or new founder-controlled product semantics.

The words used to label factual evidence must not become hidden policy logic.
If a requested behavior needs one of these semantics, document the blocker and
stop the affected work.

## Required tests and checks

The pull request must include and pass:

### Contract and unit tests

- Every approved enum value parses; representative unknown/case-variant values
  fail.
- Valid run, initial outcome, consumption, remaining-capacity, and amendment
  inputs parse and round-trip.
- Invalid UUIDs, timestamps without offsets, negative/non-finite amounts, empty
  units/text, partial remaining-capacity snapshots, duplicate categories,
  non-manual sources, missing amendment reasons, and invalid predecessor shapes
  fail.
- Tests prove no schema derives outcome, validation, remaining capacity, or
  governance meaning.

### Application tests

- Create an `UNGUIDED` run for a valid project/preflight association.
- Reject missing projects, missing preflights, and mismatched associations.
- Record an initial outcome with zero and multiple categorized consumption
  entries.
- Reopen deterministic project run history, including a run without an outcome.
- Append an amendment and return both original and current observations.
- Reject duplicate initial outcomes, cross-run predecessors, stale concurrent
  amendments, and repository failures without partial writes.
- Keep unexpected failures and deferred work separate through every use case.

### Persistence and migration integration tests

- Apply all migrations from an empty PostgreSQL database and from the accepted
  T001 schema state.
- Prove existing T001 `Project` and `PreflightDraft` records remain readable and
  unchanged after migration.
- Round-trip runs, all outcome/validation values, each consumption category,
  remaining-capacity snapshots, failures, deferred work, notes, and Unicode text.
- Prove foreign keys, project/preflight association handling, deterministic
  ordering, enum/check constraints, and unique category constraints.
- Prove one initial observation, a linear amendment chain, predecessor integrity,
  immutable prior rows, stale-write rejection, and transaction rollback on a
  failed child insert.
- Prove original and negative evidence remains recoverable after amendments.

### UI and accessibility tests

- Accessible create-run, outcome, and amendment forms with associated labels and
  errors.
- Explicit `UNGUIDED` explanation and absence of forecast/policy implications.
- Empty history, run-without-outcome, latest outcome, full audit history, and
  amendment-reason states.
- Separate unexpected-failure and deferred-work inputs/display.
- Retained valid input after recoverable validation/save failure where practical.
- Understandable not-found, conflict/stale amendment, and server failure states.

### Playwright end-to-end tests

At minimum, prove the critical persisted path:

> create/open project and preflight → create `UNGUIDED` run → record categorized
> consumption and outcome → leave/reopen project history → saved evidence remains
> visible.

Also prove append-only correction either in the same critical test or one focused
second test:

> append amendment with reason → current observation changes → original
> observation remains visible in audit history.

The browser path must use the real application/persistence boundary used by the
local application; do not mock persistence to make it pass.

### Repository verification

Run and pass:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm db:generate
```

`pnpm db:generate` must report no uncommitted schema drift after the reviewed
migration is generated. Do not weaken tests or validation to obtain a green run.

## Acceptance criteria

T002 is acceptable only when all of the following are true:

1. Decision 0001 is founder-approved and implementation matches it exactly.
2. A user can create an explicitly `UNGUIDED` run for an existing matching
   project/preflight without any governed plan.
3. A run may remain visible in history before an outcome is recorded.
4. A user can record each approved run outcome and independent validation result.
5. Manual actual consumption preserves category, amount, source unit, source,
   and record time without derivation or normalization.
6. Optional remaining capacity preserves amount, source unit, observation time,
   and manual source without arithmetic or policy interpretation.
7. Unexpected failures, deferred work, and factual notes remain distinct and do
   not generate hidden semantics.
8. Project history reopens in a stable order with complete round-trip fidelity.
9. Amendments append immutable full observations with a reason and predecessor;
   the original and full chain remain recoverable.
10. Duplicate, cross-run, forked, and stale amendments are rejected safely and
    transactions do not leave partial evidence.
11. Migrations add only the approved T002 records and preserve all accepted T001
    data and behavior.
12. Contracts/application packages remain independent of UI, ORM, database, and
    provider code; persistence stays behind repository ports.
13. Accessible validation and understandable not-found/conflict/server errors are
    present at the UI boundary.
14. Required unit, application, integration, UI, migration, Playwright, format,
    lint, typecheck, test, and build checks pass.
15. No forecast, confidence, affordability, mode, Governor decision, reserve,
    reset/defer, calibration, AI, automated capacity, or future-tranche behavior
    is implemented or implied.
16. The pull-request diff stays within this assignment and identifies blockers
    instead of inventing missing semantics.

## Expected documentation

Update documentation only as needed to provide:

- the accepted Decision 0001 reference and implemented vocabulary;
- clean-checkout migration and local run-history verification steps;
- the new records, relationships, indexes, immutability constraints, and
  destructive rollback implications;
- exact validation commands and expected database/test setup;
- application/repository/adapter dependency direction for T002;
- audit-history and stale-amendment behavior visible to reviewers; and
- assumptions, blockers, and deliberately deferred future behavior.

Do not rewrite the roadmap, architecture, T001 assignment, or product definition
to fit an implementation preference.

## Branch and pull-request expectations

- When implementation begins, create
  `feature/tranche-002-run-outcome-history` from the founder-confirmed clean
  `main` baseline.
- Do not commit directly to `main`.
- Keep commits focused and reviewable; do not mix formatting churn, dependency
  upgrades, or unrelated refactors with T002.
- Open one pull request targeting `main` when the tranche is ready for founder
  review.
- The pull request must include:
  - concise implementation summary and rationale;
  - Decision 0001 and acceptance-criteria checklists;
  - exact validation commands and results;
  - screenshots of create-run, outcome, history, amendment, and meaningful error
    states;
  - schema diagram or precise record/relationship summary;
  - forward-migration and destructive rollback/data-retention notes;
  - evidence that T001 data and behavior remain intact;
  - assumptions, open questions, and any founder decision requested;
  - exact work intentionally left unbuilt; and
  - confirmation that prohibited future semantics remain unimplemented.

Review results are `ACCEPT`, `ACCEPT WITH REVISION`, `HOLD`, or `STOP`. No later
tranche begins until the founder records the result and grants a new assignment.

## Handoff requirements

At review handoff, provide:

- branch name, final commit SHA, and pull-request link;
- clean `git status` and confirmation that no secrets or local artifacts are
  included;
- exact contract, application, UI, adapter, migration, and test file summary;
- clean-checkout setup/migration steps verified by the implementer;
- test/build evidence including Playwright flows;
- screenshots or short recordings of the primary and amendment flows;
- representative audit-chain evidence showing the original retained;
- migration/rollback and concurrent-amendment behavior;
- blockers, compromises, assumptions, and founder questions; and
- confirmation that every prohibited feature remains unimplemented.

## Explicit stop conditions

Stop the affected work, preserve the branch in a reviewable state, and document
the blocker if:

- Decision 0001 is superseded, withdrawn, or found to conflict with this
  assignment;
- implementation requires deciding what `COMPLETED`, `PARTIAL`, `FAILED`, or any
  validation result means beyond the accepted record;
- a run cannot be associated with its project/preflight without changing T001
  product meaning or rewriting existing data;
- implementation requires a governed plan, forecast, confidence, affordability,
  policy mode/decision, reserve, reset/defer, or calibration concept;
- a capacity value would need conversion, normalization, comparison, arithmetic,
  reconciliation, or an invented canonical unit;
- outcome, validation, failure, deferred-work, notes, or amendment semantics would
  need to be inferred or expanded;
- an audit requirement cannot be met without mutating, deleting, forking, or
  losing original evidence;
- a required relation or concurrency guarantee cannot be enforced reliably with
  the accepted PostgreSQL/Drizzle/application boundaries;
- automatic Codex data, credentials, cookies, undocumented APIs, AI analysis, or
  another platform appears necessary;
- authentication, privacy/deletion policy, billing, deployment, analytics, or
  another infrastructure component becomes necessary;
- a new dependency or broad framework materially expands the accepted stack;
- a required test cannot be reliable without weakening the boundary;
- unrelated changes or collaborator work cannot be separated safely; or
- completing the tranche would decide Gate A, Gate B, later-tranche behavior, or
  another founder-controlled product semantic.

Do not solve a stop condition with a default, placeholder, hidden enum value, or
UI-only disclaimer. State the exact decision needed, affected acceptance
criterion, and smallest founder-reviewable options.

## Review rubric

The tranche should be evaluated for:

- **Code quality:** clear contracts, transactions, validation, error handling,
  and maintainable history reconstruction.
- **Architecture adherence:** inward dependency direction and persistence behind
  explicit application ports.
- **Evidence integrity:** immutable original observations, linear amendments,
  negative-result retention, and round-trip fidelity.
- **Communication:** precise migration/audit notes, assumptions, blockers, and
  review evidence.
- **Scope discipline:** no policy, forecast, normalization, calibration, AI, or
  adjacent product behavior.
- **Independence:** sound execution inside the approved boundary and timely
  escalation for genuine semantic decisions.
- **Testing discipline:** meaningful tests at each layer, failure/concurrency
  coverage, and reproducible critical browser evidence.
- **Collaboration fit:** focused commits, reviewable migrations, responsiveness,
  and respect for founder ownership.
