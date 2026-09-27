# T005 complete manual capacity preflight — implementation notes

## Authority and status

Baseline: `8b790754cf167d73a76857e4e1e27e86d4793e20`, accepted PR #10 head
`c0c66cc5d989027f6b30d19e37baa042ffb20a84`, normal merge at
`2026-09-27T05:54:22Z`. The [founder acceptance](https://github.com/Neverlost-AI/codex-capacity-governor/pull/10#issuecomment-5853155596)
and subsequent express COMPLETE T005 implementation/local-commit grant control
over earlier planning-only authority statements. All substantive requirements
of the finalized assignment and Decisions 0001–0004 remain controlling.

Implementation candidate is prepared on `feature/tranche-005-complete-capacity-preflight`.
No implementation acceptance, push, PR creation, merge, deployment or follow-on
tranche is authorized. A separate exact-commit reviewer will review the candidate;
the builder cannot approve it. Independent implementation review has not run
(0 of 3 review attempts used); the exact candidate SHA accompanies the handoff.

## Public application operations and evidence

`createComposedService` provides `prepare`, trusted-boundary `confirm`, `list` and
`reopen` through injected project/draft/composed repositories, ID factory, clock,
SHA-256 digest function, and complete accepted Gate A/B configurations. Production
calls use the existing real engines; neither engine source/configuration is changed.

The browser can submit only strict manual input fields. It cannot supply reviewed
flags, actor, record/evaluation time, provenance, forecast, confidence, mode or
decision. `prepare` verifies project/draft ownership and optional predecessor
ownership, assigns a new immutable scope/revision ID, and copies complete configs.
The F8 server boundary holds the exact pending snapshot and challenge in memory.
Both engines use the revision ID and identical required bucket IDs plus
provider/window/reset-cycle tuples. Explicit minimum scope Yes/No is separate
from the two review confirmations; no answer or factor is inferred.

`sorted-json-v1` recursively sorts object keys by UTF-16 code-unit ordering,
preserves arrays and exact factual strings/decimals/offsets, and omits absent
undefined object keys. It does not normalize Unicode, timestamps or units. SHA-256
over the complete revision covers project/draft/repository/parent/revision, all
material inputs and complete configs; challenge/session/CSRF secrets are excluded.
Identity fields with surrounding whitespace are rejected rather than silently
aliased. Capacity timestamps use existing millisecond-precision/offset contracts;
source timezone is factual text, not an inferred offset or legacy IANA conversion.

Confirmation takes server clock time, constructs an immutable receipt, invokes
forecast with `calibrationCandidates: []`, projects every bucket unchanged, and
invokes policy only if every projection composes. Expected demand is not
preinflated; Gate A applies its uncertainty adjustment once. Forecast rejection,
projection NOT_COMPOSABLE and policy INPUT_REJECTION retain actual typed evidence
with no fictional plan. A nested POLICY_EVALUATION is the logical governed-plan
snapshot belonging to its attempt; restrictive plans authorize no work.

## Local launch/access boundary

Supported commands are `pnpm dev` and `pnpm --filter @capacity-governor/web start`
after build. `apps/web/scripts/local-launch.mjs` invokes the supported Next CLI
with explicit `--hostname 127.0.0.1`, one configured `http://127.0.0.1:<port>`
origin and a runtime-only random admission key. Caller hostname overrides and
non-loopback HOST fail closed. Direct Next commands, external proxies, tunnels,
port forwarding and shared/hosted deployment invalidate the local assumption.

Next synthesizes forwarding headers internally. The launcher therefore installs
a small preload using public Node HTTP/EventEmitter APIs, before Next handling.
It rejects raw caller forwarding headers, duplicate/unexpected Host, unexpected
mutation Origin and every caller `x-cg-ingress*` marker. Only afterward does it
attach an HMAC proof over a fresh per-request context under the random startup
key. Proxy and action/service guards independently validate admission. This is
ingress evidence only, never actor or bucket authority. No private Next hook,
external authentication provider or new dependency is used. Runtime admission
keys are never logged, bundled into client code, persisted or returned.

The installed public Next `LoggingConfig` supports `logging.browserToTerminal`
and `logging.serverFunctions`; both are explicitly false. Browser diagnostics
can stringify session-bound client props, and invocation diagnostics can render
form state; neither is forwarded into launch logs. This does not disable any
request/session/CSRF guard or test assertion. Browser screenshots use
`caret: "initial"`, avoiding Playwright's transient input-style mutation before
hydration. The E2E runner buffers stdout/stderr lines across chunks, captures the
approved terminal pairing line only in memory, redacts any other 256-bit runtime
token, and fails if redaction or the non-secret browser-forwarding probe occurs.
Raw denial errors remain generic and contain no submitted authority tokens.

During development verification, the previous Next default browser-to-terminal
bridge emitted a screenshot-induced hydration warning containing ephemeral test
CSRF props. No values are repeated here; no pairing secret/session cookie was
reported, and no screenshot showed them. That test server exited and invalidated
the session. The explicit public logging configuration, non-mutating screenshot
option and chunk-safe fail-closed diagnostic tests are the bounded regression
fixes; final dev/built hygiene checks passed as recorded below.

On server start an independent 256-bit pairing secret is printed only to the
local launch terminal. Pairing requires exact Origin and a server-held one-use
bootstrap token (15-minute lifetime). Successful pairing issues an opaque
HttpOnly, SameSite=Strict, host-only session cookie without persistent expiry.
Loopback HTTP provides no HTTPS transport protection. Every product read and
mutation, including legacy reads/actions, requires the server-held session;
mutations additionally require server/session-bound CSRF and exact Origin.
Pairing/health/static entry surfaces alone are public. Session end clears pending
challenges; restart invalidates secrets/sessions/pending reviews.

Pending review challenges expire after 30 minutes unless already committed.
Editing/new review invalidates the prior pending challenge for that session/draft.
The synchronous challenge claim shares one in-flight transaction among competing
POSTs. A committed identical retry returns its existing immutable attempt; a
failed transaction releases the claim and reports no saved result. Cross-session,
revision/digest/bucket mismatch or unknown authority fields fail closed. Capacity
observation time is never advanced by confirmation or reopen.

This admits a trusted local session, not legal identity or factual truth. It
assumes a trusted OS account/browser and uncompromised app; hostile local
processes/administrators/account sharing are not isolated. General upstream
authentication and historical reset-cycle comparability remain deferred.

## Persistence, migrations and rollback

Additive migration `0002_dark_ken_ellis.sql` creates only
`composed_preflight_revisions` and `preflight_evaluation_attempts` plus references
and a unique attempt-per-revision index. Migrations 0000/0001 and all T001/T002
contracts/data remain unchanged; there is no backfill or guided-run conversion.

The revision contains exact immutable reviewed input/configuration JSON and
digest. The attempt embeds its complete revision, receipt, evaluation/record time,
real forecast/projections/optional policy evidence. Both insert in one transaction.
Duplicate revision insert returns the existing attempt only when actor, digest
and exact revision match; it never overwrites prior evidence. Repository reads
validate physical references/row identity/snapshots, then application reads replay
real engines at the stored historical time/configs and verify the digest. Invalid
stored evidence is a visible integrity error, never repaired or authorized.
No application update/delete workflow exists for these records.

Apply with the existing `pnpm db:migrate`. Downgrade the app while retaining new
tables if rollback is needed. Dropping evidence tables destroys receipts/results
and is not an authorized rollback; preserve/export evidence before any separately
reviewed destructive migration. A saved result can be reproduced by calling
`evaluateComposedSnapshot` with its revision, receipt and original evaluation time,
and comparing semantic output; this never saves or refreshes the old attempt.

## UI and deferred scope

The project exposes a separate composed flow while leaving legacy manual units,
resets and reserves intact. Dynamic keyboard-operable work-item/bucket entry
requires the full accepted taxonomy, exact units, explicit profile evidence,
explicit reset evidence, and minimum-scope answer. Review shows exact membership,
all material inputs and complete configs from the server snapshot. Result/list/
reopen show historical status, independent ranges/allocations, versions, unknowns,
assumptions, limiting buckets and existing reason/stop IDs. No execution action is
enabled. NARROW requires a new coherent scope; DEFER requires fresh observations
and complete preflight after the qualifying reset.

Review and result disclose uncalibrated planning estimates, MEDIUM as known
characterization/profile evidence rather than demonstrated accuracy, and identified
capacity-window percentages rather than purchased-credit cost estimates. No
savings/probability/productivity claims, provider calls, AI, calibration/history
loader, GUIDED linkage, execution enforcement or T006 workflow are added.
[Calibration concern 001](FORECAST_CALIBRATION_CONCERN_001.md) remains unresolved
before T006; Decision 0003/formulas/confidence/history eligibility are unchanged.

## Verification ledger

### Requirement-to-test traceability

| Requirement | Evidence |
| --- | --- |
| F1 explicit taxonomy/repository/revision and F2 manual-only | `contracts/test/composed.test.ts` strict missing/unknown fields, duplicate identity, precision/units and real typed-family roundtrips; `components/composed.test.tsx` unselected factors, explicit UNKNOWN, keyboard entry and independent dynamic rows; composed critical-path E2E. |
| F3 immutable review → confirmation → recomputation → atomic save | `server/local-boundary.test.ts` frozen copies, edited-review invalidation, revision/challenge/explicit-confirmation binding, concurrent claim and identical retry; application composition and DB failure/retry tests; actual paired UI confirmation. |
| F4 accepted explanations, no relaxed execution | Application tests exercise real PROCEED/NARROW/DEFER/STOP, LOW Yes/No, DEFER+NARROW precedence and healthy/critical isolation; component and E2E families require disabled execution and all three disclosure statements. |
| F5 saved history/no observation renewal | Application next-millisecond confirmation test retains original observed time; corrected revision preserves prior attempt; DB roundtrip/append-only tests; exact result URL and historical result reopened through project list in browser. |
| F6 complete immutable input/configs/receipt/typed outcomes | Every composed transport family roundtrips; DB stores exact snapshots and two inserts transactionally, migration preserves T001/T002 evidence; stored shape/context/semantic output/digest/actor tampering rejects rather than repairs. |
| F7 empty-history real composition | Application cold-start test asserts `consideredCandidates: []`, MEDIUM and exact 900/1200/1500 range, expected demand 1200 and Gate A adjustment 1500; no runtime history loader exists. |
| F8 all product read/action admission | Node raw-ingress tests reject Host/Origin/forwarding/marker forgery before Next; boundary tests enforce session/CSRF/startup context; actual dev/built browser tests exercise paired legacy actions and unpaired project/result reads, cross-session pending review, logout, unknown authority fields and missing/forged CSRF. Built direct Next launch test denies health/pair/product reads and mutation with no ingress preload. |
| Freshness/reset/reserve/context | Application tests: exact 30-minute and next-ms freshness; affected-only known activity; passed reset; exact 24-hour horizon and next-ms; post-reset reserves/defaults and infeasible reserve stop remain engine-owned; required composite identity/set, revision/configuration/digest rejection is contract/boundary/application-tested. |
| Projection and invalid evidence | Real above-cycle forecast is retained NOT_COMPOSABLE, never clamped; corrupted forecast projection is invalid NOT_COMPOSABLE; unsupported/raw policy amount is actual INPUT_REJECTION; strict client inputs reject missing factors/units rather than fabricating UNKNOWN. Valid rejection transport shape is not permission to substitute actual persisted output. |
| UI/accessibility and failures | Component tests cover exact accessible SELECT names, keyboard focus, explicit answers, multiple items/buckets, retained submitted fields on validation error, retained confirmation checks on save failure, all modes, typed rejection/no mode and disabled execution. DB atomic failure is real PostgreSQL/PGlite, not a UI success mock. |
| Legacy preservation | Legacy browser draft and factual outcome/amendment paths retain original assertions (two existing UNGUIDED labels are both checked); populated migration fixture verifies draft and run/outcome snapshots unchanged; exact seven-table inventory retains all five original tables plus only two additive T005 tables. |

### Deterministic examples

The 12-point fixture is APPLICATION_LOGIC + MEDIUM complexity/context + STABLE
repository + EXISTING_ONLY dependencies + STANDARD validation + SOME_NEW_PATTERN
novelty + MEDIUM correction exposure. Cold start emits 900/1,200/1,500 bp at MEDIUM.
Projection retains 1,200 expected; Gate A alone adjusts once to 1,500. With
A=7,800, C=1,170, V=1,170, I=5,460. A second independent A=1,300 remains CRITICAL
and forces STOP / PRESERVE; no borrowing occurs. The actual multiple-item browser
example has two 12-point items: each bucket independently emits 1,800/2,400/3,000
bp, projects expected 2,400, adjusts to 3,000, and retains C/V/I=1,170/1,170/5,460.

At A=2,000 with minimum scope No, the real result is NARROW. Confirmed one-hour
reset with explicitly entered 10,000 post-reset capacity qualifies DEFER, subject
to existing reserve/freshness rules; DEFER plus another NARROW stays NARROW.
UNKNOWN novelty produces LOW/UNKNOWN_OR_INVALID stop evidence, not a missing-field
default. Nine 12-point items retain expected 10,800 above-cycle planning demand:
NOT_COMPOSABLE, no Governor mode/decision. Observation age 30 minutes is accepted;
the next millisecond stops. None of these is a purchased-credit cost or accuracy
claim, and no saved result enables execution.

### Final checks and coverage

- Focused application, contracts, boundary, launch, database and component suites:
  **84/84 tests, 6 files**, 44.31s. The final test-helper-only lint rename was
  followed by its **8/8** test rerun, lint and typecheck, all passing.
- `pnpm test`: **348/348 tests, 17 files**, 66.74s.
- `pnpm test:coverage`: **348/348 tests, 17 files**, 97.70s. Statements
  **87.27% (1,434/1,643)**, branches **82.69% (970/1,173)**, functions
  **88.94% (362/407)**, lines **87.67% (1,387/1,582)**.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: PASS. Build generated all 14
  dynamic application routes. Task-generated `next-env.d.ts` import-path churn
  was restored to baseline and is excluded from the candidate.
- `pnpm db:generate`: PASS, seven tables, no further schema change after the
  single additive 0002 migration. `git diff --check`: PASS.
- `pnpm test:e2e` supported **dev: 11 passed, 1 explicitly built-only skipped**;
  supported **built/start: 12/12 passed**, 52.5s. Both final runs passed terminal
  hygiene: no boundary-token redaction and no browser-forwarding probe. Built
  direct unsupported launch is exercised, not skipped. Owned-server cleanup
  completed. Next emits its existing standalone-output/start warning; deployment
  of the standalone artifact is not supported or claimed by this local tranche.
- `pnpm format:check` on the Windows checkout: **FAIL, 36 unchanged files**.
  Read-only verification checked all 118 supported tracked paths: every failure
  disappears under CRLF-to-LF normalization, and none differs from baseline.
  Exact staged Git objects: **118/118 PASS, zero non-LF objects**. The coordinator
  also verified all 82 supported baseline Git objects passed. This is a checkout
  line-ending discrepancy, not an all-green checkout command claim; unrelated
  source/engine files were not reformatted.

| T005 imported file | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| application/composed.ts | 92.53% | 87.23% | 100% | 93.84% |
| contracts/composed.ts | 98.41% | 97.01% | 100% | 98.38% |
| server/local-boundary.ts | 93.97% | 89.06% | 88.88% | 93.58% |
| db/composed-repository.ts | 88.46% | 84.61% | 100% | 92% |
| components/composed-form.tsx | 82.81% | 54.09% | 85.71% | 85.96% |
| components/composed-result.tsx | 100% | 95% | 100% | 100% |
| components/review-confirmation.tsx | 90.47% | 70% | 100% | 94.44% |

Coverage is imported-source V8 coverage, not every route/browser path. The
server access wrapper and legacy actions have low unit line coverage (16.66%
and 12.87%); their real guarded flows are exercised in E2E. Child-process launch
and ingress tests are not instrumented by the parent's coverage collector.

### Actual retries, environment and evidence

Earlier runs were not all green. Initial focused failures were fixture/import,
component cleanup and a multi-statement prepared-query test setup; these were
fixed without weakening assertions. An initial 339-test run passed 337, with
the old five-table inventory and one database timeout under a concurrent build;
the inventory now asserts the original five plus exactly two new tables.
Subsequent database/dev timeouts occurred under overlapping coverage/compilation.
Final heavy gates and browser runs were separated; original timeout assertions
remain. Initial built browser failures were a navigation/save race and an
ambiguous stale reason locator; explicit result URL waiting and exact visible
reason assertions corrected them. Initial lint/type errors and the last reserved
test variable name were corrected without disabling rules. The diagnostic CSRF
incident and its bounded regression fix are recorded above, not omitted.

The coordinator restored only frozen declared dependencies: 479 cached packages,
zero downloads/version changes, after terminating an identified stale installer
and disabling the supported optimistic-install skip for restoration. Validation
used process-only `pnpm_config_enable_global_virtual_store=false`,
`pnpm_config_verify_deps_before_run=error`, and root/web installed-bin PATH
prefixes. No repository/global config or external dependency was added. Workspace
links resolve to current root source, not the old worktree.

An earlier Windows test cleanup failure left its owned server alive. The exact
owned process tree was verified and stopped through the supported approval
mechanism; the runner now surfaces cleanup failure. Final E2E used approval for
checked cleanup of only its spawned server tree, with no blanket Node cleanup.

Playwright traces are disabled because they retain cookie/request secrets;
assertions remain enabled. Actual paired browser flow screenshots were generated
for dev and built/start, visually inspected, and contain no pairing/session/CSRF
values. Pairing screenshots show the empty password field, not the runtime secret.
Ignored evidence files (not committed), all under this absolute directory:
`C:/Users/35jsu/GitHub/codex-capacity-governor/.data/t005-evidence/`:

- `dev-pairing.png`, `dev-form.png`, `dev-review.png`, `dev-result.png`,
  `dev-historical-reopen.png`.
- `built-pairing.png`, `built-form.png`, `built-review.png`, `built-result.png`,
  `built-historical-reopen.png`.

Screenshots supplement assertions, not proof of forecast accuracy. Independent
exact-commit review and founder acceptance remain. No push, PR, merge, deployment,
execution integration, upstream authentication or T006 work is included.
