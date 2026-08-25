# Decision 0001: Tranche 002 recording vocabulary

## Status

**Accepted — founder-approved on 2026-08-24**

This record approves T002 recording semantics only. It does not close Founder
Gate A or B or authorize forecast, policy, reserve, reset/defer, calibration, AI,
or platform-integration behavior. Implementation authority is bounded separately
by the founder-approved T002 assignment.

## Context

Tranche 002 needs an auditable way to record a development run and what happened
without implying that a forecast, Governor decision, or governed execution plan
exists. The architecture already requires manual input, preservation of negative
results, separate failure/validation/deferred-work evidence, and append-oriented
outcomes.

The current contracts contain a compile-time-only `ExecutionOutcome` placeholder.
It is not compatible with this decision because it:

- requires a `GovernedExecutionPlan` identifier;
- has no run-level `COMPLETED`, `PARTIAL`, or `FAILED` result;
- omits `INCONCLUSIVE` from validation results;
- has no `OTHER` actual-consumption category;
- has no observed remaining-capacity snapshot; and
- has no amendment/audit representation.

These are expected contract refinements for T002, not conflicts with the inward
dependency direction or modular-monolith architecture. Any implementation must
replace or refine the placeholder explicitly and add reviewed runtime schemas.

## Decision

### Development run

A `DevelopmentRun` is a recorded execution instance associated with one existing
`Project` and one existing `PreflightDraft`.

T002 supports only:

`UNGUIDED`

`UNGUIDED` means no `GovernedExecutionPlan` authorized or guided the run. T002
must not create a governed-plan table, identifier, placeholder relationship, or
fallback value. A later tranche may add a governed relationship through a
reviewed migration and contract change.

Creating a run records identity and system record time. It does not infer actual
start time, end time, elapsed time, capacity use, outcome, or validation.

### Run outcome

The approved exhaustive V1 run-outcome vocabulary is:

- `COMPLETED` — the recorder states that the run completed its recorded intended
  work;
- `PARTIAL` — the recorder states that some intended work was completed but the
  recorded intended work was not completed in full; and
- `FAILED` — the recorder states that the run did not achieve its recorded
  intended outcome because the execution failed.

The application records the selected value. It does not derive the value from
capacity, validation, failures, deferred work, notes, or future policy rules.

### Validation result

The approved exhaustive V1 validation-result vocabulary is:

- `NOT_RUN` — no validation was run;
- `PASSED` — the recorder states that the validation performed for the run
  passed;
- `PARTIAL` — only part of the intended validation was completed or the recorded
  validation results were mixed;
- `FAILED` — the recorder states that validation produced a failing result; and
- `INCONCLUSIVE` — validation was attempted, but the evidence did not support a
  pass or fail conclusion.

Validation result is recorded independently from run outcome. No combination
automatically determines another value or produces a Governor decision.

### Actual capacity consumption

Actual capacity consumption is recorded as zero or more manually entered,
categorized observations. The approved exhaustive V1 categories are:

- `IMPLEMENTATION`
- `CORRECTION`
- `VALIDATION`
- `OTHER`

Each observation preserves a non-negative finite amount, non-empty source unit,
the literal source `manual`, and its system record time. One outcome observation
may contain at most one entry per category. Omitted categories remain unknown or
unrecorded; they are not converted to zero. T002 does not convert, compare, sum,
normalize, reconcile, or interpret units.

### Remaining capacity

An outcome observation may include one manually entered remaining-capacity
snapshot. When present, the snapshot preserves:

- non-negative finite amount;
- non-empty source unit;
- observation time with an explicit offset; and
- source `manual`.

The snapshot is a reported observation. T002 does not derive it from starting
capacity or consumption, reconcile it with other evidence, or treat it as a
canonical Governor unit.

### Failures, deferred work, and notes

- Unexpected failures are recorded explicitly as a list of factual, non-empty
  text entries.
- Deferred work is recorded separately as a list of factual, non-empty text
  entries. A deferred item is not automatically a failure.
- Notes are optional factual free-text evidence. Notes do not generate statuses,
  categories, policy meaning, or other derived semantics.

### Append-only amendments

The initial outcome is an immutable full observation. A correction appends a new
full outcome observation that references the immediately preceding observation
and includes a required amendment reason.

The original observation and all intervening amendments remain recoverable. The
latest observation is the current recorded view, but it does not erase history.
The amendment chain must be linear: an observation may be superseded at most
once, and stale concurrent amendments are rejected rather than forked or silently
overwritten.

T002 exposes no update-in-place or delete use case for runs, outcomes,
consumption observations, or amendments.

## Consequences

- Unguided historical evidence can be recorded before governed plans exist.
- T002 can preserve manual facts without deciding Gate A budget/policy semantics
  or Gate B forecast/calibration semantics.
- Existing T001 project/preflight behavior and records remain valid.
- The current placeholder outcome contract requires an explicit compatibility
  change and migration-backed runtime schemas.
- Amendment reads must distinguish the original observation, the complete audit
  chain, and the latest effective observation.
- An amendment repeats the complete outcome snapshot and its capacity entries;
  this favors audit clarity over storage minimization.

## Alternatives considered

### Require a governed plan for every run

Rejected for this decision because governed plans do not exist yet and a fake or
nullable plan identifier could imply Governor guidance.

### Update one outcome row in place

Rejected because it loses the original observation and conflicts with the
architecture's append-oriented evidence requirement.

### Store field-level amendment deltas

Not selected for V1. Deltas reduce duplication but make reconstruction,
validation, and review more complex than full immutable observations.

### Derive remaining capacity or aggregate consumption

Rejected for T002 because unit normalization, arithmetic, reconciliation, and
policy meaning are not approved.

## Approved founder decisions

The founder approved the following seven decisions on 2026-08-24:

1. The run-outcome vocabulary and definitions in this record are exhaustive for
   T002. Neither `FAILED` nor `PARTIAL` has automatic system precedence when a
   run makes partial progress and then fails. The recorder selects exactly one
   factual outcome and may explain the circumstances in factual notes; the
   application does not derive or override that selection.
2. The validation-result vocabulary and definitions in this record are
   exhaustive and independent from run outcome. Neither `FAILED` nor `PARTIAL`
   has automatic system precedence for mixed passing and failing evidence. The
   recorder selects exactly one factual validation result and may explain the
   circumstances in factual notes; the application does not derive or override
   that selection.
3. Every T002 `DevelopmentRun` must reference an existing `PreflightDraft` and
   its associated `Project`.
4. An outcome observation may contain at most one manually entered consumption
   observation per approved category. Omission means unknown or unrecorded, not
   zero.
5. Remaining capacity is an optional manually entered snapshot with amount,
   source unit, observation time, and literal source `manual`. In T002, `source`
   identifies the entry mechanism. The origin of an observed platform display is
   not a separate structured field and may be preserved only as factual notes;
   no platform adapter or automatic retrieval is implied.
6. Corrections use full-snapshot, linear, append-only amendments with a required
   reason. The original and all intermediate observations remain recoverable,
   and stale amendments are rejected.
7. T002 exposes no update-in-place or delete use case for runs, outcome
   observations, consumption observations, or amendments.

Any future change to one of these decisions requires a new or superseding
founder-approved decision record and a separately reviewed assignment change.

## Owner and approval

- **Decision owner:** Founder
- **Prepared for review by:** Codex
- **Approval date:** 2026-08-24
- **Implementation owner:** Codex
- **Implementation authority:** Limited to the separately founder-approved T002
  assignment
