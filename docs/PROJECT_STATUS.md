# Project status and acceptance ledger

## Authority

This ledger records observed repository state and explicit founder acceptance.
It grants no implementation, deployment, or merge authority. Accepted decision
records and separately approved assignments remain controlling. The roadmap's
original readiness labels and README's T002-era status have not yet been updated
to reflect all subsequent merges; use the evidence below to distinguish that
historical planning text from the current implementation state.

## Current accepted implementation

| Surface                       | Evidence                                                                                                                                                         | Current boundary                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| T001 manual project/preflight | Accepted foundation; existing application, UI, repositories and migration `0000`                                                                                 | Create, save and reopen structural manual drafts.                                                        |
| T002 run/outcome history      | Decision 0001; accepted assignment; PR #2 merged                                                                                                                 | UNGUIDED runs and factual append-only outcome amendments; migration `0001`.                              |
| T003 deterministic policy     | Decision 0002; accepted assignment; PR #3 merged in `d19c9f105dcc159ffbd917ae3f9416552151806c`                                                                   | Pure multi-bucket evaluation; no application/plan persistence.                                           |
| T004 forecast                 | Decision 0003; accepted assignment; founder-approved head `8e9e491aedf93aa59375ed0195cc2f8994447479`; PR #7 merged in `0d7cc7c225b0e1ef3ecd3b3a08f57f33923e26d0` | Pure forecast, projection and comparison helpers; no composed preflight, history loading or persistence. |
| Builder/reviewer workflow     | Founder-approved head `a72721f74d01aeea23cb849ebb46c97a7eed5c15`; PR #9 merged in `1f0bdbf30cd4d37f1f3f17153308e28b7c298260`                                     | Repository instructions and agent/skill configuration only.                                              |

T004's historical reset-cycle ambiguity and upstream evidence authentication
remain explicitly deferred. Neither acceptance resolves them. PR #8 contains
the separate T004 acceptance documentation proposal and remained open when this
ledger was prepared; it was not merged as part of PR #9 acceptance.

## PR #9 acceptance record

- Founder explicitly approved the exact workflow head in the current task.
- Before merge, GitHub reported the approved head, `MERGEABLE` and `CLEAN`.
- No status checks were reported. Main branch protection reported no required
  status checks. The branch-rules endpoint was unavailable under the repository's
  current GitHub plan; no admin/bypass option was used.
- Merge method: normal merge commit, consistent with recent repository merges.
- GitHub merge time: `2026-09-27T03:48:33Z`.
- Merge SHA: `1f0bdbf30cd4d37f1f3f17153308e28b7c298260`.
- Clean local `main` in `.data/worktrees/t004-forecast-engine-v1` was
  fast-forwarded to merged `origin/main`.
- Independent fresh-context review of the accepted head returned PASS with no
  P0-P3 findings. The reviewer authored no changes.
- Existing founder gates, bounded scope and permissions remain in effect.
  Reviewer PASS does not authorize a merge or a new tranche, and the
  implementation author cannot serve as the independent reviewer.
- Durable GitHub acceptance record:
  [PR #9 acceptance comment](https://github.com/Neverlost-AI/codex-capacity-governor/pull/9#issuecomment-5852420784).

## Next unfinished tranche

**T005 — Complete Capacity Preflight: planning only, not implementation-ready.**

The draft is
[Tranche 005 assignment](TRANCHE_005_COMPLETE_CAPACITY_PREFLIGHT_DRAFT.md).
T001-T004 dependencies exist, but application confirmation, trust, saved-result
lifecycle, guidance and persistence choices require founder review before code.
No T005 implementation branch or migrations have been created. T006-T008,
deployment and external pilot work remain unauthorized.

## Sources and limits

Reviewed README's product definition, architecture context, development
workflow, roadmap, Decisions 0001-0003, prior assignments and actual application,
contract, engine and database boundaries. No standalone Product Brief exists in
the tracked checkout, although Decision 0003 references one. Do not claim that
missing source was read; founder review must supply it or confirm the available
product definition is sufficient for this assignment.

This documentation pass did not rerun product test suites. Existing independent
T004 and workflow review results are historical evidence, not a new full-suite
verification of merged main.
