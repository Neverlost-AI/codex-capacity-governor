# Decision 0005 (DRAFT): Baseline-denominator history adjustment V2

## Status and authority

**PROPOSED / NOT FOUNDER-APPROVED / NOT IMPLEMENTATION AUTHORITY.** Decision 0003 remains the accepted Gate B V1 method. This draft is a concrete successor option for review of [concern 001](../FORECAST_CALIBRATION_CONCERN_001.md) and [T006 milestone analysis](../T006_CALIBRATION_AND_MILESTONES_DRAFT.md). Accepted [Decision 0006](0006-t006-governed-outcome-recording-v1.md) narrows concern 001 so outcome-only T006 may receive a separate implementation grant while the loader stays blocked. This draft does not permit a history loader, new engine formula, migration, backfill, or T006 implementation. If this method is later approved, its implementation still needs its own bounded grant and exact baseline.

## Proposed decision, conditional on founder approval

For a V2 history-informed forecast only, each eligible `COMPLETED` run/bucket would retain (a) its issued original forecast for comparison, (b) its exact **unadjusted cold-start baseline** `E0_h` from that historical forecast, and (c) separately reviewed compatible normalized actual implementation `A_h`. Define a distinct `baselineAdjustmentFactor_h = A_h / E0_h` when `E0_h > 0`. After the approved minimum compatible history, `adjustedExpected_current = E0_current × median(baselineAdjustmentFactor_h)`. Calculate with exact rationals; apply public 100-bp rounding to the final range once. Preserve every candidate, reason, factor, median, both baselines, adjusted result and all versions for deterministic replay. With insufficient or incompatible history, use cold start with explicit reasons.

This factor is **not** Decision 0003's reported `CalibrationRatio = Actual / issued Expected`. The latter, plus SignedError, AbsoluteError and RangeHit against the issued original forecast, would remain for compatible completed-run comparisons unless separately changed. `PARTIAL`/`FAILED` are lower-bound consumption evidence only. No overall accuracy percentage or retroactive policy recomputation is proposed.

Proposed default for review: retain Decision 0003's three-observation minimum, five-observation possible HIGH threshold, 90-day recency, same project/repository and bucket-class filters, and independent per-bucket accounting. These are **not newly approved V2 settings**. Consistency/confidence treatment must be reviewed explicitly, especially whether the existing maximum/minimum rule applies to the newly named factors and how exact zero actuals behave. No cross-bucket or provider-unit conversion is implied.

## Compatibility and unresolved founder rulings

1. Should verified V1 cold-start and V1 adjusted historical observations be admitted to V2 if their exact `baselineExpected` and separately reviewed actual are recoverable, or should all V1 history remain excluded? The current same-method/config/profile filter would exclude them without an approved cross-version rule. No silent backfill is allowed.
2. Which exact normalized-actual source mappings, human-review authority, bucket/reset/profile identity and amendment invalidation rules make a T002/T006 outcome compatible? Raw T002 `amount`/`unit` and remaining snapshots are not enough. Historical reset-cycle comparability is still deferred and needs an explicit ruling before cross-cycle use.
3. What V2 method/configuration/profile identifiers and contract fields preserve exact replay of V1 and V2 forecasts? Changes to public output/loader contracts require compatibility and migration review; existing immutable T005 attempts cannot be rewritten.
4. Loader placement is settled by Decision 0006: it is **outside outcome-only T006** and needs a separately approved fuller-product assignment. Exact scheduling, method/configuration versioning and implementation baseline remain future decisions; placement is not a reason to treat this draft formula as accepted.

Founder review options: **ACCEPT this V2 direction with explicit answers above**, **CHANGE** its formula/filter/version boundaries, or **HOLD/RETAIN V1** with disclosed drift. Acceptance of a method record alone must not be construed as an implementation grant.
