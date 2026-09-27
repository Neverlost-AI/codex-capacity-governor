# Project status and acceptance ledger

## Authority

This ledger records observed repository state and explicit founder acceptance.
It grants no implementation, deployment, or merge authority. Accepted decision
records and separately approved assignments remain controlling. The roadmap now
includes current progress and the remaining MVP; historical readiness prose in
its original tranche descriptions must not override
the accepted records and merge evidence below.

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

**T005 — Complete Capacity Preflight: local implementation candidate prepared; independent review and founder acceptance pending.**

The finalized assignment is
[Tranche 005 assignment](TRANCHE_005_COMPLETE_CAPACITY_PREFLIGHT.md).
T001-T004 dependencies exist. The founder accepted F1-F7 as proposed for T005:
manual cold start, reviewed immutable revisions, confirmation/evaluate/save,
existing guidance only, historical reopened results, immutable attempt/plan
evidence and deferred governed-run/history loading. F8's concrete single-operator
local access/server-receipt boundary and F9's source precedence are now accepted.
Manual T005 does not automatically remove broader features from the first MVP.
PR #10's finalized scope documentation was independently reviewed at exact head
`c0c66cc5d989027f6b30d19e37baa042ffb20a84`, explicitly founder-accepted, and
normally merged at `2026-09-27T05:54:22Z` in
`8b790754cf167d73a76857e4e1e27e86d4793e20`.
[PR #10 acceptance comment](https://github.com/Neverlost-AI/codex-capacity-governor/pull/10#issuecomment-5853155596)
records that acceptance. The founder then expressly authorized COMPLETE T005
implementation, additive migrations, required tests, bounded fixes and local
commits on `feature/tranche-005-complete-capacity-preflight` from that accepted
baseline. This later explicit grant supersedes the assignment's historical
no-implementation-authority prose only; its settled F1-F9 requirements remain
controlling. Push, PR creation, implementation merge, deployment, T006-T008 and
external pilot work remain unauthorized.

[T005 implementation notes](TRANCHE_005_IMPLEMENTATION_NOTES.md) record the actual
implementation boundary, checks and remaining gates. No technical review pass
or successful test run is founder acceptance.

## Sources and limits

Reviewed README's product definition, architecture context, development
workflow, roadmap, Decisions 0001-0003, prior assignments and actual application,
contract, engine and database boundaries. A later authorized read-only search
located original V0.1 and later V0.2 Product Brief PDFs in Downloads and the
Capacity Governor folder in the configured Obsidian vault. Both briefs were read;
the folder contained governance/T003 materials rather than the brief itself.
No standalone brief is tracked. [Source reconciliation](PRODUCT_BRIEF_RECONCILIATION.md)
records exact provenance, hashes and accepted source precedence, with later
assignments and proposed first-MVP exclusions distinguished from T005 deferrals.
Discovery does not override later accepted decisions or F1-F9.

[Calibration concern 001](FORECAST_CALIBRATION_CONCERN_001.md) is unresolved and
must be resolved before T006. The docs-only read-only synthetic repeated-workload
diagnostic is not production usage evidence or a full-suite verification.
Decision 0003 and engine formulas remain unchanged. The accepted builder/reviewer
development workflow is not a Governor-to-Codex runtime integration.

The T005 candidate ran its own unit, coverage, type, lint, build, migration and
dev/built browser checks, with actual results and the Windows checkout formatting
discrepancy recorded in its implementation notes. Existing independent T004 and
workflow review results remain historical evidence, not review of this candidate
or a new verification of merged main. No implementation review attempt has run.
