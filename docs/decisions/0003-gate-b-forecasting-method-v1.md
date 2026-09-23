# Decision 0003: Gate B Forecasting Method V1

## Status

**Founder-approved and accepted — 2026-09-23**

This is the accepted, versioned Founder Decision Gate B artifact. Closing Gate B
does not by itself authorize Tranche 004 implementation. A separately
founder-approved bounded Tranche 004 assignment is still required before forecast
engine code may be written.

## Decision owner and scope

- **Decision owner:** Founder
- **Founder approval date:** 2026-09-23
- **Prepared for review by:** ChatGPT
- **Applies to:** Forecast Engine V1 method, range semantics, confidence,
  calibration-input rules, forecast-error semantics, and forecast-to-policy
  composition semantics
- **Does not decide:** Governor mode/decision/reserve logic, automatic Codex
  capacity retrieval, AI-authoritative task characterization, opaque machine
  learning, cross-platform normalization, billing, authentication, deployment,
  or later-tranche UI/persistence behavior

## Context

The Governor MVP requires a forecast before deterministic policy can decide
whether a proposed scope is affordable. The forecast must be useful before enough
history exists for statistical calibration, remain transparent when history is
used, preserve independent capacity buckets, and avoid false precision.

The Product Brief establishes the intended forecasting layers as task
decomposition, a transparent cost model, and historical calibration. The roadmap
requires low/expected/high planning ranges, confidence, explicit assumptions, a
cold-start path, comparable-history rules, forecast-error semantics, versioning,
and no guarantee interpretation.

Gate A already established that capacity is multi-bucket and non-fungible. Gate B
therefore produces bucket-specific planning demand rather than one global scalar.

## Terms and notation

### Required forecast bucket

A required forecast bucket is one explicitly identified capacity constraint for
which the proposed scope requires a planning estimate. Its identity must remain
compatible with the corresponding Gate A bucket identity.

For every required bucket `b`:

- `E0[b]` — cold-start baseline expected demand before historical adjustment;
- `R[b]` — history adjustment ratio when enough compatible history exists;
- `E[b]` — adjusted expected demand;
- `L[b]` — low planning case;
- `H[b]` — high planning case; and
- `Confidence[b]` — `LOW`, `MEDIUM`, or `HIGH`.

Forecast quantities use bucket-scoped basis points as the V1 planning unit.
Equal basis-point values across distinct buckets never imply fungibility.

### Work item

A work item is one reviewed, coherent portion of the proposed tranche used only
for forecast calculation. It is not an execution authorization or an
automatically selected narrower scope.

### Work score

Each work item receives one category base score plus deterministic factor
adders. The tranche work score is the sum of all reviewed work-item scores.

The score is a V1 planning abstraction. It is not an empirical claim that one
point always consumes a fixed amount of Codex capacity.

### Compatible history

Compatible history is prior completed-run evidence that satisfies every
comparison criterion in this decision. Existing raw history is not automatically
comparable merely because it contains a numeric amount and unit.

## Versioned V1 forecast configuration

The following values are accepted V1 configuration and must be retained with
every forecast result.

### Category base points

| Work category | Base points |
| --- | ---: |
| `DOCUMENTATION_CONFIG` | 1 |
| `TESTING_ONLY` | 2 |
| `FRONTEND_UI` | 3 |
| `APPLICATION_LOGIC` | 4 |
| `DATA_PERSISTENCE` | 5 |
| `INTEGRATION` | 6 |
| `REFACTOR_ARCHITECTURE` | 7 |

### Factor adders

| Factor | Value | Points |
| --- | --- | ---: |
| Complexity | `LOW` | 0 |
| Complexity | `MEDIUM` | +2 |
| Complexity | `HIGH` | +4 |
| Context load | `SMALL` | 0 |
| Context load | `MEDIUM` | +1 |
| Context load | `LARGE` | +2 |
| Repository condition | `STABLE` | 0 |
| Repository condition | `MIXED` | +1 |
| Repository condition | `UNFAMILIAR` | +2 |
| Dependency change | `NONE` | 0 |
| Dependency change | `EXISTING_ONLY` | +1 |
| Dependency change | `NEW_OR_CHANGED` | +3 |
| Validation burden | `LIGHT` | 0 |
| Validation burden | `STANDARD` | +1 |
| Validation burden | `EXTENSIVE` | +2 |
| Novelty | `FAMILIAR` | 0 |
| Novelty | `SOME_NEW_PATTERN` | +2 |
| Novelty | `HIGH_NOVELTY` | +4 |
| Correction exposure | `LOW` | 0 |
| Correction exposure | `MEDIUM` | +1 |
| Correction exposure | `HIGH` | +3 |

For a factor that explicitly supports `UNKNOWN`, V1 applies the highest listed
adder for that factor and forces forecast confidence to `LOW`. A missing or
unrecognized required field is contract-invalid and is not converted into
`UNKNOWN`.

### Cold-start scale

The initial V1 scale is:

`100 basis points per work point`

For every required bucket:

`E0[b] = WorkScore * 100 bp`

The same accepted V1 scale applies to every bucket unless a later
founder-approved versioned configuration explicitly introduces a bucket-profile
scale. No runtime caller or AI output may silently change this scale.

This value is a calibration prior, not an accuracy or productivity claim.

### Range bands

The accepted confidence-specific planning bands are:

| Confidence | Low | Expected | High |
| --- | ---: | ---: | ---: |
| `HIGH` | `0.90 * E` | `E` | `1.10 * E` |
| `MEDIUM` | `0.75 * E` | `E` | `1.25 * E` |
| `LOW` | `0.50 * E` | `E` | `1.50 * E` |

These values are planning bands only. They have no percentile, probability, or
coverage interpretation.

### Forecast rounding

V1 presents bucket forecasts at 100-basis-point planning precision.

- low rounds downward to the nearest 100 bp;
- expected rounds upward to the nearest 100 bp;
- high rounds upward to the nearest 100 bp; and
- for non-empty work, any positive rounded bound has a minimum displayed value
  of 100 bp.

Retain the unrounded rational calculation evidence. The rounded values are the
public V1 forecast quantities.

### History thresholds

- 0–2 compatible observations: no historical adjustment;
- 3 or more compatible observations: apply the median calibration ratio;
- 5 or more compatible observations are required before `HIGH` confidence is
  possible;
- compatible observations must be no more than 90 days old at the explicit
  forecast evaluation time.

## Decision

### 1. Forecasting method is deterministic weighted decomposition plus optional reference-class adjustment

Forecast Engine V1 uses reviewed work-item characterization and deterministic
versioned scoring to produce a cold-start estimate. Compatible prior runs may
adjust that baseline through a transparent reference-class ratio.

No model inference, hidden heuristic, random process, online learning, or opaque
statistical estimator exists inside the pure forecast engine.

The same forecast input, compatible-history input, explicit evaluation time, and
complete configuration must produce deeply identical semantic output.

### 2. Manual reviewed characterization is first-class

Each work item requires exactly one work category and the following reviewed
factor values:

- complexity: `LOW | MEDIUM | HIGH | UNKNOWN`;
- context load: `SMALL | MEDIUM | LARGE | UNKNOWN`;
- repository condition: `STABLE | MIXED | UNFAMILIAR | UNKNOWN`;
- dependency change: `NONE | EXISTING_ONLY | NEW_OR_CHANGED | UNKNOWN`;
- validation burden: `LIGHT | STANDARD | EXTENSIVE | UNKNOWN`;
- novelty: `FAMILIAR | SOME_NEW_PATTERN | HIGH_NOVELTY | UNKNOWN`; and
- correction exposure: `LOW | MEDIUM | HIGH | UNKNOWN`.

The source of reviewed characterization is retained as factual provenance.
Manual characterization must always be supported. AI may later propose values
behind a separately approved boundary, but AI output is never authoritative by
itself and does not execute policy.

### 3. Work score is explicit and reproducible

For each work item:

`ItemScore = CategoryBase + factor adders`

For the complete reviewed tranche:

`WorkScore = sum(ItemScore)`

Every item score and every contributing factor must be present in forecast audit
evidence. No hidden weight may affect V1 output.

### 4. Forecast demand remains independent per required bucket

Forecast Engine V1 emits `L[b]`, `E[b]`, `H[b]`, and
`Confidence[b]` for every explicitly required forecast bucket.

It must not:

- add bucket estimates together;
- average them;
- substitute one bucket for another;
- divide one global forecast across buckets; or
- treat equal basis-point estimates as interchangeable capacity.

The display-level overall confidence is the most conservative bucket confidence:

`HIGH < MEDIUM < LOW` in restrictiveness, so any `LOW` bucket makes overall
confidence `LOW`, and any `MEDIUM` bucket prevents overall `HIGH`.

### 5. Cold-start baseline is a versioned prior

For V1:

`E0[b] = WorkScore * 100 bp`

This rule is deliberately simple and inspectable. It is not described as
measured Codex consumption, an average user cost, or an accuracy guarantee.

Cold-start forecasting works with zero historical runs.

### 6. Range semantics are planning cases, not percentiles

- `expected` is the deterministic current point estimate under the accepted V1
  method.
- `low` is a plausible lower planning case.
- `high` is a conservative bounded planning case.

The three values must satisfy:

`0 <= L[b] <= E[b] <= H[b]`

They are not minimum/maximum guarantees and are not P10/P50/P90 or any other
statistical interval.

The system must use language such as “planning range” or “forecast range” and
must not imply a probability of correctness.

### 7. Confidence describes evidence quality, not probability

`LOW` means at least one required work-characterization factor is explicitly
`UNKNOWN`, or required forecast-profile evidence is incomplete but still
within an accepted forecastable boundary.

`MEDIUM` means all required characterization is known and fewer than five
compatible completed historical observations are available. A normal,
well-characterized cold start is therefore `MEDIUM`.

`HIGH` requires:

1. all required characterization is known;
2. at least five compatible completed historical observations exist for the
   bucket/profile; and
3. every calibration ratio is positive and
   `max(ratio) <= 2 * min(ratio)`.

If history exists but fails the consistency condition, confidence remains
`MEDIUM`.

Confidence never claims a probability that actual consumption will fall inside
the forecast range.

### 8. Historical adjustment uses a transparent median ratio

A prior observation may calibrate a forecast only when all are true:

- it belongs to the same project/repository scope;
- it refers to the same bucket class;
- it was produced under the same forecast method/configuration version;
- it uses the same bucket-profile version;
- the recorded run outcome is `COMPLETED`;
- compatible normalized actual implementation consumption exists for that
  bucket;
- its original expected forecast for that bucket is positive and recoverable;
- its evidence is no more than 90 days old at evaluation; and
- it has not been invalidated by an append-only correction that makes the
  candidate no longer satisfy the criteria.

For each compatible completed run:

`ratio = actualImplementation[b] / originalExpected[b]`

With three or more compatible runs:

`R[b] = median(ratios)`

and:

`E[b] = E0[b] * R[b]`

With fewer than three compatible runs:

`E[b] = E0[b]`

No outlier is deleted or hidden. Median aggregation limits the influence of one
extreme observation while every considered and included observation remains
auditable.

T002 raw manual values are not automatically calibration-compatible. A later
reviewed boundary must establish compatible normalized evidence before a T002
record can enter this calculation.

### 9. Insufficient and incompatible history never blocks cold start

Zero compatible history, insufficient history, stale history, incomparable
history, or history with incompatible units/configuration never fabricates an
adjustment. The engine falls back to the V1 cold-start baseline and records why
the history was excluded.

A lack of usable history alone does not reduce a fully known characterization
below `MEDIUM` confidence.

### 10. Forecasts may exceed one capacity cycle

Forecast ranges are planning demand and may exceed `10,000 bp`.

The engine must not clamp an expected or high forecast to one capacity cycle.
An estimate above `10,000 bp` is meaningful evidence that the reviewed scope
may require more than one bucket cycle.

Because Gate A V1 accepts policy demand only within its reviewed per-bucket
normalization range, an above-cycle forecast is not directly composable into
Gate A. The composition boundary must return a typed not-composable result
rather than truncating, clamping, automatically narrowing scope, or inventing a
multi-cycle policy demand.

T004 itself never returns `NARROW` or any Governor decision.

### 11. Forecast-to-Gate-A uncertainty mapping is fixed

For a forecast that is otherwise composition-compatible:

#### HIGH confidence

- supplied Gate A implementation demand: `E[b]`;
- Gate A uncertainty: `KNOWN`.

#### MEDIUM confidence

- supplied Gate A implementation demand: `E[b]`;
- Gate A uncertainty: `UNCERTAIN_BUT_BOUNDED`.

Gate A then applies its accepted exact `5 / 4` multiplier, making policy demand
equal to the V1 MEDIUM high planning case before the forecast's 100-bp display
rounding differences are reconciled through the reviewed composition contract.

#### LOW confidence

- Gate A uncertainty: `UNKNOWN_OR_INVALID`.

A LOW-confidence forecast may still be displayed as planning evidence, but it
cannot authorize work under Gate A V1.

The forecast engine does not itself evaluate Gate A or return a Governor
decision.

### 12. Forecast-error semantics apply only to compatible completed runs

For a compatible completed run and bucket:

`SignedError[b] = Actual[b] - Expected[b]`

`AbsoluteError[b] = abs(Actual[b] - Expected[b])`

`RangeHit[b] = L[b] <= Actual[b] <= H[b]`

`CalibrationRatio[b] = Actual[b] / Expected[b]`

These values remain bucket-specific.

For `PARTIAL` or `FAILED` runs, actual consumption remains valuable evidence,
but V1 must not label the difference from a full-completion forecast as forecast
error and must not use that run to calibrate the full-completion estimate.

When expected demand is zero, actual evidence is missing, or units are not
compatible, the relevant ratio/error comparison is explicitly unavailable
rather than fabricated.

V1 does not publish an overall “accuracy percentage.”

### 13. Calibration is evidence-driven but not opaque learning

Historical adjustment is the only automatic V1 calibration behavior. It is fully
defined by the compatibility filter and median ratio above.

The system must retain:

- which candidate observations were considered;
- why each was included or excluded;
- each included ratio;
- the median ratio;
- the pre-adjustment baseline;
- the adjusted expected value; and
- the method/configuration versions.

A future method may alter weights, profiles, recency, or calibration rules only
through a new versioned founder-approved decision/configuration. Existing
forecasts remain reproducible under their original version.

### 14. Evaluation time is explicit

Forecast evaluation time is caller-supplied input.

The pure forecast engine must not call the system clock. History recency and all
time-sensitive behavior are evaluated only against the explicit evaluation time.

### 15. Assumptions and unknowns are output evidence

Every forecast returns explicit structured assumptions and unknowns.

At minimum, assumptions identify:

- the accepted V1 work-point scale;
- the range-band configuration;
- any default/cold-start behavior;
- whether history adjustment was applied; and
- any accepted profile/configuration value used.

Unknowns identify every `UNKNOWN` work factor and any unavailable history or
profile evidence that materially reduces confidence.

Explanations must not turn assumptions into factual claims.

### 16. Forecast output is immutable semantic evidence

The public pure engine output contains, at minimum:

- scope/tranche identity;
- every required forecast bucket identity;
- reviewed work-item characterization and source provenance;
- every item score and total work score;
- baseline expected calculation per bucket;
- compatible-history candidate references and inclusion/exclusion reasons;
- included ratios and median adjustment ratio when applicable;
- unrounded and rounded low/expected/high values per bucket;
- per-bucket confidence;
- overall display confidence;
- assumptions and unknowns;
- forecast method version;
- configuration version;
- bucket-profile version;
- explicit evaluation time; and
- deterministic calculation/rounding evidence sufficient to reproduce the
  result.

A later amendment or new forecast creates new evidence. It does not mutate the
prior forecast result.

## Invariants

1. Forecasts remain independent per required bucket.
2. Bucket estimates are never summed, averaged, substituted, or made fungible.
3. Every public range satisfies `0 <= low <= expected <= high`.
4. Non-empty positive work never becomes a zero forecast because of rounding.
5. Cold-start forecasting requires no historical observations.
6. History affects a forecast only through the accepted compatibility filter and
   median-ratio procedure.
7. Partial and failed runs never calibrate a full-completion V1 forecast.
8. Existing T002 raw amounts are not silently normalized or reinterpreted.
9. Confidence is evidence-quality vocabulary, not a probability.
10. `LOW` confidence cannot authorize work through Gate A V1.
11. Forecast values may exceed one capacity cycle and are never clamped merely
    to satisfy the policy contract.
12. Forecast Engine V1 never returns Governor mode, primary decision, reserve
    allocation, or execution authorization.
13. AI output cannot silently determine reviewed forecast inputs or authorize
    work.
14. Identical input/history/evaluation-time/configuration produces deeply
    identical semantic output.
15. Every result retains enough versioned evidence to reproduce its calculations.
16. No savings, productivity, accuracy, or commercial-value claim is implied by
    the forecast result.

## Worked cold-start example

Reviewed tranche has one `APPLICATION_LOGIC` item with:

- category base: 4;
- complexity `MEDIUM`: +2;
- context `MEDIUM`: +1;
- repository `STABLE`: +0;
- dependencies `EXISTING_ONLY`: +1;
- validation `STANDARD`: +1;
- novelty `SOME_NEW_PATTERN`: +2;
- correction exposure `MEDIUM`: +1.

Total work score:

`4 + 2 + 1 + 0 + 1 + 1 + 2 + 1 = 12`

Cold-start expected:

`12 * 100 = 1,200 bp`

With all factors known and fewer than five compatible completed observations,
confidence is `MEDIUM`.

The planning range is:

- low raw: `900 bp`, rounded down to `900 bp`;
- expected: `1,200 bp`;
- high raw: `1,500 bp`, rounded up to `1,500 bp`.

Gate A composition uses expected demand `1,200 bp` with
`UNCERTAIN_BUT_BOUNDED`, producing the accepted policy-side adjusted demand of
`1,500 bp`.

## Worked history-informed example

The same reviewed scope has cold-start `E0 = 1,200 bp` and three compatible
completed observations with ratios:

- `1.10`;
- `1.25`;
- `1.40`.

The median ratio is `1.25`.

Adjusted expected:

`1,200 * 1.25 = 1,500 bp`

Three observations are enough to apply calibration but fewer than five, so
confidence remains `MEDIUM`.

The range is:

- low raw: `1,125 bp` → `1,100 bp`;
- expected: `1,500 bp`;
- high raw: `1,875 bp` → `1,900 bp`.

The output retains all three observation references and ratios.

## Worked unknown-input example

If the same tranche has `novelty = UNKNOWN`:

- novelty receives the conservative high-novelty adder `+4`;
- confidence becomes `LOW`;
- the engine still produces a planning range; and
- Gate A composition maps the forecast to `UNKNOWN_OR_INVALID`, so the
  forecast cannot authorize work.

## Compatibility implications

- T001 `PreflightDraft` remains structural/manual evidence and is not silently
  reinterpreted as a complete Forecast V1 characterization.
- T002 run/outcome evidence remains factual and unchanged. Raw T002 units do not
  become calibration-compatible merely because Gate B now exists.
- T003 remains the sole deterministic Governor policy authority. T004 forecast
  output supplies planning demand and uncertainty evidence but never a policy
  result.
- The existing compile-time forecast placeholders may be replaced or refined in
  T004 only under a separate bounded assignment.
- No migration, persistence schema, UI, forecast code, or policy code change is
  authorized by this decision record.

## Alternatives rejected for V1

### Opaque ML or online learning

Rejected because V1 must be inspectable, reproducible, cold-start capable, and
auditable with very little history.

### Pure historical average without task characterization

Rejected because the MVP needs useful cold-start behavior and may have no
comparable prior runs.

### Pure task scoring with no history adjustment

Rejected as the long-term V1 method because the product thesis explicitly
requires forecasts to improve as evidence accumulates.

### Treat low/expected/high as statistical percentiles

Rejected because the V1 evidence base does not support calibrated probability
coverage.

### Make all cold-start forecasts LOW confidence

Rejected. A complete reviewed characterization can be useful planning evidence
even before historical calibration; it begins at `MEDIUM`.

### Allow LOW confidence to pass bounded policy uncertainty

Rejected. Unknown required characterization is intentionally non-authorizing in
Gate A V1.

### Clamp forecasts at 10,000 bp

Rejected because a forecast larger than one cycle is meaningful evidence about
scope size and should not be distorted to fit the policy contract.

### Automatically normalize existing T002 history

Rejected because T002 intentionally preserved raw factual units without Gate B
normalization semantics.

## Consequences

- Forecast Engine V1 can be implemented as a pure deterministic package.
- The first useful forecast requires no AI provider, database, or historical run.
- History can improve the planning estimate without creating an opaque model.
- The forecast-to-policy boundary is explicit and conservative.
- T004 must introduce reviewed runtime forecast/task/configuration contracts.
- T005 can compose T004 and T003 without either engine importing UI or
  persistence.
- T006 can later persist and expose forecast-versus-actual comparison using the
  error semantics accepted here.
- Forecast quality must be evaluated empirically during dogfooding; this decision
  makes no claim that the accepted V1 coefficients are already accurate.

## Final founder rulings

Founder approval on 2026-09-23 explicitly accepts:

1. the cold-start V1 scale of `100 bp per work point`;
2. the confidence bands:
   - `HIGH: 0.90 / 1.00 / 1.10`;
   - `MEDIUM: 0.75 / 1.00 / 1.25`; and
   - `LOW: 0.50 / 1.00 / 1.50`;
3. the Gate A confidence mapping:
   - `HIGH -> KNOWN`;
   - `MEDIUM -> UNCERTAIN_BUT_BOUNDED`;
   - `LOW -> UNKNOWN_OR_INVALID`; and
4. the complete Gate B method and boundary semantics recorded in this decision.

Gate B is closed. Tranche 004 remains unauthorized until its separate bounded
assignment is founder-approved and implementation authority is explicitly
granted.
