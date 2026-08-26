# Decision 0003: Gate B forecasting method V1 — DRAFT

## Status

**DRAFT / NOT APPROVED / FOUNDER REVIEW REQUIRED**

This is a proposed, versioned Founder Decision Gate B artifact. It records a
reviewable recommendation; it does not record founder acceptance, does not close
Gate B, and does not authorize Tranche 004 or any implementation work.

## Decision owner and scope

- **Decision owner:** Founder
- **Founder review date:** Pending
- **Prepared:** 2026-08-25
- **Prepared by:** Codex
- **Proposed method version:** `gate-b-forecast-v1`
- **Applies to:** transparent deterministic Forecast Engine V1 semantics only
- **Controlling context:** `docs/MVP_ROADMAP.md`,
  `docs/ARCHITECTURE_CONTEXT.md`, and accepted Decision 0002
- **Options analysis:** `docs/GATE_B_FORECASTING_METHOD_OPTIONS.md`
- **Does not authorize:** code, runtime schemas, migrations, persistence, UI,
  Tranche 004, Gate B closure, AI analysis, provider retrieval, calibration
  automation, Gate B-to-policy composition, Gate B-to-outcome persistence, or a
  later tranche

No numbered decision below has yet been accepted as a complete row. The founder
has changed one recommendation and resolved sub-decisions within several held
rows. The founder may later accept, change, or hold any item without accepting
the rest.

## Founder review progress — 2026-08-25

The founder has resolved these cross-cutting sub-decisions:

1. Gate B forecasts implementation demand only; broader lifecycle or
   operational costs belong in a later layer.
2. Unmodified `EXPECTED` is the candidate Gate A `D[b]`. Demand, confidence/
   uncertainty evidence, and authoritative bucket provenance remain separate.
   Gate A owns the policy effect of uncertainty.
3. Preferred comparable history is at least five comparable completed runs
   inside the preceding 180 days. When that threshold is not met, older
   qualified completed history may be shown only as a separate, explicit
   fallback set with age and provenance.
4. Partial and failed runs are lower-bound evidence, not completed-scope point
   observations.
5. Gate B preserves raw demand above one normalized cycle without clamping;
   evaluator policy owns interpretation and consequences.

These rulings do not accept the complete Gate B method. The final checklist
marks every unresolved decision `HOLD` and records the explicit history-rule
`CHANGE`. Gate B remains open and this artifact remains draft.

## Context

The Governor MVP needs a useful planning range before historical calibration is
available. The method must remain manual-first, deterministic, transparent,
versioned, and auditable. It must improve from later evidence without hidden
machine learning or unsupported claims.

Decision 0002 establishes that policy capacity and demand are multi-bucket. For
each authoritative required bucket `b`, the policy boundary consumes a raw
implementation demand and one uncertainty state. It independently normalizes
that raw demand and never infers bucket membership. Gate B must preserve those
boundaries; one healthy or data-rich bucket cannot substitute for another.

Current T002 outcome evidence records factual actual consumption by category,
amount, unit, and source. It does not yet retain the Gate A provider/window/reset
identity needed for automatic multi-bucket comparison. This draft proposes no
reinterpretation or migration of T002 records.

## Proposed terms

### Forecast request

An explicit, actor-provenanced request for one bounded scope, one versioned
configuration, one authoritative required-bucket set, structured work
components, and manual evidence.

### Work component

A caller-defined part of the intact bounded scope. The forecast engine may
validate and aggregate components but must not invent components, missing work,
or a narrower tranche.

### Bucket forecast

One immutable result for one explicitly required bucket. It retains that
bucket's identity, component estimates, unadjusted and adjusted range, confidence
evidence, history cohort, assumptions, unknowns, exact calculations, and
versions.

### Low / expected / high

- `LOW`: optimistic plausible implementation demand under recorded favorable
  assumptions;
- `EXPECTED`: the central planning point judged most representative from the
  accepted evidence; and
- `HIGH`: conservative plausible implementation demand under recorded adverse
  assumptions and bounded risks.

These are not hard minimum/maximum values, percentiles, probabilities, or
guarantees.

### Confidence

An evidence-quality class explaining completeness, boundedness, and historical
support. It is not probability of completion, forecast accuracy, affordability,
or policy authorization.

### Qualified comparable completed run

A run that passes every approved bucket-family, unit, method/version,
task-shape, outcome, recency, completeness, and amendment-quality filter. Every
included and excluded candidate retains a reason.

### History adjustment suggestion

The median actual-implementation-to-expected-forecast ratio for one qualified
bucket cohort. It has no authority until an approved actor explicitly accepts it
for a new forecast.

### Forecast error

Per-bucket comparison evidence between an immutable original forecast and
compatible final actual implementation consumption. Error evidence never
rewrites either source.

## Proposed V1 configuration

These are recommended versioned values, not approved constants:

| Proposed configuration key | Recommended V1 value | Status |
| --- | ---: | --- |
| `methodVersion` | `gate-b-forecast-v1` | Pending |
| `rangeSemanticsVersion` | `plausible-planning-band-v1` | Pending |
| `historyAdjustmentMethod` | `median-actual-to-expected-ratio-v1` | Pending |
| `minimumComparableCompletedRuns` | `5` | Founder-resolved sub-decision |
| `preferredComparableAgeDays` | `180` | Founder-resolved sub-decision |
| `olderHistoryFallbackAllowed` | `true`, separate and explicit | Founder-resolved sub-decision |
| `coldStartConfidenceCeiling` | `MEDIUM` | Pending |
| `historySuggestionRequiresAcceptance` | `true` | Pending |
| `policyDemandCandidatePoint` | unmodified `EXPECTED` | Founder-resolved sub-decision |
| `forecastScope` | implementation demand only | Founder-resolved sub-decision |
| `clampAboveOneCycle` | `false` | Founder-resolved sub-decision |
| `lowRoundingDirection` | down/outward | Pending |
| `expectedRoundingDirection` | up/outward | Pending |
| `highRoundingDirection` | up/outward | Pending |
| `aggregateAcrossBuckets` | `false` | Controlled by Decision 0002 |
| `statisticalOutlierDeletion` | `false` | Pending |

The exact high-confidence history-quality threshold, extreme-factor review
boundary, and effect of partial/failed evidence remain explicit founder
questions rather than hidden configuration.

## Proposed decision

### 1. Initial forecasting method — pending

#### Available options

1. Fixed rule table from taxonomy to numeric demand.
2. Manual three-point range only.
3. Manual component decomposition plus an optional accepted reference-class
   adjustment.

#### Recommended V1 choice

Choose option 3. Manual component-level `L/E/H` inputs are the numeric cold-start
authority. Taxonomy supports comparison, confidence, and explanation; it does
not apply hidden numeric weights. Qualified history may propose a deterministic
factor, but V1 applies it only after explicit acceptance.

#### Tradeoffs

This is useful without history and avoids invented default weights. It asks more
of the user and still depends on judgment. Reference-class quality depends on
strict comparability.

#### Assumptions

- The caller can supply an intact scope and at least one component.
- An undecomposed scope may be represented as one explicit component if the
  founder approves that fallback.

#### Founder ruling required

Accept the hybrid method, change it, or hold Gate B. Confirm whether one-component
manual fallback is valid.

### 2. Low / expected / high semantics — HOLD (partially resolved)

#### Available options

1. Hard minimum / most-likely / hard maximum.
2. Percentile-like points.
3. Non-probabilistic plausible planning band.

#### Recommended V1 choice

Choose option 3. Require nonnegative, monotonic points independently per bucket:

`0 <= L[b] <= E[b] <= H[b]`

Retain all component inputs. Round low down and expected/high up when whole
policy-compatible values are needed. Never combine buckets.

The founder has accepted that the range forecasts **implementation demand
only**. Correction and validation exposure remain separate
characterization/reserve evidence and are not folded into `D[b]`. Broader
lifecycle or operational cost forecasting belongs in a later layer.

The founder has also accepted preservation of authoritative raw values above
one normalized cycle. Gate B never clamps `1.4` cycle-equivalents to `1.0`,
normalizes it into T003's accepted one-cycle range, or chooses a policy
consequence.

#### Tradeoffs

The range is honest at cold start but not probabilistic. Manual assumptions are
central. Separate reserve evidence avoids double-counting but requires a later
composition contract.

#### Founder ruling required

Plausible-band meanings and directional rounding remain held. A future contract
must define a typed bridge representation for raw demand above T003's one-cycle
boundary while retaining the unchanged raw amount; the policy response is not a
Gate B decision.

### 3. Confidence semantics — HOLD (bridge boundary resolved)

#### Available options

1. Numeric probability.
2. `LOW | MEDIUM | HIGH` evidence-quality labels plus reasons.
3. Evidence profile without a headline label.

#### Recommended V1 choice

Choose option 2:

- `HIGH`: complete current evidence, no material unbounded unknown, and at least
  the approved qualified-history minimum with approved coverage/dispersion;
- `MEDIUM`: complete manual evidence with bounded unknowns; zero history is
  allowed;
- `LOW`: an evaluable range exists but material evidence limitations remain;
  and
- missing required numeric evidence produces a typed forecast rejection, not a
  confidence label.

Founder-accepted Gate A bridge boundary:

- unmodified `EXPECTED[b]` is the candidate raw `D[b]`;
- confidence and uncertainty evidence remain separate from demand;
- authoritative required-bucket provenance remains attached; and
- Gate A/T003 remains authoritative for normalization and the policy effect of
  uncertainty.

Gate B must not inflate or otherwise modify `EXPECTED` based on confidence. The
exact mapping, if any, from Gate B confidence labels to Gate A uncertainty
states remains held. A bridge may retain both until a mapping or caller-owned
translation is approved.

#### Tradeoffs

Labels are testable and consumable but compress nuance. Any later mapping into
Gate A uncertainty states is policy-significant because it may trigger Gate A's
bounded-uncertainty adjustment, mode cap, or fail-closed behavior. No such
mapping is approved here.

#### Founder ruling required

Approve the label meanings and evidence threshold for possible `HIGH`. Decide
whether confidence maps to Gate A uncertainty or travels as separate evidence
for caller interpretation. `EXPECTED` as candidate `D[b]` and separation of
demand/uncertainty are resolved.

### 4. Task inputs — pending

#### Available options

1. Unstructured brief only.
2. Small categorical taxonomy only.
3. Structured components, categories, and manual bucket ranges.

#### Recommended V1 choice

Choose option 3. Proposed inputs:

- scope/tranche identity and actor provenance;
- authoritative required-bucket collection and bucket-family evidence;
- component identity, title, description, and explicit exclusions;
- per-component/per-bucket raw `L/E/H` amount and unit;
- complexity `LOW | MEDIUM | HIGH | UNKNOWN`;
- novelty `FAMILIAR | PARTLY_FAMILIAR | NEW | UNKNOWN`;
- context readiness `COMPLETE | PARTIAL | MISSING`;
- explicit dependencies with `KNOWN | UNCERTAIN | BLOCKED` status;
- validation burden `LIGHT | STANDARD | HEAVY | UNKNOWN`;
- correction exposure `LOW | MEDIUM | HIGH | UNKNOWN`;
- assumptions, unknowns, and exclusions; and
- source/proposal/acceptance provenance.

AI may propose the same structure later, but it cannot establish authoritative
values or required-bucket membership.

#### Tradeoffs

This is transparent and supports comparison but increases input burden. The
taxonomy intentionally has no automatic weights in V1.

#### Founder ruling required

Approve values, required fields, one-component fallback, and who may accept an
AI/tool proposal.

### 5. Historical calibration and comparable-run rules — CHANGE

#### Available options

1. Any same-project history.
2. Exact equality across all evidence.
3. Hard compatibility filters plus approved categorical similarity keys.

#### Recommended V1 choice

Choose option 3. Numeric adjustment eligibility requires:

- same provider/manual source and capacity-window family;
- compatible raw unit or approved exact conversion;
- compatible forecast method/configuration cohort;
- `COMPLETED` intact-scope outcome;
- final bucket-linked `IMPLEMENTATION` actual consumption;
- no unresolved amendment or data-quality conflict;
- no in-scope deferred work;
- completion inside the preceding 180 days for the preferred set; and
- approved task-shape matching fields.

The founder has changed the recency rule:

1. The preferred set requires at least five qualified comparable completed runs
   inside the preceding 180 days.
2. If the preferred set contains fewer than five, older qualified comparable
   completed runs may be retained as fallback evidence.
3. The older set must remain separate, carry `OLDER_HISTORY_FALLBACK` status,
   retain every observation's age and provenance, and state that the preferred
   recent-history threshold was not met.
4. Older observations are never silently mixed into the preferred set.

Recommend same-project history only for V1 unless cross-project use, privacy,
and context controls are separately approved. Retain valid extreme
observations; use the median instead of deleting statistical outliers.

#### Tradeoffs

Strict rules protect meaning but may produce small cohorts. Same-project V1
reduces privacy/context ambiguity but slows learning.

#### Founder ruling required

The five-run/180-day preferred set and explicit older-history fallback are
resolved. Founder approval remains required for hard matching keys,
same-project scope, whether fallback evidence may produce a numeric suggestion,
and no statistical outlier deletion.

### 6. Cold-start / insufficient-history behavior — pending

#### Available options

1. Hidden or fixed numeric defaults.
2. Refuse forecasting without history.
3. Manual range, factor `1`, disclosed no-history status, and confidence ceiling.

#### Recommended V1 choice

Choose option 3. Complete bounded manual evidence produces a forecast with
`historyCount = 0`, factor exactly `1`, and maximum `MEDIUM` confidence. A valid
range with a material unbounded unknown remains evaluable with `LOW` confidence
so the proposed Gate A bridge can fail closed. Missing or invalid required
numeric or structural evidence returns a typed, non-authorizing forecast
rejection. No silent default is inserted.

#### Tradeoffs

Useful and honest, but user judgment drives initial quality. A quick-start preset
would need separately approved, visible, versioned factors.

#### Founder ruling required

Approve the `MEDIUM` ceiling, required manual evidence, and rejection versus
`LOW` boundaries.

### 7. Configurable assumptions and provenance — pending

#### Available options

1. Hard-coded defaults.
2. Versioned global configuration only.
3. Versioned configuration plus explicit actor-provenanced overrides.

#### Recommended V1 choice

Choose option 3. Retain stable key/meaning, exact value/unit/rational, source
kind, source references, actor/reference, `recorded_at`, method/configuration
version, proposal/acceptance status, and reason. An override creates a new
forecast and never mutates prior evidence.

Recommended source kinds:

- `FOUNDER_CONFIGURATION`;
- `MANUAL_EVIDENCE`; and
- `ACCEPTED_HISTORY_SUGGESTION`.

#### Tradeoffs

This is flexible and reproducible but needs explicit authority and
non-overridable boundaries.

#### Founder ruling required

Decide who may accept overrides, which values cannot be overridden, and whether
every history suggestion requires manual acceptance.

### 8. Forecast-error calculation — HOLD (partial/failed treatment resolved)

#### Available options

1. Expected-point absolute error only.
2. Signed, absolute, relative, and range-position evidence.
3. One aggregate accuracy score.

#### Recommended V1 choice

Choose option 2, independently per compatible bucket:

`signedError[b] = actualImplementation[b] - E[b]`

`absoluteError[b] = abs(signedError[b])`

`signedRelativeError[b] = signedError[b] / E[b]`, only when `E[b] > 0`

`absoluteRelativeError[b] = abs(signedRelativeError[b])`

Range position is `BELOW_LOW | WITHIN_RANGE | ABOVE_HIGH`. Positive signed error
means under-forecast. Preserve exact rational evidence; display rounding is
separate.

Across compatible runs, report cohort size and median signed/absolute relative
error. Never aggregate distinct bucket families or publish one accuracy score.

For `PARTIAL` and `FAILED`, consumption to date is lower-bound/adverse evidence,
not a completed-scope point error. Retain each observation independently by
bucket, compatible raw unit, observed amount/time, outcome, and provenance. For
that run, completed intact-scope demand is greater than or equal to the maximum
compatible consumed-to-date observation; repeated cumulative snapshots are not
summed.

Partial/failed records are excluded from completed-run counts, actual/expected
ratios, medians, and point-error summaries. They do not automatically raise a
different future scope's `L/E/H`. Numeric transfer requires separately accepted,
actor-provenanced applicability evidence and an approved rule. `COMPLETED` is
eligible only when the intact forecasted scope and actual evidence are complete.

#### Tradeoffs

This preserves direction and range performance but requires bucket-linked actual
evidence and careful zero handling. Excluding partial/failed point errors avoids
false success but delays numeric learning.

#### Founder ruling required

Partial/failed lower-bound treatment and exclusion from completed-run statistics
are resolved. Approve expected comparison, undefined relative error at zero
expected, rules for transferring an accepted lower bound into a future range,
confidence effects, and median cohort summaries.

### 9. Uncertainty disclosure — pending

#### Available options

1. Confidence label only.
2. Free-text caveat only.
3. Structured evidence plus concise plain language.

#### Recommended V1 choice

Choose option 3. Every evaluation retains assumptions/provenance, bounded and
unbounded unknowns, exclusions/deferred work, component contributions, history
cohort and exclusions, accepted factor, range width, rounding, confidence
reasons/ceiling, and exact versions.

Required proposed display statement:

> Planning range, not a guarantee or authorization.

No probability, savings, productivity, or accuracy claim is implied.

#### Tradeoffs

More evidence increases auditability and UI burden. Structured reasons are more
testable than free text.

#### Founder ruling required

Approve required evidence and language, the effect of material bounded versus
unbounded unknowns, and which fields must be user-visible.

### 10. Future calibration use — pending

#### Available options

1. Display history without numeric use.
2. Automatically adjust future forecasts.
3. Calculate a deterministic suggestion and require explicit acceptance.

#### Recommended V1 choice

Choose option 3. For each qualified completed observation `k` and bucket `b`
with positive expected demand:

`ratio[k,b] = actualImplementation[k,b] / expectedForecast[k,b]`

The suggested factor is the exact median ratio. After actor acceptance, apply
the same factor independently to `L[b]`, `E[b]`, and `H[b]`; round low down and
expected/high up. Retain the original range, factor, adjusted range, cohort,
actor, time, and version.

No background update, cross-bucket factor, model training, mutation, or hidden
outlier deletion is allowed.

#### Tradeoffs

This can improve future inputs transparently but adds a review step and remains
sensitive to cohort quality.

#### Founder ruling required

Approve median ratio, explicit acceptance, factor granularity, and whether an
extreme factor requires founder hold/review.

## Proposed deterministic procedure

For component `j` and bucket `b`, validate exact raw `L[j,b]`, `E[j,b]`, and
`H[j,b]` in one compatible bucket unit. Compute unadjusted bucket totals:

`L0[b] = sum(L[j,b])`

`E0[b] = sum(E[j,b])`

`H0[b] = sum(H[j,b])`

Let accepted bucket factor `F[b]` be exactly `1` at cold start or an explicitly
accepted factor from a source set whose numeric use the founder has approved.
The preferred source set has at least five qualified comparable completed runs
inside 180 days. If it does not, older fallback evidence remains separate with
age/provenance and does not silently gain numeric authority. Compute:

`L[b] = floor(L0[b] * F[b])`

`E[b] = ceil(E0[b] * F[b])`

`H[b] = ceil(H0[b] * F[b])`

when whole policy-compatible units are emitted. Retain exact pre-rounding
rationals and all raw inputs. Reject unsupported unit conversion and
non-monotonic or non-finite evidence. Never clamp a value into Gate A's range.

The procedure returns bucket forecasts in stable bucket order plus confidence,
assumption, history, factor, calculation, and version evidence. It does not call
policy or authorize work.

## Worked cold-start example

| Bucket | Component | Low | Expected | High |
| --- | --- | ---: | ---: | ---: |
| 5-hour | application change | 600 | 900 | 1,400 |
| 5-hour | integration support | 300 | 500 | 900 |
| weekly | application change | 120 | 200 | 350 |
| weekly | integration support | 80 | 120 | 250 |

With `F[5-hour] = F[weekly] = 1`:

- 5-hour forecast is `900 / 1,400 / 2,300 bp`, proposed `MEDIUM`;
- weekly forecast is `200 / 320 / 600 bp`, proposed `MEDIUM`.

No global expected amount is calculated.

Under the founder-resolved policy bridge boundary, expected values become raw
demand candidates unchanged. Confidence/uncertainty evidence and authoritative
bucket provenance travel separately. Gate A owns normalization and the policy
effect of uncertainty; Gate B does not pre-apply or bypass it.

## Worked history-informed example

Five qualified 5-hour actual/expected ratios are:

`11/10, 19/20, 6/5, 21/20, 23/20`

The sorted median is `11/10`. After explicit acceptance:

- `floor(900 * 11/10) = 990`;
- `ceil(1,400 * 11/10) = 1,540`;
- `ceil(2,300 * 11/10) = 2,530`.

Weekly remains `200 / 320 / 600` without its own qualified accepted factor.

If fewer than five qualified completed 5-hour observations occurred inside 180
days, those recent observations remain an explicit preferred-but-insufficient
set. Older qualified observations may appear only in a separate
`OLDER_HISTORY_FALLBACK` set with age and provenance. Their numeric use remains
held for founder approval.

## Partial / failed / completed examples

- `PARTIAL`, actual-to-date `800`, expected `1,400`: lower bound only; no
  `-600` point error.
- `FAILED`, actual-to-date `900`, expected `1,400`: adverse/lower-bound evidence;
  no completed-scope point error.
- `COMPLETED`, actual `1,600`, expected `1,400`: signed error `+200`, absolute
  error `200`, exact relative error `1/7`; with range `900..2,300`, position is
  `WITHIN_RANGE`.

The partial/failed values retain a lower-bound meaning only for their own intact
run. They never enter the five-run completed threshold, ratio cohort, median, or
point-error statistics.

## Proposed output boundary implications for a future T004 assignment

The future runtime contract should likely use a typed discriminated outcome:

### Forecast input rejection

- non-authorizing;
- stable validation IDs and useful paths/evidence;
- no fabricated range, confidence, or policy candidate; and
- no uncaught expected-validation exception.

### Forecast evaluation

One immutable per-bucket result containing at least:

- bucket and bucket-family identity supplied by the caller;
- retained component `L/E/H` raw amounts/units;
- unadjusted totals;
- qualified-history references and exclusions;
- suggested factor and accepted-factor evidence;
- adjusted `L/E/H` plus exact rounding evidence;
- confidence and stable confidence-reason IDs;
- assumptions, unknowns, exclusions, and sources;
- method/configuration versions;
- optional proposed Gate A demand/uncertainty candidate, clearly marked as a
  bridge candidate rather than policy output; and
- evaluation time supplied explicitly by the caller.

The bridge candidate must preserve raw `EXPECTED` even when it exceeds one
cycle, keep uncertainty/confidence separate, and retain authoritative bucket
provenance. It must expose that the value is outside T003's current accepted
one-cycle input range rather than clamp or reinterpret it. The evaluator/policy
layer owns any defer, rejection, split, scheduling, or other consequence.

The forecast engine must remain pure and must not import policy implementation,
UI, persistence, AI, provider SDK, environment, randomness, or system clock.

## Compatibility and migration implications

- Decision 0002 must remain unchanged.
- PR #3's policy evaluator must remain authoritative for policy normalization.
- A future composition layer must pass the authoritative required bucket set; a
  forecast cannot create it.
- Gate B supplies unchanged raw `EXPECTED[b]` as candidate `D[b]` and separate
  confidence/uncertainty evidence; it never inflates demand based on confidence.
- A forecast may emit raw `BASIS_POINTS`, `PERCENT`, or
  `NORMALIZED_FRACTION` evidence compatible with T003, but policy recomputes the
  normalized value.
- When a raw forecast exceeds one cycle, Gate B preserves it. Because T003's
  current public normalization boundary rejects values above one cycle, a future
  composition contract must retain the raw forecast and route policy
  interpretation without truncation. This draft does not change T003.
- T001 manual preflight fields must not be silently reinterpreted as approved
  multi-bucket forecast input.
- T002 actual consumption lacks bucket-family linkage required by this proposal.
  T006 may need additive reviewed records linking immutable actual evidence to a
  bucket and forecast snapshot. This draft authorizes no schema or migration.
- Forecast error and calibration are future evidence workflows. T004 may
  implement pure procedures/fixtures only if a later bounded assignment says so.

## Proposed invariants

1. Required bucket membership is explicit caller evidence, never forecast or AI
   inference.
2. Every required bucket is forecast independently; no cross-bucket arithmetic
   or substitution exists.
3. `0 <= L[b] <= E[b] <= H[b]` for every successful bucket forecast.
4. Manual operation works with zero historical runs.
5. Confidence never represents probability, affordability, or authorization.
6. History cannot mutate an existing forecast or outcome.
7. Partial and failed consumption is not a completed-scope point observation.
8. Valid extreme evidence is not silently deleted.
9. Exact raw inputs, configuration, calculations, provenance, and versions are
   recoverable.
10. Policy, not forecast, decides authorization.
11. AI proposals are non-authoritative until explicitly accepted.
12. Forecasts make no unsupported accuracy, productivity, savings, or guarantee
    claim.
13. Confidence/uncertainty evidence never changes raw `EXPECTED` demand.
14. Raw demand above one cycle is retained unchanged for policy interpretation.

## Explicitly outside this decision

- Gate A changes or policy-engine changes;
- Tranche 004 implementation or assignment authorization;
- final runtime schema names or persistence design;
- UI design and complete preflight composition;
- AI classification implementation;
- provider-specific or automatic capacity retrieval;
- cross-platform normalization;
- automatic/opaque calibration or machine learning;
- cross-user benchmarking or accuracy claims;
- authentication, billing, deployment, and pilot policy; and
- Gate B closure before explicit founder acceptance.

## Unresolved founder decisions

No complete numbered decision is accepted yet. The highest-impact remaining
questions are:

1. initial numeric method and whether history factors may adjust it;
2. plausible-band definitions, directional rounding, and exact confidence
   taxonomy;
3. whether confidence maps to Gate A uncertainty or remains caller-interpreted
   separate evidence;
4. comparable-history matching keys and whether the explicit older fallback may
   produce a numeric suggestion;
5. partial/failed lower-bound effects on later ranges/confidence and future
   bucket-linked actual-evidence contracts;
6. authority for accepting history factors and other assumptions; and
7. the exact typed bridge representation for preserved over-one-cycle demand.

## Founder review checklist

The current founder-review disposition records exactly one result per row. A
`HOLD` prevents the complete row from being treated as accepted even when
specific sub-decisions in that row are resolved.

| # | Gate B decision | Founder result | Resolved ruling / remaining approval |
| ---: | --- | --- | --- |
| 1 | Initial forecasting method | **HOLD** | Manual decomposition and history-factor method were not ruled. |
| 2 | Low / expected / high semantics | **HOLD** | Implementation-only scope and no clamping above one cycle are resolved; plausible-band meanings and rounding remain held. |
| 3 | Confidence semantics | **HOLD** | Unmodified `EXPECTED` is candidate `D[b]`; demand/uncertainty remain separate; taxonomy and any mapping remain held. |
| 4 | Task inputs | **HOLD** | Taxonomy, required fields, and one-component fallback were not ruled. |
| 5 | Comparable history | **CHANGE** | Prefer five completed comparable runs inside 180 days; older qualified history is separate fallback. Matching rules and fallback numeric use remain held. |
| 6 | Cold start | **HOLD** | Confidence ceiling and rejection boundaries were not ruled. |
| 7 | Assumptions/provenance | **HOLD** | Acceptance authority and override boundaries were not ruled. |
| 8 | Forecast error | **HOLD** | Partial/failed lower-bound treatment is resolved; complete error, confidence, and transfer rules remain held. |
| 9 | Uncertainty disclosure | **HOLD** | Separation of demand, uncertainty, and provenance is resolved; complete disclosure requirements remain held. |
| 10 | Future calibration use | **HOLD** | Median adjustment, source-set authority, and acceptance workflow were not ruled. |

Additional rulings required within those rows:

- exact typed bridge representation for preserved over-one-cycle raw demand;
- exact `HIGH` history-quality rule and any extreme-factor hold boundary;
- same-project versus approved cross-project comparable evidence;
- whether older fallback evidence may produce a numeric suggestion;
- actor authority for accepting suggestions/overrides; and
- additive future linkage between T002/T006 actual evidence and Gate A buckets.

Gate B remains open regardless of this draft's completeness. It closes only
after the founder records explicit accepted semantics, approval date, and owner.
Even a closed Gate B would not authorize Tranche 004 without a separate bounded,
founder-approved assignment and implementation authorization.
