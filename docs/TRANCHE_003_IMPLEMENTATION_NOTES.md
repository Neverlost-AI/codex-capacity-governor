# Tranche 003 implementation notes

## Scope and entry points

Tranche 003 implements only the pure, deterministic Gate A V1 policy boundary
accepted in Decision 0002. The public entry point is
`evaluatePolicyV1(input: unknown)` from
`@capacity-governor/policy-engine`. Runtime input and outcome schemas are
exported from `@capacity-governor/contracts`.

The evaluator returns exactly one of:

- `INPUT_REJECTION`: contract-invalid evidence, `authorizesWork: false`, stable
  validation IDs, and no aggregate mode or decision; or
- `POLICY_EVALUATION`: an evaluable case with one aggregate mode and decision,
  independent per-bucket results, retained raw evidence, exact calculation
  evidence, stable rule/stop IDs, and the complete injected configuration.

Evaluation time is explicit input. The engine has no UI, application,
persistence, database, filesystem, network, environment, provider SDK, AI,
randomness, or system-clock dependency. It does not create or persist a governed
execution plan.

`sourceTimezone` is retained unchanged as non-empty factual reset evidence. The
contract does not consult the host OS or JavaScript runtime's timezone database,
infer an offset, or perform provider-specific conversion. `resetsAt` and
`normalizedUtc` remain strict offset-aware timestamps, and the evaluator
deterministically requires them to represent the same instant.

Policy timestamps accept no more than millisecond fractional precision because
the evaluator compares them with millisecond `Date.parse` values. Sub-millisecond
observations and reset timestamps are rejected at the input boundary, including
values that would otherwise collapse to the same instant or pass the 24-hour
defer boundary after truncation.

The evaluated tranche/scope ID is explicit input. Both required-bucket authority
and minimum-coherent-scope attestation must name that same ID, have a recorded
time no later than evaluation time, and carry a reference from an upstream
trusted boundary. The upstream caller is responsible for authenticating the
actor and establishing that provenance; `actorReference` alone is not proof.
Required-bucket authority also lists the exact bucket IDs it approved; the
contract rejects a different, missing, additional, or duplicated evaluated set.

## Versioning, normalization, and exact arithmetic

`GATE_A_V1_CONFIGURATION` is the reviewed injectable fixture. Its runtime schema
accepts only the exact Gate A V1 versions, integer thresholds, rational
numerator/denominator, and restrictiveness orders. The evaluator returns a deep,
immutable copy of that complete configuration with every successful evaluation.

All raw quantities use canonical nonnegative decimal strings and one exact
whitelist unit: `BASIS_POINTS`, `PERCENT`, or `NORMALIZED_FRACTION`. The
evaluator converts those strings to integer/rational values with `bigint`; it
does not first convert them to binary floating point. Available capacity and
post-reset availability round down. Demand and reserve requirements round up.
For current and post-reset availability, the exact rational amount is checked
against the configured per-bucket maximum before rounding. Thus
`100.001 PERCENT` is rejected rather than rounded down to `10,000 bp`.

Canonical output ordering compares JavaScript UTF-16 code units directly; it
does not consult locale settings or normalize Unicode identifiers.

For `A = 3,333 bp`, each default reserve is calculated as
`ceil(3,333 * 1,500 / 10,000) = 500 bp`, so `I = 2,333 bp`. For bounded demand
`D = 1 bp`, the adjusted demand is `ceil(1 * 5 / 4) = 2 bp`. Each result retains
the exact numerator, denominator, direction, and integer result.

## Representative multi-bucket behavior

For a required 5-hour bucket with `A = 8,000 bp`, `D = 2,000 bp`, and a required
weekly bucket with `A = 4,000 bp`, `D = 3,000 bp`, the buckets remain separate:

- 5-hour: `C = 1,200`, `V = 1,200`, `I = 5,600`, affordable, `FULL`;
- weekly: `C = 600`, `V = 600`, `I = 2,800`, blocked, `CONSERVATION`.

The 5-hour surplus is not borrowed by the weekly bucket. The aggregate result is
`CONSERVATION` and `NARROW`. No narrower scope is selected or returned.

When one blocker qualifies for `DEFER` and an affordable `LOW` bucket lacks a
true minimum-coherent-scope attestation, their candidates are `DEFER` and
`NARROW`; the injected order
`PROCEED < DEFER < NARROW < STOP / PRESERVE` produces aggregate `NARROW`.

For `PRA = 6,000 bp`, post-reset calculation starts again from that bucket's
`A_post`: `C_post = 900`, `V_post = 900`, and `I_post = 4,200`. Current reserves
are never reused. This is defer evidence only and does not authorize work.

## Typed boundary examples

A malformed input such as `{ "configuration": {} }` returns an
`INPUT_REJECTION` with `authorizesWork: false` and stable `INPUT_*` issues. It
contains no `aggregateMode` or `aggregateDecision`.

The exported outcome schema also rejects contradictory serialized evaluations:
authorization must agree with `PROCEED`; stops prohibit authorization; blocking,
affordability, defer eligibility, bucket candidates, and aggregate candidates
must agree. LOW authorization requires the bound true attestation.

A contract-valid input with `uncertainty: "UNKNOWN_OR_INVALID"` returns a
successful `POLICY_EVALUATION` with its normal per-bucket evidence, one mode,
aggregate `STOP / PRESERVE`, and
`STOP_UNKNOWN_OR_INVALID_UNCERTAINTY`. It is evaluable but authorizes no work.

## Stable identifier traceability

Focused tests are in `packages/contracts/test/policy.test.ts` and
`packages/policy-engine/test/policy.test.ts`. Test names below are stable review
anchors; the test runner reports any parameterized boundary cases separately.

| Validation identifier or boundary | Focused test |
| --- | --- |
| `INPUT_REQUIRED`, `INPUT_INVALID_TYPE`, `INPUT_INVALID_FORMAT`, `INPUT_INVALID_VALUE`, `INPUT_UNRECOGNIZED_KEY` | `returns a typed rejection without a fabricated mode or decision`; contract rejection tables |
| `INPUT_DUPLICATE_BUCKET_ID`, `INPUT_DUPLICATE_BUCKET_IDENTITY` | `rejects empty and duplicate required bucket evidence`; `rejects duplicate IDs and unknown activity bucket references` |
| `INPUT_DUPLICATE_ACTIVITY_ID`, `INPUT_DUPLICATE_ACTIVITY_BUCKET`, `INPUT_UNKNOWN_ACTIVITY_BUCKET` | `rejects duplicate IDs and unknown activity bucket references` |
| Unsupported versions/order/configuration | `rejects unknown, case-variant, and incomplete configuration`; `retains injected versioned orders and complete configuration` |
| Runtime outcome schemas | `round-trips successful and rejected outcomes through runtime schemas` |
| Exact availability maximum, before rounding | `accepts exact current availability maximum in ...`; `rejects immediately-over-maximum current availability in ... before rounding`; corresponding post-reset tests |
| Millisecond timestamp boundary | `rejects an observation 0.0001 ms in the future`; `rejects a reset 24 hours plus 0.0009 ms away`; `rejects distinct reset instants inside the same millisecond` |
| Authoritative evidence context and bucket set | `rejects future-dated ... evidence`; `rejects ... evidence from another evaluation context`; `does not treat the actor string alone as authenticated ... evidence`; `rejects authority that ...` |
| Contradictory serialized outcomes | `rejects contradictory serialized aggregate authorization and stop evidence`; `rejects contradictory serialized bucket candidates at both schema boundaries`; `rejects contradictory serialized post-reset affordability evidence`; `rejects LOW authorization when the bound attestation is false` |

| Stop identifier | Focused test |
| --- | --- |
| `STOP_EXTERNAL_MANDATORY_CONDITION` | `stops on an external mandatory condition` |
| `STOP_NORMALIZATION_CLAIM_MISMATCH` | `fails closed when a caller normalization claim disagrees` |
| `STOP_STALE_OBSERVATION_AGE` | `stales an observation immediately after the 30-minute boundary` |
| `STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION` | `stales only buckets affected by known post-observation activity` |
| `STOP_RESET_PASSED_WITHOUT_FRESH_OBSERVATION` | `stops when a reset passed after the retained observation` |
| `STOP_INVALID_RESET_EVIDENCE` | `stops on inconsistent confirmed-reset timestamp evidence` |
| `STOP_UNKNOWN_OR_INVALID_UNCERTAINTY` | `returns evaluable STOP/PRESERVE for unknown uncertainty` |
| `STOP_RESERVES_EXHAUST_CAPACITY` | `stops when reserves exhaust current capacity` |
| `STOP_VALIDATION_RESERVE_UNPROTECTED` | `stops when required validation cannot be protected` |
| `STOP_CRITICAL_MODE` | `stops new implementation in CRITICAL mode` |
| `STOP_POLICY_INVARIANT` | `stops on a policy invariant: future observation` |

| Rule group | Focused tests |
| --- | --- |
| Exact whitelist, reserve protection, and uncertainty rules | `owns normalization and applies directional rounding exactly`; `calculates exact 15 percent reserve floors`; `uses the exact 5/4 bounded-uncertainty multiplier` |
| `RULE_MODE_*` | `classifies ... bp as ...`; `always selects the most restrictive bucket mode` |
| Current affordability/blocking | `does not substitute a healthy bucket for a blocking bucket` |
| Bucket and all-blocker defer rules | `accepts a qualifying reset at exactly 24 hours`; `requires every blocking bucket to qualify for defer`; `does not infer defer evidence from reset kind ...` |
| LOW attestation rules | `allows LOW proceed only with minimum-coherent-scope attestation` |
| Decision and aggregation rules | `aggregates DEFER plus NARROW to NARROW`; `gives mandatory stops precedence over otherwise qualifying defer` |
| Stable evidence and ordering | `is deeply repeatable for identical input`; `is independent of bucket, activity, and affected-ID input order`; `canonicalizes composed and decomposed identifiers by UTF-16 code units`; `retains stable bucket-specific rule and stop identifiers` |

## Verification commands

Focused policy verification:

```text
pnpm --filter @capacity-governor/contracts typecheck
pnpm --filter @capacity-governor/policy-engine typecheck
pnpm test packages/contracts/test/policy.test.ts packages/policy-engine/test/policy.test.ts
```

Complete repository verification:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm db:generate
git diff --check
```

## Compatibility and deferred work

The former compile-time-only scalar policy placeholders were removed because
they implied globally interchangeable capacity. T001 `PreflightDraft` and T002
run/outcome contracts were not reinterpreted or changed. No application adapter
or legacy-to-bucket conversion was added.

There are no schema or migration changes. Persistence, UI, forecasts, forecast
confidence, calibration, provider-specific conversion, automatic capacity
retrieval, AI analysis, cross-bucket replenishment guarantees, inferred required
buckets, inferred minimum-coherent scope, narrowed-scope selection, and governed
plan persistence remain deliberately deferred.
