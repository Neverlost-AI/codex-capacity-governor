# Tranche 005: Complete Capacity Preflight

## Assignment status and authority

- **Status:** DRAFT / NOT APPROVED — founder review required.
- **Authority granted now:** planning only; no T005 implementation.
- **Scope review:** F1-F7 accepted by the founder; F8 and F9 remain pending.
- **Planning baseline:** merged main `1f0bdbf30cd4d37f1f3f17153308e28b7c298260`.
- **Proposed implementation owner:** Codex, subject to founder assignment.
- **Proposed implementation branch:** `feature/tranche-005-complete-capacity-preflight`.
- **PR target:** `main`; founder owns product decisions and acceptance.
- **Controlling semantics:** accepted Decisions 0001, 0002 and 0003, plus the
  accepted T001-T004 assignments and current runtime boundaries.

No implementation branch should be created until the founder resolves the
decision checklist below, approves the final assignment and explicitly grants
implementation authority. Its accepted documentation commit on main becomes the
implementation baseline; this planning baseline is not that future baseline.

## Objective

Compose the existing manual project/preflight flow, Forecast Engine V1 and
Governor Policy Engine V1 into the smallest complete local preflight experience.
A user supplies reviewed work characterization and independent manual capacity
buckets, confirms the inputs, obtains a traceable result, and saves/reopens its
immutable evidence. No development execution is performed by the application.

The founder accepted a cold-start, manual-only T005 scope through F1-F7.
Comparable-history loading, governed-run linkage and outcome/calibration UI
belong to T006. F8/F9 and the final implementation assignment still require
approval; accepting scope does not authorize code.

## Current implementation and compatibility assessment

1. T001 stores one editable `PreflightDraft` per project. Its scalar budget has
   free-text units and no bucket identities or observation time. Its reset
   contract uses host IANA validation. These are structural legacy fields, not
   valid policy inputs or forecast characterization by implication.
2. T002 stores only UNGUIDED runs, manual outcomes and linear full-snapshot
   amendments. It has no governed-plan relationship or compatible normalized
   history loader. Preserve these contracts and existing records.
3. `evaluateForecastV1` produces non-authorizing deterministic evidence.
   `projectForecastToPolicyDemandV1` replays the retained forecast to reject
   inconsistent evidence and returns per-bucket demand/uncertainty or typed
   `NOT_COMPOSABLE`. The engine already rejects aliased history observations
   and duplicate provider/window/reset bucket identities.
4. `evaluatePolicyV1` alone owns normalization, exact arithmetic, reserves,
   freshness, uncertainty, resets, modes and decisions. Its public outcome is
   `INPUT_REJECTION` or `POLICY_EVALUATION`. Actor strings alone are not
   authenticated evidence. Required-bucket authority and minimum-scope evidence
   must match the evaluated scope, set and time.
5. Application services currently coordinate T001/T002 only. Database schema
   contains projects, editable preflight drafts, development runs, outcome
   observations and actual consumption. There is no composed evaluation,
   forecast/plan snapshot repository or result UI.

Use the actual engine contracts rather than old scalar placeholders or outdated
scaffold status text. No accepted engine semantics need changing for this
composition. Historical reset-cycle comparability and upstream authentication
remain deferred; this tranche may not resolve either implicitly.

## User-visible completion condition (proposed)

From an existing or newly created project, a user can:

1. open the existing manual draft without losing T001 values;
2. explicitly enter a repository/scope reference, work items and required
   capacity buckets for a new composed preflight revision;
3. review all material inputs, exclusions, acceptance criteria, observations,
   reset evidence, reserves and attestations before requesting evaluation;
4. receive per-bucket low/expected/high planning ranges, confidence, assumptions
   and unknowns; for a successful policy evaluation, see its mode, primary
   decision, allocations, reasons and stops;
5. distinguish input rejection, failed composition and evaluable restrictive
   policy outcomes, with actionable field/error context;
6. save/reopen the complete immutable evaluation, inputs, provenance and versions
   without rerunning it as though it were a current authorization; and
7. correct inputs or change scope through a new reviewed revision/evaluation,
   retaining the prior evidence.

A failed save must not be reported as a saved plan. A non-authorizing result
must never expose an enabled execution/continue action implying authorization.
An engine PROCEED result is a policy result, not founder approval to implement a
repository tranche or authority for automatic execution.

## Founder scope decisions and remaining review

The founder accepted F1-F7 as proposed in the preceding draft. Their choices are
settled for this assignment and are not being reopened. F8/F9 remain proposals;
the detailed sections below supersede their earlier high-level descriptions.

| Decision | Status                | Controlling choice                                                                                               |
| -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F1       | ACCEPTED              | Accepted manual taxonomy; explicit repository reference; immutable revision scope identity.                      |
| F2       | ACCEPTED              | AI assistance deferred.                                                                                          |
| F3       | ACCEPTED              | Confirm frozen inputs, then evaluate and save; no editable final result.                                         |
| F4       | ACCEPTED              | Existing deterministic explanations and neutral guidance only.                                                   |
| F5       | ACCEPTED              | Reopened results are historical; current guidance requires reviewed reevaluation.                                |
| F6       | ACCEPTED              | Immutable revision/attempt/plan evidence, including negative submitted evaluations.                              |
| F7       | ACCEPTED              | Cold start only; governed-run linkage, outcome comparison and history loading follow in T006.                    |
| F8       | HOLD — proposal ready | Loopback-only app, local pairing session and server-owned confirmation evidence as specified below.              |
| F9       | HOLD — source found   | Use V0.2 as product context and accepted tracked decisions/assignments as controlling scope; see reconciliation. |

F1-F7 retain the exact choices accepted in the preceding draft. In particular,
F1 requires explicit confirmation of legacy values rather than silent conversion;
F6 retains negative submitted evaluations; and F7 does not add GUIDED run
contracts. Technical organization may vary without changing those accepted
meanings.

F1/F8 bind authoritative inputs; F3/F5 define when confirmation applies; F6
defines retained evidence; F7 keeps historical identity and actual normalization
out of this tranche. The remaining detailed F8/F9 proposals follow.

### F8 — Concrete local access and confirmation proposal (NOT APPROVED)

**Recommendation:** add a minimal local access gate and server-owned confirmation
receipts. This permits one local operator to submit explicit evidence under a
documented operating assumption; it is not a human identity verification system.
Accepting it must not be described as resolving general upstream authentication.

#### Access restriction

1. Supported development and built-app launch paths must explicitly bind Next.js
   to `127.0.0.1`, using its supported `--hostname` option. Do not rely on the
   installed default, which is `0.0.0.0`. Tests must verify the launch arguments
   and fail closed for a requested non-loopback host. Direct unsupported launch
   commands, reverse proxies, tunnels and port forwarding are outside this
   local operating boundary; document that they invalidate its trust assumption.
2. Use exactly one configured origin, `http://127.0.0.1:<port>`. Reject unexpected
   Host values, proxy/forwarded-host requests, and state-changing requests with
   missing or mismatching Origin. Do not enable cross-origin access or accept a
   wildcard host. These guards apply to the application, not only the final
   confirmation action. Framework defaults alone are not the acceptance proof.
3. On each server start, generate an unpredictable local pairing secret with at
   least 256 bits of entropy using the server runtime's existing cryptography
   support. Present it only to the operator's local launch terminal. It is not
   an OpenAI credential. Never put it in a URL, tracked file, general request
   log, client bundle, persisted evaluation, or confirmation evidence.
4. The operator enters that secret in the loopback pairing form. The server
   validates it and creates a server-held session with an opaque cookie marked
   HttpOnly and SameSite=Strict, host-only and without persistent browser expiry.
   This proposal uses loopback HTTP and must not pretend the cookie has HTTPS
   transport protection. All product data reads and mutations require the
   paired session; only the pairing/health/static surfaces needed to enter it
   are public. Clear pending challenges on session end; restart invalidates all
   sessions/secrets. No browser-generated session or trust object is accepted.
5. Pairing POST requires a server-issued bootstrap form token and exact Origin;
   subsequent product mutations require server-issued, paired-session-bound
   CSRF tokens in addition to Origin checking and cookie protections.
   Confirmation challenges below bind the specific operation as well. No GET
   request changes records.

This protects against remote/LAN access through supported launches and prevents
an unrelated web page from submitting an authoritative confirmation. It assumes
a trusted OS account, trusted local browser and uncompromised app. It does not
isolate hostile local processes, administrators or users sharing that account;
local programs can forge headers. Host/Origin checks are additional controls,
not actor authentication. Do not expose this prototype to other users or claim
tenant isolation. A hosted/shared version needs separately approved identity,
TLS, deployment and access controls.

#### Exact input review and explicit confirmation

1. The paired operator submits the work description, factors, required buckets,
   observations, resets, reserve preferences, known activity/stop evidence and
   explicit minimum-coherent-scope answer for review. The server validates them
   and assigns the immutable revision ID. Both engines use that scopeTrancheId.
2. The server owns a pending exact snapshot. Canonicalize it with a documented
   locale-independent procedure and compute a SHA-256 digest. The digest covers
   project/repository/parent tranche and revision identity, all work-item values,
   bucket IDs and provider/window/reset tuples, raw decimal text/units,
   observation/reset/activity times, reserve inputs, explicit attestations,
   exclusions/acceptance criteria and selected complete engine configurations.
   Secret tokens and subsequently generated evaluation times/receipts are not
   input content. Preserve original factual strings; no Unicode or timezone
   reinterpretation is introduced by hashing.
3. Serve the review screen from that stored snapshot, displaying the exact
   required bucket set and all material values. Issue an unpredictable,
   one-use confirmation challenge tied server-side to the session, revision,
   digest and bucket set. A hash supplied by the browser is never authoritative.
4. The user explicitly confirms reviewed work inputs and required-bucket
   membership. The minimum-coherent-scope answer is a separate explicit Yes/No
   attestation, not a preselected true value; missing is not automatically false.
   Confirmation of the bucket set does not attest that a scope is minimum.
5. The confirmation POST sends the challenge/revision reference, session CSRF
   evidence and explicit confirmation action. It cannot replace the stored
   inputs or submit authoritative actorReference, recordedAt, provenance,
   reviewed/trusted flags, bucket membership or an engine result. Unknown
   authority fields are rejected. Editing an input invalidates the pending
   challenge and produces a new revision/review.
6. The server verifies session, origin, challenge ownership and unconsumed state,
   revision, exact canonical digest and bucket-set equality. It takes record and
   evaluation time from its injected clock, then records the confirmation and
   evaluates that server-held snapshot. No capacity observation time is advanced
   by confirmation; engine freshness rules still apply at evaluation time.
7. Save confirmation, immutable revision and actual attempt/result in one
   transaction. Claim the challenge once with a conditional operation; competing
   submissions cannot authorize twice. A committed retry returns its existing
   saved attempt, while a changed/session-mismatched or replayed challenge
   cannot create another authorization. On transaction failure report no saved
   result and allow a safe retry of the same operation. Do not hide consumed or
   partially committed evidence with an overwrite.

The durable receipt retains a generated receipt ID, revision/scope ID, canonical
digest and canonicalization version, exact bucket IDs and composite identities,
server record time, the explicit confirmations/minimum-scope value, and an opaque
local-session actor reference. It records the access-boundary version and receipt
reference; it contains no pairing secret, cookie, CSRF token or challenge secret.
It proves what the admitted session submitted, not the legal identity or truth
of the operator's manual claims.

Only after these checks may the application construct Gate A
UPSTREAM_TRUSTED_BOUNDARY provenance and Gate B reviewed-characterization/bucket
authority from the durable receipt. The server-generated actor/reference and
record time match the exact scope and bucket set. Existing policy/forecast
schemas and semantics remain unchanged. Client trust flags cannot take this
path. This is the concrete mapping requiring F8 approval.

**User impact:** one pairing step each server session, followed by review and
explicit confirmation for each input revision. No external account or provider
credentials are needed. No reviewer/agent auto-confirmation is introduced.

**Alternative:** loopback binding alone is simpler but does not substantiate the
server's local-session provenance; I do not recommend it for an authorizing
flow. If the pairing boundary is unacceptable, hold authorizing T005 paths or
approve a separate identity/access tranche rather than accepting a browser flag.

Required future tests include non-loopback launch rejection, wrong Host/Origin,
missing/invalid session and CSRF evidence, denied unpaired data reads, secret-free
audit records, review/receipt matching, input/bucket/digest tampering, missing
explicit attestation, stale/other-session challenge, restart invalidation,
double-submit/idempotent retry and atomic failure. These are assignment
requirements, not tests or implementation added during this planning pass.

Reference design guidance:
[OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
The installed Next.js CLI source confirms --hostname support and the current
0.0.0.0 default. No startup scripts or request handling changed in this draft.

### F9 — Product Brief found and reconciled (NOT APPROVED)

Both original V0.1 (July 31, 2026) and later V0.2 (August 11, 2026) PDFs were
found in the user's Downloads project materials. The configured Obsidian vault's
Capacity Governor folder contained governance/T003 materials, not the brief.
All PDF pages were extracted and relevant scope/example pages visually reviewed;
V0.2 page 6 is blank. Paths, source hashes, page references and differences are
recorded in [Product Brief reconciliation](PRODUCT_BRIEF_RECONCILIATION.md).

**Recommendation for approval:** retain V0.2 as historical product vision, V0.1
as origin context, and use the accepted tracked Decisions 0001-0003, accepted
assignments and latest explicit founder T005 rulings as controlling semantics
and bounded scope. README/architecture explain the product; the roadmap keeps
the complete MVP sequence visible. The final approved T005 assignment controls
this implementation. Neither PDF expands authorization by being discovered.

The briefs confirm preflight, protected reserves, transparent ranges, outcomes
and later learning. Their broader AI, credit/model-cost, optimization and runtime
integration descriptions differ from accepted V1 semantics or bounded T005
scope. F1-F7 remain accepted; the reconciliation does not reopen them. Governed
outcomes/history remain T006, dogfooding T007 and external pilot T008. Broader
unassigned capabilities are visible in the roadmap without being new MVP gates.

**Remaining F9 choice:** accept this source precedence and reconciliation, or
identify a specific brief requirement whose scheduling/authority needs a later
founder ruling. No requirement is now blocked merely because the brief is absent.

## Technical scope after approval

### Contracts and runtime validation

Add reviewed transport-neutral composed revision, confirmation receipt,
evaluation attempt and governed-plan snapshot schemas. Exact names may vary,
but meanings may not. Distinguish draft/user-submitted evidence from evidence
established by the approved application boundary.

- Reuse forecast and policy runtime schemas; do not duplicate formulas or weaken
  validations to accept UI values.
- Require exact equality of both engine bucket sets and each corresponding
  bucketId/providerId/capacityWindowId/resetCycleId. Never join solely by an
  amount or silently drop a bucket. Validate duplicate composite identities.
- Bind characterization, bucket authority and minimum-scope attestation to the
  same immutable revision identity; preserve actor/reference and record time.
- Manual raw capacity uses exact decimal strings and existing whitelisted units.
  Preserve observedAt, resetsAt and normalizedUtc with explicit offsets and no
  finer than millisecond precision. sourceTimezone remains factual text; no
  inferred offset or host timezone validation in the composed boundary.
- Preserve optional reserve requirements, reset kind and explicit post-reset
  availability separately for every bucket. Never default to a full reset.
- Retain every explicit UNKNOWN; never fill an omitted factor with UNKNOWN or
  known values. T005 UI absence is not evidence of certainty.
- Validate complete stored snapshots on reads. Invalid stored evidence is a
  visible integrity error, not a silently repaired or authorizing result.

The legacy T001 reset form may retain its current behavior. The composed form
must use the policy reset contract and must not route through the legacy IANA
check or convert arbitrary T001 units by guessing their meaning.

### Framework-independent application use cases

Provide the narrow operations needed to prepare/review a composed revision,
evaluate confirmed inputs, atomically persist the evaluation, list saved results
for a project and reopen a result. Inject IDs, clock, repositories and versioned
configurations at the application boundary. Pure engines remain clock-free.

The evaluated sequence is:

1. Validate the project/draft association and approved confirmation/context.
2. Freeze the reviewed input snapshot and take explicit server evaluation time.
3. Invoke evaluateForecastV1 with complete accepted Gate B configuration and
   the accepted F7 history boundary (empty candidates).
4. For FORECAST_EVALUATION, invoke the existing projection for every required
   bucket. Preserve expected demand unchanged and uncertainty separately.
5. If any projection is NOT_COMPOSABLE, retain that evidence and the forecast;
   do not call policy with a partial set, clamp demand or invent a decision.
6. Otherwise form the exact Gate A input from matching capacity/evidence and
   projected demand/uncertainty; invoke evaluatePolicyV1 with complete accepted
   Gate A configuration. Supply minimum-scope evidence explicitly; no inference.
7. Validate the composed stored outcome and atomically save the actual inputs,
   configurations, engine evidence and receipts. Return a saved identifier only
   after successful commit.

Reuse existing semantic replay in projection. Client-supplied forecasts,
confidence, modes or decisions must not become authoritative server results.
LOW forecast confidence can still project to UNKNOWN_OR_INVALID and produce
an evaluable STOP / PRESERVE; this differs from NOT_COMPOSABLE and input rejection.

### Proposed persisted records and relationships

- A ComposedPreflightRevision belongs to one existing Project and PreflightDraft,
  references its parent tranche and owns its immutable evaluated scope identity.
  It snapshots brief, exclusions, acceptance criteria, work items, repository
  reference, every raw bucket input and reviewed provenance.
- A PreflightEvaluationAttempt belongs to that revision and stores explicit
  evaluation/record times, complete forecast/policy configuration snapshots,
  engine versions and actual outcomes. Projection failures/rejections are
  retained in their typed form without a fictional plan.
- A GovernedPlanSnapshot exists only for a POLICY_EVALUATION and references the
  corresponding attempt; it retains exactly one aggregate mode/decision and
  all per-bucket results. STOP, NARROW and DEFER plans authorize no work.
- Confirmation evidence is immutable and references exact revision/set/content.
  PostgreSQL JSONB snapshots behind typed repositories are a proposed storage
  technique, not permission to store unvalidated payloads.
- Optional predecessor links explain a later corrected/re-preflight revision;
  they do not mutate or delete the earlier evidence. Whether a singular latest
  pointer is needed is a technical index/query choice, never an overwrite.

A minimum of two physical tables may store these logical records together;
avoid speculative normalized tables or an event platform. Technical layout must
preserve the approved atomicity, references and immutable evidence semantics.
No destructive history update/delete application workflow is permitted.

### UI boundary

Extend the focused project experience with a clearly separate composed preflight
flow. Label legacy drafts as manual structural evidence. Provide keyboard
operable work-item and bucket entry, explicit confirmation, field errors with
an error summary/focus strategy, understandable save failures and retained inputs.

Display independent bucket ranges and allocations, evaluation time, versions,
confidence explanation, unknowns, assumptions, limiting buckets, stops and
existing rule identifiers. Do not total capacity or conceal restrictive buckets.
Use planning-range language; no probability, accuracy or savings claims.

Show NOT_COMPOSABLE and INPUT_REJECTION without a fabricated Governor mode or
decision. For above-cycle demand, retain the unclamped forecast and explain that
Gate A V1 cannot consume it. Do not translate it into NARROW, DEFER or STOP.
Distinguish policy's UNKNOWN_OR_INVALID stop from a missing or malformed field.

Reopened evidence displays its historical status under F5. NARROW requires an
explicitly new coherent scope; DEFER requires fresh observations and a new
preflight after the qualifying reset. Neither enables present work.

### Migration boundary

Only additive reviewed PostgreSQL/Drizzle changes for the approved composed
records are permitted. Keep migrations 0000/0001 and T001/T002 records unchanged.
No backfill may manufacture bucket identities, observation times, provenance,
normalization, forecasts or guided status. Existing project/draft/run/outcome
queries must continue working after migration.

Tests must cover references, snapshot round-trip, immutable prior results,
atomic failure, duplicate submission/concurrency without evidence loss, and
migration from existing T001/T002 fixtures. Exact retry/idempotency mechanics
may be technical choices but must not duplicate or overwrite a confirmed
evaluation silently. Rollback must preserve stored evidence; document that
downgrading the app is safer than dropping new evidence tables.

## Exact allowed architectural surfaces

- `packages/contracts/**`: composed schemas/types and focused tests; accepted
  policy/forecast semantics remain unchanged.
- `packages/application/**`: orchestration, injected dependencies, repository
  ports and application tests; narrow package wiring to invoke accepted engines.
- `apps/web/src/app/**`, `apps/web/src/components/**`: focused manual review,
  result/list/reopen flow and tests.
- `apps/web/src/server/**`: application wiring and database repository adapters.
- `apps/web/drizzle/**`: new additive migration and corresponding generated
  metadata only, after approved persisted record review.
- `apps/web/e2e/**`: critical paths and conservative-family evidence.
- Root/package manifests and test configuration only if essential for existing
  engine/application dependency wiring. New dependencies require approval.
- If F8 is approved, narrow local launch/session/origin/CSRF/review-challenge
  handling and tests in apps/web and existing scripts/run-e2e.mjs as required
  for the same protected local flow; no external auth provider or new dependency.
- Documentation directly needed to operate, test and review T005.

No behavior changes in packages/policy-engine or packages/forecast-engine are
authorized. Import and exercise their public APIs through application code;
report any required engine correction separately rather than absorbing it.

## Prohibited semantics and deferred work

Do not change Decisions 0001-0003, weights, confidence, history eligibility,
normalization, reserve floors, uncertainty arithmetic, mode/decision precedence,
freshness or reset/defer policy. Preserve:

`PROCEED < DEFER < NARROW < STOP / PRESERVE`

`FULL < CONSERVATION < LOW < CRITICAL`

No inferred required buckets, minimum-coherent scope, profile completeness,
post-reset replenishment, provider conversion or narrower scope. No cross-bucket
substitution/borrowing. No relaxed override or fabricated trust claim.

No AI/model calls, provider integration, automatic history/actual normalization,
automatic Codex retrieval, execution enforcement, GUIDED-run changes, T006
comparison UI/calibration loading, T007 formal dogfooding, T008 pilot, external
authentication system, billing, deployment, Claude Code or other repositories.
The intentionally deferred historical reset-cycle ambiguity is not reopened.

## Required tests after implementation is authorized

| Level                 | Required evidence                                                                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract              | Valid round-trip of every composed result family; invalid shapes/context/future evidence; duplicate IDs/composite identities; exact bucket-set parity; sub-millisecond rejection; semantic contradictions cannot authorize.                                      |
| Application           | Real forecast → projection → policy APIs with injected time/configuration; cold start; UNKNOWN; missing/invalid evidence; above-cycle and invalid forecast NOT_COMPOSABLE; transaction failures; server recomputation rather than trusting client output.        |
| Policy composition    | PROCEED, NARROW, DEFER, STOP fixtures; DEFER + NARROW → NARROW; one healthy bucket cannot relax another; bounded uncertainty applied once by Gate A; LOW minimum-scope true/false; stop precedence and complete post-reset reserve evidence unchanged.           |
| Freshness/context     | Exactly 30 minutes and next millisecond; known affected-bucket activity; passed reset; exact 24-hour defer horizon; changed inputs/revisions/configuration invalidate reuse under the approved F5 behavior; confirmation cannot migrate to another revision.     |
| Integration/migration | Legacy T001/T002 fixtures survive additive migration; complete configurations/inputs/outputs/receipts reopen identically; no history overwrite; wrong project/draft ownership rejected; atomic persistence and concurrency/retry failures retain prior evidence. |
| UI/accessibility      | Field labels and keyboard flow, multiple independent buckets/items, review confirmation, UNKNOWN disclosure, restrictive disabled actions, typed failure displays, historical reopened result, save failure/input retention and no silent legacy conversions.    |
| E2E                   | Manual-only create/review/evaluate/save/reopen allowed result; conservative paths covering NARROW, DEFER and STOP; above-cycle non-composable path; stale evidence requires new evaluation; T001/T002 critical paths remain green.                               |

Use exact real engine fixtures for the approved examples: 12-point cold start
gives 900/1,200/1,500 bp at MEDIUM, projected expected stays 1,200 and Gate A
adjusts demand to 1,500. Do not preinflate expected in application code. At
current A=7,800, default reserves are 1,170 each and I=5,460; another bucket at
A=1,300 remains CRITICAL and independently forces the restrictive result.

The runtime flow is recommended cold-start only. Tests may prove the existing
engine accepts history independently, but must not add an unapproved product
history loader to obtain HIGH confidence.

Required repository gates:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm db:generate
git diff --check
```

Report actual test/file counts and coverage. db:generate must produce only the
reviewed T005 additive schema delta and become clean after generation. Validate
formatter-supported committed LF Git objects separately from Windows CRLF
checkout behavior; do not call checkout line-ending differences pre-existing
content defects or rewrite unrelated files. Do not weaken tests or gates.

## Acceptance criteria

1. Every F1-F9 decision is resolved explicitly and incorporated before code.
2. Manual-only composition and save/reopen work without AI/provider/history access.
3. Every required bucket and all authority/context evidence match across engines.
4. Forecast ranges, expected demand and uncertainty retain their accepted meaning;
   policy alone owns normalization, reserves and authorization consequences.
5. All actual typed outcomes remain distinguishable and non-composable evidence
   never becomes a fabricated policy result.
6. Immutable complete inputs/configurations/results can reproduce evaluations;
   corrected inputs create new evidence, and save failures never imply success.
7. Confirmation and reopened-result behavior match approved F3/F5/F8 without
   inferring authentication or silently renewing capacity observations.
8. UI explains limiting buckets, existing rule IDs, protected reserves, unknowns,
   and restrictive results accessibly with no unsupported claims.
9. Legacy T001/T002 behavior remains intact; no GUIDED run or calibration loader
   is added, and accepted engine/decision behavior remains unchanged.
10. Additive migrations and all required checks pass with reviewable evidence.
11. A separate fresh-context governor_reviewer reviews the exact candidate commit
    and any fixes under the accepted three-review limit.
12. Founder acceptance is required before merge; no further tranche follows
    automatically from a technical PASS.

## Branch, documentation and handoff expectations

After approval, record the resolved assignment on main through a focused PR and
identify its exact accepted commit before creating the implementation branch.
Use the governor-build-review skill: coordinator controls authority, builder
authors implementation/tests/fixes, and a different reviewer authors no changes.
Report exact candidate SHA, agent separation, attempt ledger and any unresolved
findings. Stop after three review attempts, or earlier for a real founder choice.

Implementation PR must include composition/dependency summary; Decision 0002/0003
and assignment checklists; requirements-to-test mapping; representative
multi-bucket cold-start, unknown, stale, defer/narrow and above-cycle examples;
typed failure examples; exact gate results; migration/rollback notes; immutable
reproduction evidence; screenshots/accessibility evidence; changed files; clean
status; and explicit deferred work. Keep PR open until founder acceptance.

Document public application operations, confirmation/trust assumptions, record
relationships, migration procedure, result lifecycle, accepted configuration
snapshots, and how to reproduce a saved evaluation without changing it.

## Explicit stop conditions

Stop affected implementation and report the smallest founder decision if:

- any F1-F9 answer is absent or conflicts with a controlling source;
- a Product Brief requirement is not reconciled under the approved F9 precedence;
- the proposed local boundary cannot honestly establish approved provenance;
- a form or adapter requires an unsupported conversion, guessed timezone,
  inferred bucket/attestation or normalization of raw T002 evidence;
- a forecast cannot compose without changing accepted policy/forecast behavior;
- saved guidance requires an unapproved validity/confirmation/override rule;
- storage cannot preserve complete immutable evidence or existing history;
- governed-run linkage, history loading, AI, external authentication, deployment
  or another future tranche appears necessary for completion;
- a new broad dependency/refactor or product-semantic change is needed; or
- tests expose an engine defect outside T005's integration boundary.

Do not resolve these with a guessed default, a hidden flag or a disclaimer.

## Founder review checklist

F1-F7 are accepted and recorded above. No further approval of those choices is
requested. Their accepted checklist remains:

- F1: full accepted manual taxonomy, explicit repository reference and immutable
  revision scope identity.
- F2: AI assistance deferred.
- F3: confirm frozen inputs, then evaluate and persist; no separate preview
  finalization or safety-relaxing action.
- F4: existing deterministic explanations and neutral guidance only.
- F5: saved results historical; current guidance requires reviewed reevaluation.
- F6: immutable input/attempt/plan evidence, including negative outcomes,
  transactionally saved with no invented policy fields.
- F7: cold-start flow only; history loading and governed-run linkage deferred.

Only F8/F9 require ACCEPT, CHANGE (with replacement), or HOLD:

- F8: approve the concrete loopback/pairing/session, server-owned review snapshot
  and one-use confirmation receipt boundary specified above, with its local-only
  trust limits; or hold authorizing paths pending a different boundary.
- F9: approve the found-brief reconciliation and source precedence specified
  above; or identify a particular unresolved requirement for a founder ruling.

After these decisions, separately approve the final assignment, owner and
implementation authority. This draft alone is not safe authority to begin T005.
