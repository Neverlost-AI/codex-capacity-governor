# Calibration concern 001: repeated-workload feedback

## Status and authority

UNRESOLVED METHOD CONCERN — blocks **automatic history loading**, not the
founder-accepted outcome-only T006 assignment or a separately granted T006
implementation. The founder explicitly narrowed this gate through
[Decision 0006](decisions/0006-t006-governed-outcome-recording-v1.md) on
2026-09-27. The original diagnostic and unresolved method question remain.
This is not a revision to Decision 0003 or engine formulas. T005/T006 preflights
remain cold-start with an empty calibration-candidate set; this concern does not
authorize loading history or changing accepted T004 behavior.

## Concern

The current method calculates each eligible completed observation's ratio as
actual implementation consumption / original expected forecast, takes the median
after the configured minimum history, and applies it to the cold-start baseline.
If original expected was already historically adjusted, the denominator no longer
represents the baseline. Repeated identical workloads can therefore feed adjusted
forecasts back into adjustment of a different baseline. This may cause drift or
oscillation rather than convergence toward stable actual usage.

References: Decision 0003; `packages/forecast-engine/src/forecast.ts` functions
`historyFor` and `evaluateBucket`. This is a concern about the accepted method,
not permission to patch those functions.

## Read-only diagnostic against the existing engine

Executed `evaluateForecastV1` through Node/tsx in the existing T004 worktree,
without writing files. Used the existing `forecastInput`/`candidate` fixtures;
one required five-hour bucket; the same known 12-point characterization each run;
1,200 bp cold-start baseline; 30 sequential synthetic completed observations.
Each new observation had a distinct run/candidate/evidence/normalization reference,
the full rounded range returned for that run, a constant supplied actual, and
`currentEvidence: true`. Every previous observation was supplied to the next run.
Recorded times stayed at the fixture's preceding-day timestamp, inside the
accepted 90-day history window and before evaluation. Minimum adjustment history
remained three; public EXPECTED rounding remained upward to 100 bp.

For isolation, every synthetic history bucket used the same explicit reset-cycle
identity as the target. This does NOT resolve historical reset-cycle comparability
or model an actual cross-reset usage history. These inputs are synthetic supplied
evidence, not authenticated measurements or an accuracy benchmark.

| Constant synthetic actual | Forecast EXPECTED sequence (bp)                                      | Observation                                                                         |
| ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1,200                     | All 30 forecasts = 1,200                                             | Baseline-matching control remains stable.                                           |
| 2,400                     | Runs 1–3: 1,200; 4–6: 2,400; 7: 1,800; 8: 1,600; 9–30: 1,700         | After initially matching actual, forecasts settle below the supplied stable actual. |
| 600                       | Runs 1–3: 1,200; 4–6: 600; 7: 900; 8: 800; 9–30: alternating 900/800 | Forecasts move away from actual and oscillate.                                      |

The first root-checkout invocation could not resolve workspace package links;
the diagnostic succeeded in the already installed T004 worktree. Initial probes
also corrected the caller's result-field access to `bucketResults[].roundedRange`.
No dependency install, source/config edit or new test was performed. This limited
diagnostic is not a rerun of repository verification suites.

## Required resolution before any automatic history loader

- Reproduce sequential identical-workload cases as reviewed deterministic tests,
  including baseline-matching, higher and lower actuals, mixed cold/adjusted
  forecasts, rounding boundaries, and expanding versus deliberately selected
  comparable cohorts. Do not silently change the accepted selection method.
- Specify which denominator/baseline provenance a historical observation must
  retain and whether feedback from adjusted expectations is intended.
- Consider alternatives explicitly: retain the accepted ratio method with
  demonstrated limits; retain original cold-start baseline evidence for ratios;
  or another separately reviewed transparent method. No alternative is selected.
- Separately founder-review any method/configuration/contract change, including
  compatibility/versioning and historical evidence migration implications.
- Keep partial/failed observations out of completed-run statistics and preserve
  original observations. Do not reinterpret T002 raw evidence as normalized actuals.

Decision 0003 remains byte-unchanged. Decision 0005 remains draft. No
accuracy/savings claim, new calibration formula, cross-bucket conversion or
historical reset-cycle ruling follows from this document. The unresolved method
question gates an automatic history-informed forecast loader, **not** recording
governed outcomes, append-only corrections, compatible comparisons or factual
history under outcome-only T006. A later loader requires its own accepted
versioned method and separate implementation grant.
