# T006 calibration concern and milestone options — founder-review analysis

## Status and current facts

**DRAFT / NOT APPROVED.** This analyzes [concern 001](FORECAST_CALIBRATION_CONCERN_001.md) without changing accepted Decision 0003 or production formulas. The diagnostic is synthetic and is not evidence of prediction accuracy. The T006 [assignment draft](TRANCHE_006_GOVERNED_OUTCOMES_DRAFT.md) and [draft successor decision](decisions/0005-calibration-baseline-ratio-draft.md) remain subject to founder review.

Decision 0003 currently requires three compatible `COMPLETED` observations for the median history adjustment, five for possible `HIGH` confidence, and a 90-day recency limit. Its comparison metrics use the **issued original expected forecast** for a completed run. The engine's `historyFor` calculates adjustment ratios as normalized actual implementation / `candidate.originalRange.expectedBasisPoints`; `evaluateBucket` multiplies the **current cold-start baseline** by their median. `ForecastBucketResult` already retains exact `baselineExpected` and `adjustedExpected`, alongside the rounded issued range. T005 passes an empty candidate list, so merged T005 forecasts are cold-start. T002 raw observations do not supply compatible bucket-normalized actuals. These accepted facts must not be replaced by older Gate B proposal numbers or assumptions.

## Why repeated workloads can bias V1

Let an otherwise identical work item have cold-start baseline `B = 1,200 bp` and stable actual implementation `A`. Once history dominates, the accepted V1 recurrence is approximately `next expected = B × (A / previous issued expected)`. A fixed point therefore satisfies `E² = B × A`, or `E = sqrt(B × A)` before rounding. This is a conceptual fixed-point explanation, **not** an empirical forecast result or exact description of a finite median cohort.

The existing 30-run read-only diagnostic used distinct synthetic completed observations, one bucket/profile, same explicit reset-cycle identity and 100-bp upward public EXPECTED rounding. It found:

| Stable synthetic actual | V1 issued EXPECTED sequence | Interpretation |
| --- | --- | --- |
| 1,200 bp | All 30 at 1,200 | Baseline-matching control. |
| 2,400 bp | Runs 1–3 at 1,200; 4–6 at 2,400; 7 at 1,800; 8 at 1,600; 9–30 at 1,700 | Initial match is not maintained. |
| 600 bp | Runs 1–3 at 1,200; 4–6 at 600; 7 at 900; 8 at 800; 9–30 alternate 900/800 | Oscillation away from supplied actual. |

For a mixed cold/adjusted three-observation example with `B = 1,200`, `A = 2,400`, and prior **issued** expected values `[1,200, 2,400, 1,800]`, V1 adjustment ratios are `[2, 1, 4/3]`; median `4/3` makes the current raw adjusted expected `1,600`. A baseline-denominator method using each historical run's own original unadjusted `E0 = 1,200` would have factors `[2, 2, 2]` and produce `2,400`, **if** those observations are otherwise eligible under a separately approved version rule. The issued-forecast comparison `CalibrationRatio = Actual / issued Expected` remains `[2, 1, 4/3]` for reporting; a proposed `Actual / historical E0` factor must have a different name and must not silently redefine Decision 0003's comparison field.

## Options and recommendation

| Option | Benefit | Cost / authority |
| --- | --- | --- |
| Keep V1 adjustment as-is | No method migration; accepted formula remains reproducible. | Repeated adjusted observations can move planning away from stable actuals. If deliberately retained, disclose limits and test actual cohorts; founder must accept the behavior before turning on a loader. |
| **Recommend versioned baseline-denominator V2** | Each observation compares actual with its **own** unadjusted baseline, avoiding recursive reuse of an already adjusted denominator for identical cohorts. Exact rational evidence can be audited. | Changes accepted Decision 0003 history adjustment, contract/method/config/profile versioning and loader compatibility. Requires a founder-approved successor decision and separately granted implementation. It does not prove general forecast accuracy. |
| Other reviewed method | Could address changing workloads or sparse cohorts. | New semantics, more evidence and broader validation; no transparent candidate is selected here. |

Proposed V2 rule, not adopted: retain each eligible historical run's exact unadjusted cold-start baseline `E0_h` and compatible normalized actual `A_h` for the **same bucket**. Let `factor_h = A_h / E0_h` as an exact rational; after the approved minimum count, multiply the **current** run's `E0_current` by the median factor, then perform public 100-bp range rounding once. No rounding before forming or aggregating factors. With otherwise identical `E0_h = E0_current = 1,200`, stable actuals 1,200, 2,400 and 600 yield factors 1, 2 and 1/2 respectively, so after threshold the corresponding expected values are 1,200, 2,400 and 600. That algebra describes those controlled examples only. Range/confidence/consistency semantics, if retained, need explicit founder version approval.

The successor decision must define exclusion and evidence rules, not merely swap the denominator:

- Mixed cold/adjusted history: historical **unadjusted** baseline provenance must be immutable and tied to the same historical run, forecast and bucket. Never reconstruct it from a rounded issued range. Existing `baselineExpected` may provide exact evidence for T005 attempts, but candidate contracts/loaders do not yet carry an approved baseline-denominator assertion.
- Recency and cohorts: retain or revise same project/repository, bucket class, method/config/profile, 90-day and evidence-currency filters deliberately. Larger unrelated cohorts need reviewed selection, not an invented similarity score. A median of expanding history may behave differently from a deliberately selected comparable cohort; test both without pruning unfavorable observations silently.
- Precision: 100-bp public rounding can produce steps/oscillation around a rational target. Test boundaries and keep the exact rational baseline, factors, median and adjusted expected for replay. Do not use rounded displayed `originalRange.expectedBasisPoints` as V2's baseline denominator.
- Zero/missing baseline or actual: no divide-by-zero, no imputed zero for missing raw categories, and typed exclusion/unavailable reasons. Non-positive or inconsistent factors must follow an explicit approved rule. `PARTIAL`/`FAILED` remain lower-bound consumption evidence, never full-completion forecast errors or adjustment candidates.
- Version/profile compatibility: decide whether V1 cold-start or V1 adjusted observations with verified `baselineExpected` may enter V2, or whether all V1 history stays excluded. Either is a founder decision; do not silently backfill, reinterpret or erase original V1 comparisons. A new method/config/profile identity and replay path must preserve prior issued forecasts.
- Historical reset-cycle identity remains ambiguous under T004's accepted deferral. Do not equate past and current reset IDs or make cross-cycle normalization by assumption. Founder must approve comparison criteria before a loader crosses historical cycles.
- Actuals: T002 source units, categories and remaining snapshots have no approved bucket normalization. Require explicit reviewed per-bucket actual evidence and mapping/version provenance before either method uses them. No provider-specific conversion follows from basis points alone.

## Milestone placement and next gates

The newly stated founder milestones differ from the older T006 bundle. The **first local prototype** is accepted T005 manual preflight/protected reserves/saved forecasts **plus** governed actual outcomes and queryable history, then **required T007 internal dogfooding and local release-readiness checks**. It is not complete at T005, and T007 is not optional polish. The **fuller product** additionally accepts paste/upload of an MVP or tranche specification, human review of AI-assisted decomposition, and forecasts informed by relevant personal build history. The approved Gate B/T004 pure history capability and a future T006-or-later loader address the last item only after method and evidence gates; paste/upload and AI-review workflows still lack bounded assignments and must be separately proposed. Manual input remains first-class. T008 is a distinct, separately authorized **hosted** public demo/pilot with identity, privacy and operations gates; local F8 pairing is not hosted approval.

Two placement choices need explicit founder ruling:

1. **Recommend A — outcome-only T006 first:** link governed runs, capture actuals, compare eligible completed outcomes and expose factual history. Keep later preflights cold-start. Resolve concern 001 as a documented method gate now, but authorize V2/loader only in a separately scoped fuller-product tranche. This yields first-prototype evidence sooner without silently changing accepted forecasting. Decide whether formal concern resolution is prerequisite even to outcome-only T006, as its current heading says, or only to enabling a loader.
2. **B — keep the older combined T006:** include history loader and V2 adjustment in first prototype. This delivers the full automated feedback loop earlier but conflicts with the newer fuller-product placement and expands T006 schema/method/replay/test scope. It requires explicit founder placement approval and a versioned successor to Decision 0003 before any build.

Neither choice retroactively changes Gate A policy decisions, a prior T005 attempt, T002 raw evidence, Decision 0003, or the accepted T005 F7 deferral. A review PASS on this packet would establish technical coherence, not founder adoption. The founder must separately decide the placement, method, cross-version history, normalization/adherence, local T007 release protocol and fuller-product assignments. No implementation should begin while those assignment-changing choices remain open.
