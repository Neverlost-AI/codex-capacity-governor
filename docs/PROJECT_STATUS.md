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
| T006 governed outcomes | Decision 0006; founder-accepted head `1a056573b2c8e064f0eebfc26a4f70113d6ff44e`; PR #13 normally merged in `4cb4c7030ba2216cf890e4748b198d703c5d6f35` | One bounded run per saved eligible evaluation, explicit outcomes/adherence, reviewed per-window actuals, append-only amendments, comparison and viewable history. Future preflights stay cold-start. |
| Private hosted foundation | Founder-accepted, independently reviewed local implementation at `30c8f21f944099dd563c927faf928166b78731cc`; Decision 0007 | Vercel/Supabase Free target with $0 incremental ceiling. Local code accepted; not pushed, merged, provisioned, deployed, or live-integrated by this acceptance. |
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
optional reset/reserve rendering branches in the review summary, and an
activity test that types `removed-window` but never actually removes a capacity
window. Separately, the builder noted low unit line coverage
in the access wrapper/legacy actions despite real guarded E2E coverage. These
limitations do not reopen T005 acceptance or authorize work.

## T006 acceptance and verification

The founder accepted the **exact** T006 head `1a056573b2c8e064f0eebfc26a4f70113d6ff44e`.
[PR #13's acceptance comment](https://github.com/Neverlost-AI/codex-capacity-governor/pull/13#issuecomment-5868910499)
records that ruling without changing the head. GitHub reported the accepted
head, `MERGEABLE` and `CLEAN`, with no status checks listed. Its branch-rules and
protection APIs returned a private-plan 403, so their settings were not
independently inspectable; the normal merge command succeeded without any admin
or bypass option. PR #13 merged at `2026-09-28T11:25:59Z` as
`4cb4c7030ba2216cf890e4748b198d703c5d6f35`. Clean local `main` was
fast-forwarded to that `origin/main` SHA.

On the final SHA, the **builder** ran the full 22-file/400-test suite, coverage
(86.18% statements, 80.75% branches, 87.24% functions, 86.88% lines), lint,
typecheck, build, migration generation, and E2E (14 pass/1 existing skip), plus
focused governed browser cases (2/2), changed-file Prettier and `git diff --check`.
The **coordinator** independently reran standard E2E on that SHA (14 pass/1
existing skip; terminal-hygiene check passed). The **independent reviewer**
reviewed the exact commit and returned PASS with no P0–P2 findings; they
personally ran changed-file ESLint, committed-blob Prettier and `git diff
--check`. Their read-only sandbox prevented a personal browser/Vitest rerun, so
the builder/coordinator results must not be called reviewer-run tests. The
nonblocking P3 notes that `networkidle` does not prove hydration and the
parallel-worker/early-click cause remains unproven. Repository-wide
`pnpm format:check` failed on 137 CRLF-formatted checkout paths, including
untouched files; changed committed blobs passed Prettier. This is not an
all-green repository-wide format claim.

## Next milestone boundary

The private hosted foundation is founder-accepted at the exact local commit
`30c8f21f944099dd563c927faf928166b78731cc` after separate exact-commit
review. This acceptance is not a merge or deployed verification. Decision 0007
selects Vercel and Supabase Free with a $0 incremental ceiling while preserving
all existing Supabase projects. Actual account eligibility, a separate Free
project slot, live Google/Vercel/Supabase integration and a no-cost recoverable
backup/restore path remain unverified. No push, merge, provisioning, deployment,
measured attempt or publication follows from this acceptance.

The [T006 assignment](TRANCHE_006_GOVERNED_OUTCOMES.md) and Decision 0006 are
historical authority/scope records; their pre-implementation grant language
does not override the merge above. The [calibration/milestone analysis](T006_CALIBRATION_AND_MILESTONES_DRAFT.md)
and [draft method successor](decisions/0005-calibration-baseline-ratio-draft.md)
remain planning, not a history-loader grant. Concern 001 blocks automatic
history loading. Historical reset-cycle comparability and upstream evidence
authentication remain deferred. Later preflights stay cold-start.

T005 plus T006 supplies the first local prototype's technical loop, **not**
formal internal evidence, hosted security or release approval. Founder direction
selects TodoMVC, URL Shortener and Exercise Tracker as the initial T007 builds
(medium/medium/large) with URL restart persistence. The [draft T007 protocol](TRANCHE_007_INTERNAL_TESTING_AND_LOCAL_RELEASE_DRAFT.md)
now sequences a separately approved [private-hosted foundation](TRANCHE_007_PRIVATE_HOSTED_FOUNDATION_DRAFT.md),
hosted authentication/storage/isolation verification, an exact
[challenge/test freeze](T007_PUBLIC_CHALLENGE_FREEZE_DRAFT.md), three separately
authorized attempts, and later reviewed sanitized public-demo copies. The
180-minute/1,500-bp per-bucket ceiling and worksheet await founder review;
no hosted service, measured run or publication is authorized. Existing
proto-dogfooding is not T007 evidence. Three builds collect initial factual
calibration observations but cannot establish forecast accuracy or enable a
history loader.
The fuller product also seeks paste/upload specification intake, human-reviewed
AI decomposition and history-informed forecasting; the first two lack bounded
assignments. A public interactive demo with isolated visitor simulations and
T008's invited pilot are separate gates; a founder-only private host does not
admit Neo or other participants. None follows automatically from PR #13.

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
