# Tranche 003: Deterministic Governor Policy Engine V1

## Assignment status

- **Status:** Founder-approved and accepted; implementation authorization pending
- **Type:** Bounded pure-domain implementation tranche
- **Controlling decision:**
  `docs/decisions/0002-gate-a-governor-policy-semantics-v1.md`
- **Proposed implementation owner:** Codex
- **Recommended implementation branch:**
  `feature/tranche-003-deterministic-policy-engine-v1`
- **Pull-request target:** `main`
- **Product and acceptance owner:** Founder

This assignment translates accepted Founder Decision Gate A into the controlling
implementation boundary. Acceptance of the assignment does not itself authorize
implementation or creation of the proposed branch. Implementation may begin
only after the founder grants explicit implementation authority and names an
accepted baseline.

Before any authorized implementation, read `README.md`, `AGENTS.md`,
`docs/ARCHITECTURE_CONTEXT.md`, `docs/DEVELOPMENT_WORKFLOW.md`,
`docs/MVP_ROADMAP.md`, and Decision 0002 completely.

## Objective

Implement the accepted Gate A V1 semantics as a pure, deterministic,
framework-independent Governor policy engine. The public boundary returns either
a typed non-authorizing input rejection for a structurally invalid case or, for
an evaluable case, a policy evaluation. Given the same evaluable policy input,
explicit evaluation time, and complete versioned configuration, the engine must
always return the same auditable policy evaluation:

- one result for every required capacity bucket;
- exactly one aggregate operating mode;
- exactly one aggregate primary decision;
- protected correction and validation allocations per bucket;
- limiting and blocking bucket evidence;
- stable rule/reason and mandatory-stop identifiers; and
- the complete policy/configuration evidence required to reproduce the result.

The tranche establishes policy contracts and pure computation only. It does not
compose a complete preflight, produce a forecast, persist a governed plan, or add
a user interface.

## Reviewer-visible completion condition

From a clean checkout, a reviewer can run the documented tests and invoke one
public policy-evaluation entry point with reviewed fixtures. Without database,
network, browser, AI, or provider access, the entry point returns one of two
typed public outcomes:

- an input rejection for a structurally malformed or contract-invalid case,
  with stable validation/error identifiers and no aggregate mode or decision; or
- a policy evaluation for an evaluable case.

Every policy evaluation shows:

1. evaluator-produced normalization and independent evaluation for every
   explicitly required bucket;
2. per-bucket `A[b]`, `C[b]`, `V[b]`, `I[b]`, adjusted `D[b]`, operating mode,
   blocking/defer evidence, rule reasons, and stop conditions;
3. the most restrictive aggregate mode;
4. exactly one aggregate decision using the controlling order
   `PROCEED < DEFER < NARROW < STOP / PRESERVE` and the ordered Gate A rules;
5. the bucket or buckets limiting the result;
6. the exact V1 policy/configuration version used; and
7. deterministic `STOP / PRESERVE` behavior for evaluable cases containing
   mandatory-stop evidence.

An input rejection never authorizes work, is never represented as a successful
policy evaluation, and never fabricates an aggregate operating mode or primary
decision. Expected validation failure must not require an uncaught exception.

The demonstration must include at least the accepted example in which one bucket
is `DEFER`, another is `NARROW`, and the aggregate decision is `NARROW`.

## Controlling semantics

Decision 0002 is authoritative in full. Examples in this assignment illustrate
coverage; they do not modify the decision. If this assignment and Decision 0002
appear to conflict, stop and request founder review rather than choosing an
interpretation.

The implementation must preserve these controlling boundaries:

- Capacity is a non-empty set of independently identified required buckets, not
  one global scalar.
- `10,000 bp` means 100% of one identified bucket/reset cycle only.
- Equal basis-point values do not make buckets interchangeable.
- The deterministic evaluator, not the caller, is authoritative for V1
  normalization from retained raw amounts and explicit raw units.
- Required-bucket membership is authoritative caller/user evidence with actor
  provenance. Policy and AI never infer, add, or remove membership.
- Normalization, reserves, allocation, freshness, uncertainty, reset/defer, mode,
  affordability, and stop rules apply independently to every required bucket.
- A healthy bucket cannot relax a restrictive result from another required
  bucket.
- The aggregate mode uses
  `FULL < CONSERVATION < LOW < CRITICAL`.
- The aggregate primary decision uses
  `PROCEED < DEFER < NARROW < STOP / PRESERVE` together with the strict ordered
  rules. The intact-scope `DEFER` gate is evaluated before `NARROW`.
- `DEFER` authorizes no work and preserves the unchanged scope for a fresh
  post-reset preflight. `NARROW` authorizes no partial execution; the caller must
  define a smaller coherent tranche and perform a fresh preflight.
- Minimum-coherent-scope status is authoritative human/caller attestation, never
  policy or AI inference.
- Safety-critical arithmetic uses exact integer/rational representations, never
  binary floating-point approximations of the accepted configuration.
- No safety-relaxing override exists. Prior evaluations remain immutable
  evidence.

## Technical scope

### Policy package bootstrap

- Turn `packages/policy-engine` from a documentation placeholder into a normal
  workspace TypeScript package using the repository's existing toolchain.
- Export one focused public V1 evaluation boundary plus only the supporting pure
  functions/types that are useful to callers or tests.
- Keep all policy calculations free of framework, UI, persistence, HTTP,
  filesystem, clock, randomness, environment, provider SDK, and AI dependencies.
- Accept evaluation time as explicit input. Do not call the system clock inside
  policy calculation.
- Keep configuration injected and versioned. Do not hide approved values as
  unversioned literals distributed through implementation code.
- Use exact integer/rational arithmetic for every safety-critical calculation.
  Any division or multiplication must use the accepted directional rounding
  rules and reject unsafe/non-finite results. Do not use binary floating-point
  approximations of accepted shares or multipliers.

### Runtime contracts and validation

Add reviewed Zod schemas at the public policy boundary in `packages/contracts`
where cross-package runtime validation is required. Compile-time types must be
derived from or demonstrably aligned with the runtime schemas.

The public boundary must preserve the meaning of the Decision 0002 T003 input and
output implications. It accepts unknown input for runtime validation and returns
a typed discriminated outcome: either an input rejection or a successful policy
evaluation. It requires the following evidence to establish an evaluable case:

#### Evaluation and configuration evidence

- explicit evaluation time with timezone offset;
- stable policy version;
- complete V1 configuration and configuration version;
- normalization-rule version;
- mandatory-stop-list version; and
- any externally supplied active repository/tranche stop identifiers as factual
  input rather than policy discovery.

The V1 configuration must carry, as versioned values:

| Configuration meaning | External V1 label | Exact calculation form |
| --- | ---: | ---: |
| Basis points per bucket/reset cycle | `10,000` | integer `10,000` |
| Correction floor share | `0.15` | `1,500 / 10,000` |
| Validation floor share | `0.15` | `1,500 / 10,000` |
| `FULL` minimum | `6,000 bp` | integer `6,000` |
| `CONSERVATION` minimum | `3,500 bp` | integer `3,500` |
| `LOW` minimum | `1,500 bp` | integer `1,500` |
| Qualifying defer horizon | `86,400 seconds` | integer `86,400` |
| Maximum observation age | `1,800 seconds` | integer `1,800` |
| Bounded-uncertainty multiplier | `1.25` | exact rational `5 / 4` |

The evaluator must reject a missing, unknown, internally inconsistent, or
unsupported policy/configuration version. Tests must inject the configuration;
the package may export the exact reviewed V1 fixture from one centralized,
versioned location. Safety-critical calculation must use the exact forms above,
not binary floating-point approximations. Do not add a decimal-math dependency
without separate founder approval.

#### Authoritative required-bucket set

The input must contain a non-empty required-bucket collection and collection-level
authority evidence retaining at least:

- actor/reference; and
- record time.

Each required bucket must retain:

- stable bucket identity;
- provider or explicit manual-source identity;
- capacity/window identity;
- reset-cycle identity;
- raw available amount and unit;
- optional caller-claimed/observed normalized available basis points when
  retained for provenance or compatibility;
- observation time;
- known post-observation activity evidence affecting the bucket;
- bucket-specific reset evidence;
- explicit raw amount and unit for bucket-specific expected post-reset
  availability when supplied;
- raw amount and explicit unit for a manual correction minimum, and/or a higher
  target share, when supplied;
- raw amount and explicit unit for a manual validation minimum, and/or a higher
  target share, when supplied;
- supplied raw implementation-demand amount and explicit unit before the
  bounded-uncertainty adjustment; and
- one accepted uncertainty state.

Reject duplicate bucket IDs, duplicate source/window/reset identities, empty
required-bucket sets, and attempted aggregation or substitution. Do not treat an
AI/tool proposal as authoritative membership evidence. Do not require or trust a
caller-supplied normalized policy amount. When one is retained as a provenance
claim, the evaluator must recompute normalization and require exact agreement;
a mismatch fails closed with a stable identifier.

#### Known activity evidence

Each supplied known capacity-consuming activity event must retain:

- event identity;
- event time;
- explicitly affected bucket identities; and
- factual source/provenance.

An event after a bucket observation makes that explicitly affected observation
stale immediately. Unknown external activity is not inferred. An event must not
stale an unrelated bucket.

#### Bucket-specific reset evidence

Each bucket independently retains:

- reset-cycle identity;
- exact reset timestamp and source timezone when known;
- normalized UTC timestamp when known;
- confirmed or uncertain status; and
- explicit expected post-reset availability for the same bucket when supplied.

V1 must not infer full replenishment or cross-bucket replenishment. No
cross-bucket source-guarantee contract is in this tranche because no specific
source guarantee has been separately approved.

#### Policy demand and uncertainty

- Require one nonnegative raw implementation-demand amount and explicit raw unit
  for every required bucket. The evaluator normalizes it to `D[b]`.
- Do not derive a bucket's demand from another bucket, divide a global demand, or
  calculate a forecast.
- `KNOWN` uses the supplied demand.
- `UNCERTAIN_BUT_BOUNDED` uses the exact rational calculation
  `ceil(D[b] * 5 / 4)` and caps that bucket's mode at no better than
  `CONSERVATION`.
- `UNKNOWN_OR_INVALID` fails closed with `STOP / PRESERVE`.

Gate B may later define how forecast evidence produces demand or uncertainty.
This tranche treats them only as supplied policy input.

#### Minimum-coherent-scope attestation

The input must retain an explicit authoritative attestation containing at least:

- actor/reference;
- `recorded_at`;
- scope/tranche identity; and
- attested value.

The engine validates and records the attestation but never infers its value. It
is policy-significant only in the accepted `LOW`-mode affordability rule.

### Exact normalization behavior

The deterministic evaluator is authoritative for V1 normalization. Every
capacity quantity subject to policy normalization must enter with its raw amount
and explicit raw unit, including, where applicable:

- available capacity;
- implementation demand;
- manual correction minimum;
- manual validation minimum; and
- expected post-reset availability.

The public contract must encode raw finite decimals in a form that can be parsed
to an exact integer/rational value without first relying on an inexact binary
floating-point approximation. A validated canonical decimal representation or
an equivalent integer coefficient/scale representation is acceptable. Preserve
the original raw value for audit evidence.

The evaluator derives basis points using only the accepted whitelist within each
bucket:

- basis points map 1:1;
- explicit percentages multiply by `100`; and
- explicit normalized fractions multiply by `10,000`.

Retain each raw amount/unit and the applied normalization rule/version. Reject
unsupported units and values outside `0..10,000 bp`; never clamp. Round available
capacity downward and demand/reserve requirements upward to whole basis points.
The runtime boundary must reject non-finite values and arithmetic outside the
safe supported range.

A caller-provided normalized value may be retained only as a claimed/observed
provenance value. The evaluator must independently recompute the normalized
amount and require exact agreement. A mismatch returns failure-closed policy
evidence with aggregate `STOP / PRESERVE` and a stable identifier for an
otherwise evaluable case; a malformed claim that prevents an evaluable case
returns a typed input rejection. The caller-provided claim is never
authoritative.

Normalized `A[b]`, supplied and uncertainty-adjusted `D[b]`, `C[b]`, `V[b]`,
`I[b]`, and post-reset policy amounts are evaluator-produced output/audit values.

Provider-specific, non-linear, heuristic, or inferred conversions are prohibited.

### Per-bucket reserves and allocation

For every required bucket, implement exactly:

- correction reserve
  `C[b] = max(manualCorrectionMinimum[b], effectiveCorrectionShare[b] * A[b])`;
- validation reserve
  `V[b] = max(manualValidationMinimum[b], effectiveValidationShare[b] * A[b])`;
  and
- implementation allocation `I[b] = A[b] - C[b] - V[b]`.

The effective share cannot be below the versioned `0.15` floor; a supplied target
may increase but never lower it. Represent the floor exactly as
`1,500 / 10,000`, normalize manual minimums from their raw amounts/units, and
represent any accepted higher target share in an exact integer/rational form.
Reserve results round upward. No bucket may borrow, receive, or offset allocation
or reserve from another bucket.

If `C[b] + V[b] >= A[b]`, or required validation cannot be protected, return the
accepted mandatory `STOP / PRESERVE` result. Do not release unused reserve within
an existing evaluation.

### Freshness, resets, and defer

- An observation is fresh at an age of exactly 30 minutes and stale when older.
- Known capacity-consuming activity after observation stales the explicitly
  affected bucket immediately.
- A passed reset timestamp without a fresh observation is a mandatory stop.
- Missing, uncertain, or rolling reset information cannot justify `DEFER`.
- A reset never makes current work affordable and never implies `10,000 bp`.
- A reset in one bucket does not replenish another bucket.
- Exactly 24 hours until reset is defer-eligible; 24 hours plus one second is not.
- The unchanged scope is eligible for aggregate `DEFER` only when every currently
  blocking bucket has both a confirmed qualifying reset and explicit sufficient
  post-reset availability for its own demand and reserves.
- Healthy non-blocking buckets need not reset.
- A `DEFER` result must state that no work is authorized and that fresh evidence
  plus a complete re-preflight is required after the relevant reset boundary.

For each blocking bucket, expected post-reset availability `PRA[b]` is
hypothetical available capacity after that bucket's reset only. Determine
post-reset sufficiency exactly as follows:

1. normalize the raw `PRA[b]` amount/unit with the accepted whitelist to produce
   evaluator-derived `A_post[b]`;
2. recalculate `C_post[b]` from `A_post[b]` using the same correction floor,
   normalized manual minimum, and accepted higher target share;
3. recalculate `V_post[b]` from `A_post[b]` using the same validation rules;
4. calculate `I_post[b] = A_post[b] - C_post[b] - V_post[b]`;
5. apply the accepted uncertainty adjustment to the unchanged scope demand; and
6. classify the bucket as post-reset sufficient only when the unchanged adjusted
   demand is affordable from `I_post[b]`.

Do not compare `PRA[b]` with `C[b]`, `V[b]`, or `I[b]` derived from current
pre-reset `A[b]`. This calculation is defer evidence only: it does not infer full
replenishment, transfer capacity between buckets, predict future capacity, or
authorize execution. A fresh observation and complete re-preflight remain
mandatory after the actual reset.

### Mode and aggregate decision evaluation

Classify each bucket from `A[b]`, with bounded uncertainty applying its accepted
mode cap:

- `FULL`: `A[b] >= 6,000 bp`;
- `CONSERVATION`: `3,500 <= A[b] < 6,000`;
- `LOW`: `1,500 <= A[b] < 3,500`; and
- `CRITICAL`: `A[b] < 1,500`.

The aggregate mode is the most restrictive bucket mode. Apply the accepted
primary-decision rules in their strict order:

1. any mandatory bucket/repository/tranche stop → `STOP / PRESERVE`;
2. aggregate `CRITICAL` → `STOP / PRESERVE` for new implementation;
3. every bucket affordable:
   - aggregate `FULL` or `CONSERVATION` → `PROCEED`;
   - aggregate `LOW` plus true authoritative minimum-coherent-scope attestation
     → `PROCEED`;
   - aggregate `LOW` without that true attestation → `NARROW`;
4. every currently blocking bucket passes the intact-scope defer gate → `DEFER`;
5. unaffordable, no mandatory stop, and every blocking bucket has positive safe
   implementation capacity → `NARROW`;
6. otherwise → `STOP / PRESERVE`.

When bucket-level candidate decisions differ, aggregate with the controlling
total order:

`PROCEED < DEFER < NARROW < STOP / PRESERVE`

The specific all-blocking-buckets defer gate remains mandatory. One
defer-eligible blocker cannot produce aggregate `DEFER` when another blocker is
not defer-eligible. `NARROW` never selects or returns an invented smaller scope.

### Mandatory stops and fail-safe behavior

Implement the complete versioned Decision 0002 mandatory-stop list. A mandatory
stop in any required bucket produces aggregate `STOP / PRESERVE`. Stable stop
identifiers and affected bucket identities must make the result explainable.

The public outcome is a typed discriminated union with two non-overlapping cases:

#### Input rejection

Structurally malformed or contract-invalid input that cannot establish an
evaluable policy case returns a typed, non-authorizing input-rejection result. It
must:

- never authorize work;
- include stable validation/error identifiers;
- retain useful paths, bucket identifiers, and factual evidence when available;
- never invent a fallback value;
- never invent an aggregate operating mode or primary decision;
- never be represented as a successful policy evaluation; and
- handle expected validation failures without an uncaught exception.

#### Policy evaluation

Once input satisfies the runtime contract and establishes an evaluable policy
case, the evaluator returns a normal policy result. Mandatory-stop semantics then
produce aggregate `STOP / PRESERVE`, exactly one aggregate operating mode, and
exactly one aggregate primary decision, with stable rule/stop identifiers and
affected buckets.

Neither outcome may discard useful factual evidence, convert invalid evidence
into a permissive result, or invent a fallback. Input rejection does not weaken
Gate A's failure-closed policy behavior; it defines the non-authorizing boundary
for cases where policy evaluation cannot validly occur.

### Output and audit evidence

A successful policy evaluation returns an immutable value containing one
per-bucket result with:

- bucket identity and retained input/normalization evidence;
- `A[b]`, `C[b]`, `V[b]`, `I[b]`, supplied and adjusted `D[b]`;
- uncertainty state and applied adjustment;
- operating mode and any uncertainty cap;
- current affordability/blocking state;
- defer eligibility and reasons;
- mandatory-stop identifiers;
- deterministic reason/rule identifiers; and
- rounding evidence needed to reproduce the result.

It returns one aggregate result with:

- exactly one aggregate mode and primary decision;
- limiting and blocking bucket identities;
- the complete per-bucket results;
- all-blocking-buckets defer evidence;
- applied precedence/aggregation rule identifiers;
- all mandatory-stop identifiers;
- authoritative required-bucket and minimum-coherent-scope evidence;
- policy/configuration and rule-list versions; and
- the caller-supplied evaluation time.

An input rejection instead returns stable validation/error identifiers plus all
available paths, bucket identities, and factual evidence useful to correction. It
contains no aggregate mode, primary decision, allocations, or representation as
a successful evaluation.

Policy explanations must identify the constraining bucket and stable rule. Generic
“insufficient capacity” text is not enough. Output must be plain structured data;
it must not contain a database entity, framework response, provider type, or
mutable audit workflow.

### Existing contract compatibility

- Replace or refine the compile-time-only scalar policy placeholders in
  `packages/contracts/src/index.ts` only as needed for the approved multi-bucket
  policy boundary.
- Do not reinterpret T001 `PreflightDraft` fields as authoritative policy input.
- Do not reinterpret or migrate T002 run/outcome evidence.
- Do not require or construct the current forecast-bearing
  `GovernedExecutionPlan` placeholder. Gate B forecasting and later application
  composition remain unapproved.
- Document any compile-time compatibility break and update only repository-local
  callers/tests within the allowed surfaces. Do not retain a misleading scalar
  contract merely for nominal compatibility.

## Allowed architectural surfaces

An approved T003 implementation may change only:

- `packages/policy-engine/**` for package configuration, pure V1 policy logic,
  public exports, fixtures, tests, and focused documentation;
- `packages/contracts/**` for reviewed multi-bucket policy input/output runtime
  schemas and types, removal/refinement of misleading policy placeholders, and
  focused contract tests;
- root workspace TypeScript, Vitest, lint, formatting, package-manifest, or
  lockfile configuration only when narrowly required to wire the policy package
  into the existing toolchain; a new dependency requires prior explanation and
  founder approval; and
- documentation directly required to run, test, review, and hand off T003.

No application use case, UI demonstration, server action, database adapter,
migration, persistence repository, forecast engine, AI adapter, or platform
adapter is authorized. The reviewer-visible demonstration must use public pure
functions and fixtures/tests.

## Prohibited semantics and surfaces

Do not implement, simulate, infer, stub with invented behavior, or imply:

- forecasting formulas, ranges, confidence scoring, forecast-to-demand mapping,
  comparable-run selection, calibration, or automatic learning;
- a single global capacity scalar or arithmetic across different buckets;
- implicit bucket membership, AI-authoritative bucket membership, or automatic
  discovery of required constraints;
- provider-specific or non-linear normalization;
- caller-authoritative normalized policy amounts or trust in a claimed
  normalized value without exact evaluator recomputation;
- binary floating-point approximations for safety-critical shares, multipliers,
  thresholds, or time horizons;
- an approved cross-bucket reset/replenishment guarantee where none exists;
- automatic Codex capacity retrieval, account access, credentials, cookies,
  undocumented endpoints, or another coding-agent integration;
- policy thresholds, reserve values, uncertainty margins, freshness limits, or
  defer horizons other than the injected accepted V1 configuration;
- a safety-relaxing override or mutation/deletion of prior evaluation evidence;
- policy or AI inference of minimum-coherent-scope status;
- selection, decomposition, or execution of a narrowed tranche;
- execution scheduling at a reset, background work, or automatic re-preflight;
- persistence of policy evaluations or a `GovernedExecutionPlan`;
- changes to T001 or T002 product behavior, records, repositories, UI, or
  migrations;
- outcome recording, amendment logic, authentication, billing, analytics,
  deployment, or production operations;
- application or UI composition for a complete capacity preflight; or
- Gate B, Tranche 004–008, or product semantics not stated in Decision 0002.

Rule explanations may describe the deterministic result. They must not become
unapproved optimization guidance, forecasts, claims of success, or instructions
to execute work that the primary decision does not authorize.

## Required tests and checks

### Contract and validation tests

- Every approved mode, decision, uncertainty state, normalization unit, and
  version value parses; representative unknown and case-variant values fail.
- Valid multi-bucket inputs and results parse and round-trip without losing raw,
  normalized, authority, reset, activity, attestation, rule, or version evidence.
- Reject empty/duplicate bucket sets, duplicate composite identities, missing
  actor provenance, missing demand, invalid timestamps, non-finite/negative
  values, unsupported units, out-of-range basis points, and unsupported versions.
- Prove structurally malformed cases return typed non-authorizing input
  rejections with stable identifiers and useful paths/evidence, without an
  aggregate mode, aggregate decision, or uncaught expected-validation exception.
- Prove contract-valid evaluable mandatory-stop cases return successful policy
  evaluations with exactly one mode and `STOP / PRESERVE`.
- Prove the contract cannot silently reduce a required-bucket collection to a
  scalar or accept AI/tool proposals as authoritative membership.

### Normalization and arithmetic unit tests

- Evaluator-owned basis-point, percentage, and normalized-fraction whitelist
  mappings for availability, demand, manual reserve minimums, and post-reset
  availability.
- Exact parsing of canonical raw decimal evidence without binary floating-point
  approximation, while preserving the original raw value.
- Available-capacity downward rounding and demand/reserve upward rounding.
- Exact `0` and `10,000 bp` boundaries plus rejection rather than clamping.
- Caller-claimed normalized values are never trusted; exact agreement succeeds
  and an otherwise evaluable mismatch returns `STOP / PRESERVE` with a stable
  identifier.
- Correction and validation shares calculate as exact `1,500 / 10,000`, and the
  uncertainty multiplier calculates as exact `5 / 4`, with cases selected to
  expose binary floating-point or incorrect rounding behavior.
- Unsupported-unit, overflow, unsafe arithmetic, and cross-bucket substitution
  failure behavior.
- Representative raw values remain recoverable beside normalized values.

### Reserve and allocation tests

- Default 15% correction and validation floors independently per bucket.
- Manual minimums and higher target shares increase but never lower a floor.
- Residual implementation allocation is exact after directional rounding.
- `C[b] + V[b] >= A[b]`, validation-protection failure, and attempted borrowing
  trigger the accepted conservative result.
- Surplus in one bucket never funds another bucket.

### Mode, freshness, and uncertainty boundary tests

- `6,000`, `5,999`, `3,500`, `3,499`, `1,500`, `1,499`, and representative
  `0`/`10,000 bp` cases.
- Exactly 30 minutes remains fresh; 30 minutes plus the smallest supported time
  increment is stale.
- Known activity immediately after observation stales only explicitly affected
  buckets; unknown external activity is not inferred.
- `KNOWN`, `UNCERTAIN_BUT_BOUNDED`, and `UNKNOWN_OR_INVALID` behavior, including
  exact upward 25% adjustment and the bounded-uncertainty `CONSERVATION` cap.

### Reset and defer tests

- Exact confirmed resets with bucket-specific post-reset evidence.
- Exactly 24 hours is eligible; 24 hours plus the smallest supported time
  increment is not.
- Missing, uncertain, rolling, or already-passed reset evidence fails to justify
  `DEFER` under the accepted rules.
- One bucket's reset never replenishes another bucket.
- For each blocking bucket, normalize raw `PRA[b]`, recalculate `C_post[b]` and
  `V_post[b]`, calculate `I_post[b]`, and compare unchanged adjusted demand with
  `I_post[b]`.
- Prove current pre-reset `C[b]`, `V[b]`, and `I[b]` are not reused for post-reset
  affordability.
- Every blocking bucket qualifies → `DEFER`.
- One nonqualifying blocking bucket → fall through to `NARROW` or
  `STOP / PRESERVE` as dictated by the ordered rules.
- Healthy non-blocking buckets need not reset.

### Decision-table and precedence tests

- Every ordered primary-decision branch and every mandatory-stop condition.
- Aggregate mode always equals the most restrictive per-bucket mode.
- Aggregate decision uses
  `PROCEED < DEFER < NARROW < STOP / PRESERVE`.
- `DEFER` plus `NARROW` produces aggregate `NARROW`.
- A mandatory stop dominates reset eligibility, affordability, and caller
  preference.
- Aggregate `CRITICAL` produces `STOP / PRESERVE` for new implementation.
- Affordable `LOW` returns `PROCEED` only with a true, valid authoritative
  minimum-coherent-scope attestation; otherwise it returns `NARROW`.
- A healthy bucket never relaxes a restrictive bucket.
- `NARROW` output contains no inferred smaller scope.

### Invariant, determinism, and explainability tests

- Identical input, explicit evaluation time, and configuration produce deeply
  identical output.
- Input order does not alter the semantic result; output ordering must be stable
  and documented.
- Exactly one aggregate mode and one aggregate decision are always returned for
  an evaluable input, and neither is returned for a rejected input.
- Reserves remain protected independently for all generated valid cases.
- Every restrictive result identifies affected bucket IDs and stable rule IDs.
- Every result retains policy/configuration versions and reproducible evidence.
- Mutation testing or equivalent focused branch-coverage evidence exercises
  safety-critical comparisons and precedence paths where practical without a
  new unapproved dependency.

### Repository verification

Run and pass:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

`pnpm test:e2e` must also remain green as a regression check even though T003
adds no browser workflow. `pnpm db:generate` must report no schema drift because
this tranche authorizes no database changes.

Do not weaken validation or remove failing tests to obtain a green result.

## Acceptance criteria

T003 is acceptable only when all of the following are true:

1. Decision 0002 remains founder-approved, byte-unchanged, and is implemented
   without added policy semantics.
2. One pure public evaluator returns a typed non-authorizing input rejection for
   structurally invalid input or reproducible structured policy evidence for an
   evaluable versioned multi-bucket case.
3. Every explicitly required bucket is retained and evaluated independently;
   none is inferred, omitted, substituted, averaged, or combined.
4. Required-bucket authority and minimum-coherent-scope attestation evidence
   round-trip with the result and are never inferred by policy or AI.
5. The evaluator is authoritative for normalization of every applicable raw
   amount/unit; caller claims are never trusted, and mismatches fail closed with
   stable identifiers.
6. Exact-whitelist normalization, directional rounding, and invalid-unit failure
   behavior match Decision 0002.
7. Safety-critical calculations use exact integer/rational forms, including
   `1,500 / 10,000` reserve floors and the `5 / 4` uncertainty multiplier,
   without binary floating-point approximation or a new decimal dependency.
8. Correction and validation floors, hard ring-fencing, and residual
   implementation allocation are correct independently per bucket.
9. Wall-clock and known-event freshness rules match all exact boundaries.
10. Reset and expected availability remain bucket-specific. Each blocking
    bucket's post-reset reserves and implementation allocation are recalculated
    from evaluator-normalized `PRA[b]`; aggregate `DEFER` requires every blocker
    to qualify and authorizes no work.
11. Per-bucket modes and aggregate mode match the accepted thresholds and
   restrictiveness order.
12. The primary-decision rules use strict precedence and the accepted total order
    `PROCEED < DEFER < NARROW < STOP / PRESERVE`; `DEFER + NARROW` aggregates to
    `NARROW`.
13. Every accepted mandatory stop and uncertainty rule fails closed with stable,
    explainable identifiers and affected bucket evidence.
14. Every successful policy evaluation contains exactly one aggregate mode and
    decision, all per-bucket allocations/evidence, limiting/blocking buckets,
    applied rules, and complete version information.
15. Every input rejection is typed and non-authorizing, preserves useful error
    evidence, and contains no fabricated aggregate mode or decision.
16. The engine is deterministic and independent of UI, application,
    persistence, providers, network, environment, AI, randomness, and system
    clock.
17. Existing T001 and T002 behavior, contracts outside the approved policy
    refinement, database schema, and migrations remain unchanged.
18. No forecast, calibration, platform retrieval, complete preflight, governed
    plan persistence, UI, or future-tranche behavior is implemented or implied.
19. All required contract, unit, boundary, precedence, invariant, explainability,
    repository, regression, and schema-drift checks pass.
20. The pull-request diff remains inside this assignment and documents a blocker
    rather than inventing any missing semantic.

## Expected documentation

Update documentation only as needed to provide:

- the public evaluator and contract entry points;
- the typed input-rejection versus successful-policy-evaluation boundary;
- Decision 0002 traceability from stable rule/stop IDs to tests;
- the injected V1 configuration and versioning boundary;
- evaluator-owned normalization and exact integer/rational arithmetic;
- normalization, rounding, freshness, post-reset reserve recalculation,
  reset/defer, and aggregation examples;
- commands to run focused policy tests and the complete verification suite;
- dependency-direction confirmation for the pure policy package;
- any compatibility impact from refining compile-time policy placeholders;
- assumptions, blockers, and deliberately deferred behavior; and
- confirmation that no persistence, UI, forecast, AI, provider, or migration
  surface changed.

Do not modify Decision 0002, the roadmap, architecture context, T001/T002
assignments, or recording semantics to fit an implementation preference.

## Branch and pull-request expectations

- After explicit founder implementation authorization, create
  `feature/tranche-003-deterministic-policy-engine-v1` from the exact accepted
  clean `main` baseline named by the founder.
- Do not commit implementation directly to `main`.
- Keep contracts, engine logic, and test changes focused and reviewable; exclude
  unrelated formatting, dependency upgrades, refactors, and documentation churn.
- Open one pull request targeting `main` only after all checks pass.
- The pull request must include:
  - concise implementation and architecture summary;
  - Decision 0002 and assignment acceptance-criteria checklists;
  - a policy-rule-to-test traceability table;
  - exact verification commands and results;
  - representative multi-bucket input/output evidence, including
    `DEFER + NARROW → NARROW`;
  - representative typed input rejection and evaluable mandatory-stop evidence;
  - exact-arithmetic and post-reset recalculation evidence;
  - confirmation of deterministic behavior and pure dependency boundaries;
  - contract compatibility notes;
  - confirmation of no migration/schema diff;
  - assumptions, blockers, and exact intentionally deferred work; and
  - confirmation that no unapproved forecast, AI, provider, persistence, UI, or
    future-tranche semantics were introduced.

Review results are `ACCEPT`, `ACCEPT WITH REVISION`, `HOLD`, or `STOP`. No later
tranche begins until the founder records the result and grants separate
authority.

## Handoff requirements

At founder-review handoff, provide:

- branch name, final commit SHA, and pull-request link;
- clean `git status` and confirmation that no secret or local artifact is
  included;
- exact contract, policy-engine, test, configuration, and documentation file
  summary;
- public evaluator usage with representative fixtures;
- input-rejection and successful-evaluation contract examples;
- exact full-suite and focused-policy test results;
- exact-arithmetic and evaluator-owned normalization evidence;
- rule/stop ID traceability and boundary-test evidence;
- deterministic repeatability and input-order evidence;
- confirmation that Decision 0002 is byte-unchanged;
- confirmation that migrations and executable T001/T002 behavior are unchanged;
- blockers, compromises, assumptions, and founder questions; and
- exact work intentionally deferred.

## Explicit stop conditions

Stop the affected work, preserve a reviewable branch, and report the exact
blocker if:

- Decision 0002 is changed, withdrawn, ambiguous for the encountered case, or
  conflicts with this assignment;
- implementation would require choosing a new unit, normalization rule, rounding
  rule, threshold, reserve rule, uncertainty rule, precedence rule, stop rule,
  reset/defer rule, override, or audit meaning;
- the engine would need to infer required buckets or minimum-coherent-scope
  status;
- an input requires provider-specific/non-linear normalization or an unapproved
  cross-bucket reset guarantee;
- policy demand or uncertainty cannot be supplied without inventing a forecast,
  confidence mapping, or cold-start behavior;
- `NARROW` would require selecting a smaller scope or `DEFER` would require
  scheduling/restarting work;
- a policy result cannot be explained using stable rules and retained bucket
  evidence;
- implementation requires persistence, a migration, UI, application workflow,
  automatic capacity retrieval, AI analysis, authentication, billing,
  deployment, or another integration;
- refining the scalar placeholders would require changing T001/T002 product
  meaning or stored evidence;
- a new dependency or broad framework materially expands the accepted stack;
- a required safety test cannot be made reliable without weakening the boundary;
- unrelated changes or collaborator work cannot be separated safely; or
- implementation would decide Gate B, Tranche 004–008, or any founder-controlled
  semantic absent from Decision 0002.

Do not resolve a stop condition with a default, guessed rule, hidden fallback,
placeholder semantic, or UI disclaimer. State the exact decision needed, the
affected acceptance criterion, and the smallest founder-reviewable options.

## Review rubric

The tranche should be evaluated for:

- **Policy fidelity:** exact agreement with Decision 0002, including every
  boundary, precedence rule, and final founder confirmation.
- **Code quality:** readable pure functions, safe arithmetic, precise validation,
  stable identifiers, and maintainable configuration organization.
- **Architecture adherence:** no outward dependency from policy/contracts into
  application, UI, persistence, providers, or AI.
- **Auditability:** complete reproducible evidence and explanations tied to
  specific buckets and versioned rules.
- **Scope discipline:** no forecast, persistence, UI, integration, or future
  semantic leakage.
- **Independence:** autonomous technical execution inside the approved boundary
  and prompt escalation of genuine policy ambiguity.
- **Testing discipline:** exhaustive exact boundaries, precedence, invariants,
  conservative failures, determinism, and regression verification.
- **Communication and collaboration fit:** focused commits, explicit assumptions,
  precise handoff evidence, and respect for founder-controlled product meaning.
