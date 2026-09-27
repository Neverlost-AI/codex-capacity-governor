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
| T005 composed local preflight | Decision 0004/F1-F9; founder-accepted head `8681c05ea6eb7c48a71953e22c99c48e389e5206`; PR #11 normally merged in `82e2b96fbeeef69f7dae06fc416705392da54ccf` | Manual cold-start reviewed revisions, paired confirmation, immutable forecast/policy attempts and historical reopen. No governed outcomes or history loader. |
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

## T005 acceptance and verification

The [T005 assignment](TRANCHE_005_COMPLETE_CAPACITY_PREFLIGHT.md) and Decision
0004 remain historical scope records; their pre-implementation authority prose
must not be read as today's status. The founder separately granted T005
implementation after PR #10's accepted scope merge, then explicitly accepted
PR #11's exact final head `8681c05ea6eb7c48a71953e22c99c48e389e5206`.
[PR #11 acceptance comment](https://github.com/Neverlost-AI/codex-capacity-governor/pull/11#issuecomment-5860581395)
records that acceptance. PR #11 was normally merged into main as
`82e2b96fbeeef69f7dae06fc416705392da54ccf`. Independent exact-commit
review attempt 2 returned PASS. The reviewer did not author changes or grant
founder acceptance.

The [implementation notes](TRANCHE_005_IMPLEMENTATION_NOTES.md) retain the
detailed verification ledger. Builder final checks included 360/360 unit tests,
coverage, lint, typecheck, build, migration generation, and dev/built browser
E2E. The independent reviewer reran a focused 20-test set, full 360-test suite,
lint and typecheck, and inspected 16 browser screenshots. The final builder
format check on the Windows checkout still reported 36 unchanged CRLF paths;
canonical LF Git objects were 121/121 PASS. This is not an all-green checkout
format claim. The earlier overlapping heavy-run timeout cause remains
unresolved; subsequent isolated checks passed without weakening timeouts.
Two nonblocking T005 UI test-coverage gaps remain follow-up candidates:
optional reset/reserve rendering branches in the review summary, and low unit
line coverage in the access wrapper/legacy actions despite real guarded E2E
coverage. They do not reopen T005 acceptance or authorize work.

## Next proposed work and milestone boundary

The [T006 assignment draft](TRANCHE_006_GOVERNED_OUTCOMES_DRAFT.md),
[calibration/milestone analysis](T006_CALIBRATION_AND_MILESTONES_DRAFT.md) and
[draft method successor](decisions/0005-calibration-baseline-ratio-draft.md)
are founder-review planning only. T006 implementation is not authorized.
Concern 001 remains unresolved and T004's historical reset-cycle comparability
and upstream evidence authentication remain deferred. The founder must decide
whether the first-prototype T006 slice captures outcomes/comparison/factual
history with cold-start future forecasts, or also loads history after a
versioned method decision. The newer milestone wording favors a separate
fuller-product loader, but this is not yet an accepted scope revision.

The first local prototype is T005 plus governed outcomes/history, followed by
required T007 internal dogfooding and local release-readiness checks under a
future approved protocol and separate founder release decision. Existing
proto-dogfooding records are not formal T007 evidence. The fuller product also
seeks paste/upload specification intake, human-reviewed AI decomposition and
history-informed forecasting; the first two lack bounded assignments. T008's
hosted public demo/pilot is separately gated for identity, privacy and
operations. None of these stages follows automatically from PR #11.

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

[Calibration concern 001](FORECAST_CALIBRATION_CONCERN_001.md) is unresolved. Its
synthetic repeated-workload diagnostic is not production usage evidence or a
full-suite verification. Decision 0003 and engine formulas remain unchanged.
The accepted builder/reviewer development workflow is not a Governor-to-Codex
runtime integration. This planning packet is not implementation verification.
