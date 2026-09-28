# Decision 0006: T006 governed-outcome recording V1

## Status and authority

**FOUNDER-ACCEPTED SCOPE DECISIONS T6-1–T6-7 — 2026-09-27.** This records the founder's acceptance of the seven choices in [the T006 assignment](../TRANCHE_006_GOVERNED_OUTCOMES.md), with the explicit bounded-run clarification below. It approves recording semantics and the outcome-only tranche boundary, **not** implementation, a branch, migration, PR merge, release, or deployment. A separate implementation grant must name an accepted `main` baseline.

Decision 0001 remains authoritative for the existing `UNGUIDED` recording vocabulary. Decisions 0002 and 0003 remain authoritative for policy and forecast/comparison semantics. This later ruling refines the future-work placement described in T005 Decision 0004/F7: the history loader is **not** included in outcome-only T006. It does not rewrite T005 evidence or Decision 0004's historical record. [Concern 001](../FORECAST_CALIBRATION_CONCERN_001.md) is narrowed separately in this documentation change. Decision 0005 remains a **DRAFT**, not an accepted forecast-method change.

## Context

T005 saves an immutable manual cold-start evaluation, including non-authorizing results, but it does not link an execution run to that evaluation or record compatible per-bucket actuals. T002 can record factual `UNGUIDED` runs but cannot silently turn its raw units into forecast-comparable bucket evidence. The first local prototype still needs outcome, comparison and history records, followed by separate T007 dogfooding and local release checks. A forecast-history loader has an unresolved feedback-method concern and is not necessary to record what happened.

## Accepted decisions

| ID | Accepted boundary |
| --- | --- |
| T6-1 | T006 records governed outcomes, append-only corrections, per-bucket comparisons and viewable factual history. Later preflights stay cold-start. Concern 001 blocks **automatic history loading**, not this outcome-only recording tranche. Its method question remains unresolved. |
| T6-2 | A governed run links only to a saved `POLICY_EVALUATION` attempt. `PROCEED`, `DEFER`, `NARROW` and `STOP / PRESERVE` can be referenced, but the latter three authorize no work. Input rejections and `NOT_COMPOSABLE` attempts remain saved and do not establish a governed-run link; work after one may still be factually recorded through the existing `UNGUIDED` path. |
| T6-3 | One bounded development run links to exactly one saved evaluation attempt, and one attempt links to at most one run. A separate retry or new bounded execution needs a new reviewed revision and evaluation. An admitted local operator explicitly confirms the exact stored attempt, revision, receipt/digest and required bucket set using server-held, one-use evidence. Browser trust flags do not establish authority. |
| T6-4 | Adherence is a separate explicit operator report: `FOLLOWED`, `PARTIALLY_FOLLOWED`, `NOT_FOLLOWED` or `UNKNOWN`. `FOLLOWED` is valid only for a `PROCEED`-linked run; partial adherence requires a factual explanation. It is not inferred from outcome, validation, usage or the policy result, and is not independent proof of compliance. |
| T6-5 | Manually reviewed actual usage is recorded per exact capacity bucket/window/reset cycle and `IMPLEMENTATION`, `CORRECTION` or `VALIDATION` category. Accept explicit nonnegative decimal `PERCENT` or `BASIS_POINTS`; exactly `1% = 100 bp`, with no binary-float conversion, rounding or clamp of factual evidence. Preserve raw value, unit, source, observation/review provenance and exact converted amount. Missing stays unknown; entered zero is distinct. No provider-credit conversion or automatic T002 reinterpretation. |
| T6-6 | Corrections append a reasoned, complete replacement observation that retains all earlier versions. A current compatible `COMPLETED` implementation actual may be compared with the immutable issued range under Decision 0003. Compatible `PARTIAL`/`FAILED` consumption is lower-bound evidence only; missing, incompatible or superseded evidence is unavailable, not a fabricated comparison. |
| T6-7 | T006 completion alone does not make the first local prototype release-ready. T007 internal dogfooding and a local release checklist need separate approval and evidence. Local use is not authorization for a hosted public demo. |

### What counts as one run

One run is the **bounded development attempt** informed by the linked saved evaluation. Normal coding, testing, validation, correction of defects and fixes needed to finish that same bounded attempt remain within the **same run**, including work spanning multiple prompts or agent handoffs. A prompt, tool call, test invocation, or handoff is not by itself a new run and does not require a new evaluation. The one-run-per-attempt rule is not a per-prompt or per-agent limit.

A genuinely separate execution attempt after that run is concluded, or a materially changed scope or required bucket set, requires a new reviewed revision/evaluation before it can be recorded as a new governed run. This recording rule does not extend an old policy result into perpetual authorization: the historical decision remains the decision **at evaluation time**, and Gate A freshness, reserves and stop rules are unchanged. The system must not infer that later capacity is current merely because prompts stayed within one run.

## Consequences and limits

- T006 needs additive runtime contracts, application use cases and persistence. The accepted assignment specifies exact link, local confirmation, unit review, amendment, comparison and test boundaries. Existing T002 `UNGUIDED` rows and constraints remain intact; no retroactive relabeling or backfill follows from this decision.
- Factual bucket usage greater than one cycle is retained without truncation; it does not imply cross-cycle fungibility or policy permission. A manually asserted bucket/reset identity is retained as local evidence, not authenticated provider telemetry. Unknown cross-reset or unrelated activity cannot be silently allocated.
- Decision 0003's issued-forecast `CalibrationRatio` remains distinct from Decision 0005's proposed baseline-denominator adjustment factor. No V2 formula, forecast-confidence change, automatic loader, AI analysis, provider retrieval, hosted identity, accuracy claim or calibration input from T006 history is approved here.
- T007's sample worksheet and release criteria in the planning analysis remain a **separate draft protocol**. T6-7 accepts the need for that later gate, not its automatic execution or release sign-off.

## Alternatives considered

- Block all of T006 until a new forecast method exists, or include the history loader in T006. Not selected: the founder accepted outcome recording first while the loader remains blocked.
- Allow one evaluation to cover multiple distinct execution runs. Not selected: it could present stale evidence as reusable authorization. Multiple prompts and handoffs **within the same bounded run** are not separate executions.
- Treat a rejected/non-composable attempt as Governor guidance, derive adherence automatically, or convert arbitrary raw credit units. Not selected: each would assign authority or compatibility that the evidence does not establish.
- Update outcome history in place or treat incomplete runs as completed-scope calibration samples. Not selected: both conflict with accepted audit and comparison boundaries.

## Owner and next gate

- **Decision owner and approver:** Founder
- **Approval date:** 2026-09-27 (America/Denver)
- **Implementation owner/branch/baseline:** to be named in a separate grant after the reviewed documentation is accepted on `main`
- **No implementation or merge authority from this record.**
