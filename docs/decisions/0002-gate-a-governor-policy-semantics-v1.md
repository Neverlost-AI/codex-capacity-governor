# Decision 0002: Gate A Governor policy semantics V1

## Status

**Founder-approved and accepted — 2026-08-25**

This is the accepted, versioned Founder Decision Gate A artifact. Closing Gate A
does not by itself authorize Tranche 003 implementation. A separately
founder-approved bounded Tranche 003 assignment is still required before policy
code may be written.

## Decision owner and scope

- **Decision owner:** Founder
- **Founder review date:** 2026-08-25
- **Prepared by:** Codex
- **Applies to:** deterministic Governor policy semantics V1 only
- **Does not decide:** forecasting formulas, forecast confidence definitions,
  calibration, AI analysis, automatic capacity retrieval, provider-specific
  conversion formulas, authentication, billing, deployment, or later tranches

## Context

The Governor policy engine must determine what work is permitted from normalized
capacity, protected reserves, supplied policy demand, reset context, and
uncertainty. The architecture requires pure, deterministic, versioned,
explainable policy that cannot be overridden by AI output.

The initial Gate A proposal treated capacity as one global scalar. Founder review
rejected that assumption. Capacity is multi-bucket: a short-window constraint and
a long-window constraint may both govern the same work while representing
independent, non-interchangeable resources. Basis points normalize scale within a
bucket; they do not make different buckets fungible.

## Terms and notation

### Capacity bucket

A `CapacityBucket` is one explicitly identified capacity constraint/reset cycle.
Its identity must retain, at minimum:

- source/provider identity;
- capacity/window identity;
- reset-cycle identity;
- raw amount and raw unit;
- normalized basis points;
- observation time; and
- bucket-specific reset information when applicable.

The combination of source/provider, capacity/window, and reset-cycle identities
must distinguish one bucket from another. Identifiers are explicit evidence; the
policy must not infer that two differently identified buckets are the same.

### Per-bucket notation

For every active required bucket `b`:

- `A[b]` — normalized capacity currently available in bucket `b`;
- `C[b]` — protected correction reserve in bucket `b`;
- `V[b]` — protected validation reserve in bucket `b`;
- `I[b] = A[b] - C[b] - V[b]` — residual implementation allocation in bucket
  `b`; and
- `D[b]` — supplied implementation policy demand in bucket `b`, after any
  approved uncertainty adjustment.

There is no global scalar `A`, `C`, `V`, `I`, or `D`. The policy evaluates every
active required bucket independently and retains its results independently.

For V1, the caller supplies a non-empty set of active required buckets as
explicit authoritative caller/user evidence with actor provenance. Inclusion in
that set is the explicit assertion that the bucket constrains the proposed
scope. The policy engine must not discover, infer, add, remove, or silently omit
required buckets. AI must not establish, add, or remove an authoritative
required bucket. AI or other tooling may later propose that a bucket is missing,
but that proposal remains non-authoritative until a human/caller explicitly
accepts and records it.

### Aggregate result

The aggregate operating mode is the most restrictive per-bucket mode in this
order:

`FULL < CONSERVATION < LOW < CRITICAL`

The aggregate decision is determined by the approved ordered rules and the
specific all-blocking-buckets defer gate in this record. A healthy bucket never
relaxes a restrictive result from another active required bucket.

When bucket-level candidate decisions differ, the controlling total
restrictiveness order is:

`PROCEED < DEFER < NARROW < STOP / PRESERVE`

`DEFER` preserves the intact scope while authorizing no work now. `NARROW`
requires the user/caller to define a smaller coherent tranche and perform a new
preflight, so `NARROW` is more restrictive than `DEFER`.

## Versioned V1 policy configuration

The following values belong to versioned policy configuration. They are explicit
V1 choices, not timeless constants:

| Configuration key | V1 value |
| --- | ---: |
| `capacityBasisPointsPerCycle` | `10,000` |
| `correctionFloorShare` | `0.15` |
| `validationFloorShare` | `0.15` |
| `fullModeMinimumBp` | `6,000` |
| `conservationModeMinimumBp` | `3,500` |
| `lowModeMinimumBp` | `1,500` |
| `deferHorizonSeconds` | `86,400` |
| `maximumObservationAgeSeconds` | `1,800` |
| `boundedUncertaintyMultiplier` | `1.25` |

Every governed policy result must retain the exact policy version and complete
configuration used to produce it.

## Decision

### 1. Canonical representation is bucket-scoped basis points

Within one explicitly identified capacity bucket/reset cycle:

`10,000 bp = 100%`

Basis points normalize scale only. Values from distinct buckets must never be
averaged, summed, netted, reconciled, substituted, or otherwise collapsed into a
single amount.

Example:

- 5-hour availability: `7,800 bp`;
- weekly availability: `1,300 bp`.

These remain two constraints. The weekly bucket may restrict the aggregate result
even though the 5-hour bucket is healthy.

### 2. Normalization uses an exact whitelist

V1 permits only reviewed exact mappings within each bucket:

- basis points map 1:1;
- explicit percentages map by multiplying by `100`; and
- explicit normalized fractions map by multiplying by `10,000`.

The policy must:

- retain raw amount and unit beside the normalized value;
- reject rather than clamp unsupported units or values outside `0..10,000`;
- round available capacity downward to a whole basis point;
- round demand and reserve requirements upward to a whole basis point; and
- never use equal basis-point values to imply interchangeability across buckets.

An observed raw value such as `58` becomes `5,800 bp` only when its unit is
explicitly identified as `58%` of that bucket's reset cycle. An unknown `58
units` is unconvertible and fails closed.

Provider-specific or non-linear conversion requires a later approved decision;
it is not part of V1.

### 3. Allocation is calculated independently per bucket

For each active required bucket:

1. calculate `C[b]`;
2. calculate `V[b]`; and
3. allocate the residual `I[b] = A[b] - C[b] - V[b]`.

No residual or surplus from one bucket can fund another bucket.

Example:

| Bucket | `A[b]` | `C[b]` | `V[b]` | `I[b]` |
| --- | ---: | ---: | ---: | ---: |
| 5-hour | 7,800 | 1,170 | 1,170 | 5,460 |
| weekly | 1,300 | 195 | 195 | 910 |

The scope is constrained by both `I[5-hour]` and `I[weekly]`; these residuals are
not added together.

### 4. Correction reserve

For each bucket:

`C[b] = max(manualCorrectionMinimum[b], effectiveCorrectionShare[b] * A[b])`

The V1 default and minimum correction share is `0.15`. An explicitly entered
target may increase but not reduce that floor. The result rounds upward to a
whole basis point.

If no manual minimum or higher target is supplied, `C[b] = ceil(0.15 * A[b])`.
Correction reserve is bucket-specific and may be used only for correction or
recovery activity affecting that bucket.

### 5. Validation reserve

For each bucket:

`V[b] = max(manualValidationMinimum[b], effectiveValidationShare[b] * A[b])`

The V1 default and minimum validation share is `0.15`. An explicitly entered
target or requirement may increase but not reduce that floor. The result rounds
upward to a whole basis point.

Validation capacity is protected independently in every bucket. If validation
cannot be fully protected in any active required bucket, the aggregate policy
fails closed.

### 6. Reserve protection

Correction and validation reserves are hard ring-fenced per bucket:

- implementation may not borrow from either reserve;
- one bucket may not borrow another bucket's reserve;
- correction reserve may not be reassigned to validation or implementation;
- validation reserve may not be reassigned to correction or implementation; and
- unused reserve may be released only by a fresh preflight and new governed plan,
  never by mutating an existing plan.

If `C[b] + V[b] >= A[b]` for any active required bucket, that bucket has no
implementation allocation and triggers `STOP / PRESERVE` for new implementation.

### 7. Bucket-specific observation freshness

An observation is fresh only when both rules pass:

1. its wall-clock age is no more than `1,800` seconds; and
2. the system has no known capacity-consuming activity affecting that bucket
   after the observation time.

Exactly 30 minutes remains valid. An age greater than 30 minutes is stale.

Known post-observation activity stales the affected bucket immediately, even one
second after observation. A known activity event must identify each affected
bucket. It does not stale unrelated buckets.

Unknown external activity is not inferred. The absence of a known event does not
assert that no external activity occurred; it only means the event-based rule has
no evidence on which to invalidate the snapshot.

Example: an observation at 10:00 followed by a known run at 10:01 that consumes
the weekly and 5-hour buckets makes both observations stale at 10:01. A known
event explicitly affecting only the 5-hour bucket does not stale the weekly
bucket.

### 8. Reset timing is bucket-specific

Each bucket independently retains:

- reset-cycle identity;
- exact reset time and source timezone, when known;
- normalized UTC reset time;
- whether the reset is confirmed or uncertain; and
- explicit expected post-reset availability for that same bucket, when supplied.

A reset never makes current work affordable. Missing, uncertain, or rolling reset
information cannot justify `DEFER` in V1. The policy never assumes that a reset
restores `10,000 bp`.

A reset for bucket `x` must not be assumed to replenish bucket `y`. Cross-bucket
replenishment requires an explicit, separately approved source guarantee that
identifies every affected bucket.

### 9. Intact-scope defer semantics

For an unchanged scope, aggregate `DEFER` is eligible only when every currently
blocking bucket:

- has a confirmed qualifying reset no more than `86,400` seconds away; and
- has explicit post-reset availability sufficient for `D[b]`, `C[b]`, and
  `V[b]` in that same bucket.

Exactly 24 hours is eligible; 24 hours plus one second is not.

Healthy, non-blocking buckets need not reset. If even one blocking bucket lacks a
qualifying reset or sufficient post-reset availability, the intact scope is not
eligible for `DEFER` and falls through to the approved `NARROW` or `STOP /
PRESERVE` rules.

`DEFER` authorizes no work, expires at the relevant reset boundary, and requires
fresh observations for every active required bucket plus a complete re-preflight
before execution.

The all-blocking-buckets defer gate is more specific than ordinary decision
aggregation. A per-bucket defer candidate cannot make the aggregate decision
`DEFER` unless every blocking bucket satisfies this gate.

### 10. Per-bucket and aggregate operating modes

Each active required bucket is classified from `A[b]` using exact V1 boundaries:

- `FULL`: `A[b] >= 6,000 bp`;
- `CONSERVATION`: `3,500 <= A[b] < 6,000`;
- `LOW`: `1,500 <= A[b] < 3,500`; and
- `CRITICAL`: `A[b] < 1,500`.

Exact boundaries belong to the less restrictive listed mode: `6,000` is `FULL`,
`3,500` is `CONSERVATION`, and `1,500` is `LOW`.

The aggregate mode is the most restrictive per-bucket mode. For example, a
`FULL` 5-hour bucket and a `CRITICAL` weekly bucket produce aggregate `CRITICAL`.

Mode classifies capacity state; it does not prove that a particular scope is
affordable.

### 11. Uncertainty and fail-safe behavior

Uncertainty is supplied and evaluated per bucket:

- `KNOWN` — use the supplied demand without an uncertainty multiplier;
- `UNCERTAIN_BUT_BOUNDED` — use `ceil(D[b] * 1.25)` and cap that bucket's mode at
  no better than `CONSERVATION`; and
- `UNKNOWN_OR_INVALID` — trigger `STOP / PRESERVE`.

The aggregate mode and decision then use the adjusted per-bucket results. A
healthy known bucket cannot compensate for an unknown, invalid, or uncertain
constraint in another required bucket.

Gate B may later define how forecast evidence maps into these uncertainty states.
This decision does not define forecast confidence or formulas.

### 12. Ordered primary-decision rules

The policy first calculates and retains every per-bucket result, then applies the
aggregate ordered rules:

1. If any bucket triggers a mandatory stop, return `STOP / PRESERVE`.
2. If aggregate mode is `CRITICAL`, return `STOP / PRESERVE` for new
   implementation.
3. If every bucket satisfies `D[b] <= I[b]`:
   - return `PROCEED` when aggregate mode is `FULL` or `CONSERVATION`;
   - in `LOW`, return `PROCEED` only when the input explicitly identifies the
     scope as the minimum coherent unit; otherwise return `NARROW`.
4. If the unchanged scope is currently blocked and every blocking bucket passes
   the all-blocking-buckets defer gate, return `DEFER`.
5. If the scope is not currently affordable, no mandatory stop applies, and
   every blocking bucket retains positive safe implementation capacity, return
   `NARROW`.
6. Otherwise return `STOP / PRESERVE`.

`NARROW` does not authorize partial execution or invent a reduced scope. A user
must define a smaller coherent tranche and run a fresh preflight.

Aggregate restrictiveness examples:

| 5-hour result | Weekly result | Aggregate result |
| --- | --- | --- |
| `PROCEED` | `PROCEED` | `PROCEED` |
| `PROCEED` | `DEFER` | `DEFER` |
| `PROCEED` | `NARROW` | `NARROW` |
| `DEFER` | `NARROW` | `NARROW` |
| `PROCEED` | `STOP / PRESERVE` | `STOP / PRESERVE` |
| defer-eligible blocker | defer-eligible blocker | `DEFER` |
| defer-eligible blocker | non-defer-eligible blocker | fall through to `NARROW` or `STOP / PRESERVE` |

The decision restrictiveness order used after applying the specific defer gate is
controlling:

`PROCEED < DEFER < NARROW < STOP / PRESERVE`

This order is consistent with the primary-decision rules: the policy selects
`DEFER` before `NARROW` when every blocking bucket can preserve the intact scope
through a qualifying reset. If bucket-level candidate results conflict, such as
bucket A producing `DEFER` and bucket B producing `NARROW`, the aggregate
decision is `NARROW`.

### 13. Strict precedence

Rules are applied in this order:

1. invalid, missing, stale, or unconvertible inputs and mandatory stops;
2. aggregate `CRITICAL` mode;
3. reserve and required-validation feasibility in every bucket;
4. current unchanged-scope affordability in every bucket;
5. the all-blocking-buckets `DEFER` gate;
6. `NARROW`; and
7. `STOP / PRESERVE`.

A reset never upgrades current work to `PROCEED`. A healthy bucket never relaxes
another bucket. User preference may select a more conservative action but cannot
move upward through precedence.

### 14. Versioned mandatory stop list

Any one of these conditions in any active required bucket triggers aggregate
`STOP / PRESERVE`:

- missing, invalid, non-finite, or unconvertible required capacity evidence;
- duplicate bucket identity or ambiguous bucket identity;
- observation age greater than 30 minutes;
- known bucket-affecting capacity consumption after observation;
- a reset timestamp that has passed without a fresh observation;
- missing or invalid `D[b]`;
- `UNKNOWN_OR_INVALID` uncertainty;
- `CRITICAL` aggregate mode for new implementation;
- `C[b] + V[b] >= A[b]`;
- required validation cannot be fully protected in any bucket;
- an active mandatory tranche/repository stop condition;
- missing or unknown policy configuration/version;
- arithmetic overflow; or
- any violated policy invariant, including attempted cross-bucket aggregation or
  substitution.

The mandatory stop list is versioned configuration/evidence and must be retained
with the result.

### 15. Overrides and audit semantics

V1 permits no safety-relaxing override. A user may choose a more conservative
action. To pursue work after a restrictive result, the user must correct inputs
or scope and create a new preflight and governed plan; the original result remains
immutable.

Every evaluation must record, append-only:

- every bucket identity and whether it was active/required;
- the authoritative required-bucket-set evidence and actor provenance;
- raw and normalized observations per bucket;
- observation and known activity-event times;
- normalization rule/version per bucket;
- reset and expected post-reset evidence per bucket;
- uncertainty state and adjustment per bucket;
- `A[b]`, `C[b]`, `V[b]`, `I[b]`, and adjusted `D[b]`;
- per-bucket mode, decision evidence, reasons, and stop conditions;
- aggregate mode, aggregate decision, limiting/blocking bucket identities, and
  aggregation-rule identifiers;
- the minimum-coherent-scope attestation, including actor/reference,
  `recorded_at`, scope/tranche identity, and attested value;
- policy version and complete configuration;
- actor and record time; and
- any more-conservative user choice as a separate append-only event.

No evaluation, override attempt, correction, or later result may mutate prior
policy evidence.

## Invariants

1. Basis points never imply cross-bucket fungibility.
2. Every active required bucket is evaluated; no bucket is silently dropped.
3. A healthy bucket cannot override a restrictive bucket.
4. Correction and validation reserves are protected independently per bucket.
5. Implementation affordability never ignores either reserve in any bucket.
6. Unknown or invalid required evidence fails closed.
7. `DEFER` requires every currently blocking bucket to qualify.
8. A reset affects only its identified bucket unless an approved source guarantee
   explicitly states otherwise.
9. Known post-observation activity immediately stales every explicitly affected
   bucket; unknown activity is not inferred.
10. Every governed plan has exactly one aggregate mode and one aggregate primary
    decision, supported by recoverable per-bucket results.
11. AI output cannot authorize work or bypass deterministic policy.
12. Policy results and subsequent user choices are immutable, versioned, and
    auditable.

## Boundary examples

### Healthy short window, critical weekly window

- 5-hour: `A=7,800`, mode `FULL`;
- weekly: `A=1,300`, mode `CRITICAL`.

Aggregate mode is `CRITICAL`; aggregate decision is `STOP / PRESERVE`. The values
are not averaged to `4,550 bp`.

### One blocking bucket can reset

- 5-hour bucket is blocking and has sufficient explicit post-reset availability
  in 6 hours;
- weekly bucket is also blocking and has no confirmed reset within 24 hours.

The unchanged scope is not defer-eligible. It falls through to `NARROW` or `STOP
/ PRESERVE` under the ordered rules.

### All blocking buckets can reset

- 5-hour and weekly buckets both block the unchanged scope;
- each has a confirmed reset within 24 hours;
- each has sufficient explicit bucket-specific post-reset availability.

The aggregate decision may be `DEFER`. Fresh observations and a complete
re-preflight are mandatory after reset.

### Event-based staleness

- both bucket observations are 2 minutes old;
- known activity after observation consumes only the 5-hour bucket.

The 5-hour observation is stale immediately. The weekly observation is not
invalidated by that event. Aggregate evaluation fails closed because a required
bucket is stale.

### Bounded uncertainty in one bucket

- 5-hour `D=4,000`, `UNCERTAIN_BUT_BOUNDED`, adjusted to `5,000`;
- 5-hour `I=4,800`;
- weekly bucket is known and affordable.

The scope is not currently affordable because the 5-hour bucket blocks it. The
weekly bucket cannot compensate.

## T003 input contract implications

The future Tranche 003 assignment must review runtime schemas equivalent in
meaning to the following. Names are proposed for clarity and are not code
authorization.

### Replace scalar policy capacity with a required bucket collection

The policy input needs a non-empty `requiredCapacityBuckets` collection. Each
entry needs:

- stable `bucketId`;
- `providerId` or explicit manual-source identity;
- `capacityWindowId`;
- `resetCycleId`;
- raw amount and unit;
- normalized basis points and normalization rule/version;
- observation time;
- known post-observation activity evidence affecting that bucket;
- bucket-specific reset context;
- bucket-specific expected post-reset availability, when supplied;
- manual correction minimum/target, when supplied;
- manual validation minimum/target, when supplied;
- supplied `D[b]`; and
- per-bucket uncertainty state.

The collection-level authoritative evidence must retain the supplying
actor/reference and record time. An AI or tooling proposal about bucket
membership must use a separate non-authoritative contract and cannot alter this
collection unless a human/caller explicitly accepts and records the change.

The collection must reject duplicate `bucketId` values and duplicate composite
source/window/reset identities. It must not aggregate or deduplicate values by
amount.

### Activity evidence

Known capacity-consuming activity needs an explicit event contract containing:

- event identity;
- event time;
- affected bucket identities; and
- factual source/provenance.

Only identified affected buckets become stale. The policy must not invent events
for unknown external activity.

### Reset context

The current scalar reset placeholder is insufficient for governed policy. Each
bucket needs its own confirmed/uncertain reset state, exact timestamp where
confirmed, source timezone, reset-cycle identity, and optional explicit
post-reset basis points for the same bucket.

Cross-bucket replenishment must not be represented as an implicit shared reset.
Any later source guarantee would need an explicit versioned relationship listing
the affected buckets.

### Policy demand

T003 requires `D[b]` for every active required bucket rather than one scalar
forecast amount. Gate A treats it as supplied policy input. Gate B remains
responsible for any later forecast range, confidence, or method that produces
that demand.

The T003 contract must reject missing demand for any required bucket. It must not
derive one bucket's demand from another bucket or divide a global demand among
buckets.

### Scope metadata

The ordered LOW-mode rule requires an explicit authoritative
minimum-coherent-scope attestation. It must record, at minimum:

- actor/reference;
- `recorded_at`;
- scope/tranche identity; and
- attested value.

The policy engine and AI must not infer that a scope is the minimum coherent
unit. This assertion is policy-significant because it participates in whether
`LOW` mode may return `PROCEED`.

### Versioned policy configuration

The input/configuration boundary must carry all values in the V1 configuration
table, the decision/mode order, the mandatory stop-list version, normalization
rule versions, and a stable policy version. Tests must inject configuration;
pure policy functions must not hide these values as unversioned constants.

## T003 output contract implications

### Per-bucket results

The output needs one immutable result per required bucket containing:

- bucket identity;
- normalized `A[b]`, `C[b]`, `V[b]`, `I[b]`, and adjusted `D[b]`;
- raw and adjusted uncertainty state;
- mode;
- current affordability/blocking state;
- defer eligibility and reasons;
- mandatory stop conditions;
- deterministic reason/rule identifiers; and
- all rounding/normalization evidence needed to reproduce the result.

### Aggregate result

The output still has exactly one primary mode and one primary decision, but it
must also contain:

- aggregate mode;
- aggregate decision;
- limiting and blocking bucket identities;
- per-bucket results;
- all-blocking-buckets defer-gate evidence;
- triggered precedence/aggregation rule identifiers;
- mandatory stop conditions;
- policy/configuration version; and
- creation time.

The current compile-time placeholder `CapacityAllocation` with scalar
implementation/correction/validation quantities is insufficient. A future T003
contract must replace or refine it with per-bucket allocations. The placeholder
`GovernedExecutionPlan` must preserve per-bucket policy evidence rather than
implying one interchangeable capacity value.

### Explanation and audit output

Explanations must identify which bucket restricted the mode or decision and why.
“Insufficient capacity” without bucket identity and rule evidence is not an
acceptable V1 explanation.

Policy evaluation output is immutable. Any later user action or conservative
choice is a separate append-only audit event rather than a mutation of the
policy result.

## Compatibility implications

- Existing T001 `PreflightDraft` capacity and reserve fields remain structural
  manual evidence and must not be reinterpreted silently as multi-bucket policy
  input.
- Existing T002 actual-consumption and remaining-capacity records remain factual
  evidence and require no migration under this decision.
- A future application adapter may form a single explicit bucket from compatible
  legacy manual input, but only through a reviewed T003 boundary with visible
  bucket identity and normalization evidence.
- No migration, persistence schema, policy code, or UI change is authorized by
  this decision record.

## Alternatives rejected for V1

### Collapse buckets into one minimum, average, or total

Rejected because it destroys independent constraint identity and can let healthy
capacity conceal an exhausted required window.

### Let one reset replenish all buckets

Rejected unless an explicitly approved source guarantee identifies that exact
relationship.

### Treat basis points as globally interchangeable

Rejected. Basis points normalize scale, not resource meaning.

### Infer unknown external activity

Rejected. Event-based staleness uses known factual activity only.

### Permit a safety-relaxing override

Rejected for V1. Corrected inputs or scope require a new immutable evaluation.

## Final founder rulings

Founder final review confirmed that:

- the total decision restrictiveness order is
  `PROCEED < DEFER < NARROW < STOP / PRESERVE`;
- the required-bucket set is explicit authoritative caller/user evidence with
  actor provenance and is never inferred by policy or AI; and
- minimum-coherent-scope status is an explicit authoritative human/caller
  attestation with the evidence specified above and is never inferred by policy
  or AI.

Gate A is closed. Tranche 003 remains unauthorized until its separate bounded
assignment is founder-approved.
