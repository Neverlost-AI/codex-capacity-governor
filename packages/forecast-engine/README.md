# Forecast Engine V1

Pure, deterministic, non-authorizing implementation of [Decision 0003](../../docs/decisions/0003-gate-b-forecasting-method-v1.md) and the [T004 assignment](../../docs/TRANCHE_004_FORECAST_ENGINE_V1.md). It imports only runtime contracts. It does not read the clock, database, environment, provider SDK, or network, or call an AI model.

## Public boundaries

- `evaluateForecastV1(input: unknown)` returns a typed `INPUT_REJECTION` or `FORECAST_EVALUATION`; both have `authorizesWork: false`. Runtime contracts and types are exported from `@capacity-governor/contracts`.
- `projectForecastToPolicyDemandV1(forecast, bucketId)` returns typed `POLICY_DEMAND_EVIDENCE` or `NOT_COMPOSABLE`. It maps confidence to Gate A uncertainty and supplies rounded expected demand, but never evaluates policy.
- `compareForecastWithRunV1(candidate)` compares one original forecast with a compatible completed observation, or explicitly returns `NOT_COMPARABLE_FULL_COMPLETION` / `UNAVAILABLE`.
- `GATE_B_V1_CONFIGURATION` is the complete injected and schema-validated versioned configuration. Callers pass it with every evaluation; outputs retain it.

The input requires a non-empty explicit bucket set and matching caller-reviewed bucket authority tied to the tranche, reviewed work characterization and provenance, explicit evaluation time, and optional pure calibration candidates. The engine does not infer required buckets. The upstream boundary must establish the stated review and actor provenance; a string alone is not authentication. `ACCEPTED_INCOMPLETE` profile evidence requires an explicit actor and evidence reference and yields LOW confidence for that bucket.

## Calculation trace

Every work item scores category base plus seven factor adders. Explicit `UNKNOWN` uses its factor's highest accepted adder and forces LOW confidence; absent or unsupported values reject input. `WorkScore` is summed exactly and `E0[b] = WorkScore × 100 bp` is calculated separately for each required bucket.

History candidates are sorted by JavaScript UTF-16 code-unit order (as are work items, buckets, reasons and global evidence), never `localeCompare`. Each candidate is retained with stable inclusion/exclusion reasons. Compatibility requires the same project and repository, bucket ID/provider/window class, method and configuration, profile version, completed outcome, reviewed normalized actual implementation amount for that bucket, positive original expected, age at most 90 days against explicit evaluation time, and current non-superseded evidence. Historical reset-cycle identity is retained but does not have to match the current cycle. Raw T002 amounts/units cannot calibrate without a separate reviewed compatible normalized representation. No outlier is discarded.

With 0–2 included runs, adjusted expected equals E0. With 3+, adjusted expected is E0 times the exact rational median of `actual/originalExpected`; an even median is the exact mean of the middle pair. HIGH requires five positive ratios satisfying `max <= 2 × min`; a fully known cold start is MEDIUM. Incomplete accepted profile or explicit UNKNOWN is LOW. Overall confidence is the most conservative bucket confidence.

The versioned band is HIGH `9/10–11/10`, MEDIUM `3/4–5/4`, LOW `1/2–3/2` around adjusted expected. These are planning cases, not percentiles. Raw rational values remain in evidence; public low rounds down, expected/high round up to 100 bp, and positive work cannot be rounded down to zero. Unsafe public integer results reject rather than clamp. The output is deeply frozen semantic evidence.

## Worked fixtures

- Cold start: reviewed `APPLICATION_LOGIC` item scores `4+2+1+0+1+1+2+1 = 12`; each required bucket independently receives E0 1,200 bp, MEDIUM range **900 / 1,200 / 1,500 bp**.
- Compatible completed ratios `11/10`, `5/4`, `7/5` have median `5/4`. For E0 1,200 bp, adjusted expected is 1,500 bp; MEDIUM raw range is 1,125 / 1,500 / 1,875 and public range **1,100 / 1,500 / 1,900 bp**. Three runs calibrate but cannot make confidence HIGH.
- `novelty = UNKNOWN` adds four rather than two points and yields LOW confidence; it remains planning evidence but maps to `UNKNOWN_OR_INVALID` at projection.
- Twelve 12-point items yield expected **14,400 bp**, not 10,000. Projection returns `NOT_COMPOSABLE: PROJECTION_ABOVE_ONE_CYCLE` with 14,400 retained. Gate A, not Gate B, owns any action following this evidence.

Projection maps HIGH→`KNOWN`, MEDIUM→`UNCERTAIN_BUT_BOUNDED`, LOW→`UNKNOWN_OR_INVALID`. The projected rounded expected value is not itself inflated for uncertainty. The actual T003 demand and uncertainty schemas validate compatible projection evidence; the T003 evaluator alone owns its 5/4 bounded-uncertainty adjustment, reserves, modes, and decisions. Projection does not establish bucket membership for policy; the retained authority is factual input evidence for a later reviewed composition boundary.

For compatible COMPLETED observations, comparison reports signed and absolute `actual−originalExpected`, inclusive range hit, and exact ratio. PARTIAL and FAILED observations retain actual as lower-bound evidence but receive no full-completion forecast error. Missing/incompatible actual or zero expected is explicitly unavailable. There is no aggregate accuracy measure.

## Verification and deliberate limits

Focused: `pnpm exec vitest run packages/contracts/test/forecast.test.ts packages/forecast-engine/test/forecast.test.ts` (or `node node_modules/vitest/vitest.mjs run …` on Windows if the workspace command shim fails). Full repo: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm db:generate`, and `git diff --check`. Coverage: `pnpm test:coverage`.

T004 intentionally does not persist forecasts or load history, create UI or application orchestration, generate AI characterization, use provider-specific conversion, change Gate A, or make accuracy/savings claims. A future reviewed boundary must supply compatible normalized actual evidence from T002; a future tranche may compose forecast and policy without either package acquiring the other's authority.
