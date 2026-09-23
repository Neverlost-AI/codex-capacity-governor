# Tranche 004: Forecast Engine V1

## Assignment status

- **Status:** Founder-approved; implementation authorized — 2026-09-23
- **Type:** Bounded pure-domain implementation tranche
- **Controlling decision:**
  `docs/decisions/0003-gate-b-forecasting-method-v1.md`
- **Founder approval date:** 2026-09-23
- **Implementation owner:** Codex
- **Founder-approved pre-authorization baseline:** `e272ccbdac7a6caf316db1b348a7a3bfaa717b0b`
- **Implementation branch:** `feature/tranche-004-forecast-engine-v1`
- **Pull-request target:** `main`
- **Product and acceptance owner:** Founder

This document is the founder-approved bounded implementation authority for
Tranche 004. Founder approval on 2026-09-23 authorizes Codex to implement only
this assignment after the approval record is landed on `main`. The implementation
branch must be created from the resulting clean `main` approval-record commit,
which is a documentation-only descendant of the founder-approved pre-authorization
baseline named above. No T005+ work is authorized.

Before any authorized implementation, read `README.md`, `AGENTS.md`,
`docs/ARCHITECTURE_CONTEXT.md`, `docs/DEVELOPMENT_WORKFLOW.md`,
`docs/MVP_ROADMAP.md`, Decision 0003, Decision 0002, the accepted T002
recording decision/assignment, and the landed T003 implementation notes.

## Objective

Implement Decision 0003 as a pure, deterministic, framework-independent Forecast
Engine V1.

Given:

- explicit reviewed tranche/work-item characterization;
- an explicit non-empty required forecast-bucket set;
- explicit forecast evaluation time;
- complete injected V1 forecast configuration; and
- optional explicitly supplied calibration candidates;

the engine must return either:

1. a typed, non-authorizing input rejection for structurally invalid evidence; or
2. one deterministic forecast evaluation containing, for every required bucket:
   - cold-start baseline;
   - optional transparent history adjustment;
   - low/expected/high planning range;
   - confidence;
   - assumptions and unknowns;
   - compatible-history inclusion/exclusion evidence;
   - calculation/rounding evidence; and
   - method/configuration/profile versions.

The tranche also provides a pure, typed forecast-to-policy composition projection
for the Gate B confidence mapping accepted in Decision 0003. The projection may
form Gate A demand/uncertainty evidence only when the forecast is composition
compatible. It does not invoke the policy engine or return a Governor decision.

T004 does not persist forecasts, load history from a database, build a user
interface, characterize work with AI, retrieve Codex capacity, or implement
Governor policy.

## Reviewer-visible completion condition

From a clean checkout, a reviewer can run focused tests and invoke one public
forecast entry point with reviewed fixtures without database, browser, network,
AI, provider SDK, environment-specific state, randomness, or system-clock
access.

The demonstration must include:

1. a well-characterized cold-start forecast with no history;
2. a history-informed forecast using three compatible completed observations;
3. a LOW-confidence forecast caused by an explicit `UNKNOWN` factor;
4. incompatible and insufficient history falling back to cold start with reasons;
5. a forecast greater than one capacity cycle remaining unclamped;
6. a HIGH/MEDIUM/LOW forecast-to-Gate-A composition mapping;
7. a typed not-composable result for an above-cycle policy demand; and
8. deterministic repeatability and input-order independence where order is not
   semantically meaningful.

## Controlling semantics

Decision 0003 is authoritative in full. This assignment may choose technical
organization but may not alter or infer product meaning.

The implementation must preserve these controlling boundaries:

- Forecasting is deterministic weighted task decomposition plus optional
  reference-class median adjustment.
- Manual reviewed task characterization is first-class.
- Forecast quantities remain independent per required bucket.
- The initial V1 scale is exactly `100 bp per work point`.
- Public planning precision is exactly 100 bp using the accepted directional
  rounding rules.
- Range bands are exactly:
  - HIGH: `0.90 / 1.00 / 1.10`;
  - MEDIUM: `0.75 / 1.00 / 1.25`;
  - LOW: `0.50 / 1.00 / 1.50`.
- Range values are planning cases, not percentiles or guarantees.
- A fully known normal cold start is MEDIUM confidence.
- HIGH requires at least five compatible completed observations and the accepted
  ratio-consistency rule.
- Explicit UNKNOWN factors receive their accepted conservative adders and force
  LOW confidence.
- Three or more compatible completed runs use the median
  `actual / originalExpected` ratio; fewer than three apply no history
  adjustment.
- Partial and failed runs never calibrate a full-completion V1 forecast.
- Existing T002 raw units are never silently normalized or treated as comparable.
- Forecasts may exceed `10,000 bp` and are never clamped merely to fit Gate A.
- Confidence maps to Gate A exactly as:
  - HIGH → `KNOWN`;
  - MEDIUM → `UNCERTAIN_BUT_BOUNDED`;
  - LOW → `UNKNOWN_OR_INVALID`.
- T004 never returns an operating mode, Governor decision, reserve allocation,
  narrowed scope, execution plan, or execution authorization.

## Technical scope

### Forecast package bootstrap

Create `packages/forecast-engine` as a normal workspace TypeScript package
using the existing repository toolchain.

The package should export a small public V1 boundary, expected to be equivalent
in meaning to:

- `evaluateForecastV1(input: unknown)`; and
- `projectForecastToPolicyDemandV1(forecast, bucketId)` or an equally explicit
  pure projection boundary.

Names may change for a narrowly documented technical reason without changing
semantics.

The package must remain free of:

- React/Next.js;
- application-service dependencies;
- persistence/database drivers;
- filesystem or network access;
- provider SDKs;
- AI/model calls;
- environment-variable dependence;
- randomness; and
- system-clock access.

Evaluation time is explicit input.

### Runtime contracts

Add reviewed Zod runtime schemas and inferred TypeScript types in
`packages/contracts` for the T004 public boundary.

At minimum, contracts must represent:

#### Forecast identity and versions

- scope/tranche ID;
- explicit evaluation time with offset and no precision finer than the supported
  runtime comparison boundary;
- forecast method version;
- forecast configuration version;
- bucket-profile version; and
- required forecast-bucket identities.

#### Work characterization

Each work item must contain:

- stable work-item ID;
- title or short factual label;
- exactly one accepted work category;
- complexity;
- context load;
- repository condition;
- dependency change;
- validation burden;
- novelty;
- correction exposure; and
- reviewed-characterization source/provenance.

The contract must distinguish an explicit accepted `UNKNOWN` factor from a
missing/invalid field. Missing or unsupported values return input rejection;
they are not silently converted to `UNKNOWN`.

#### Required forecast buckets

Each forecast bucket must retain stable identity compatible with future Gate A
composition. At minimum preserve:

- bucket ID;
- provider/manual-source identity;
- capacity-window identity;
- reset-cycle identity; and
- bucket-profile version.

Do not infer bucket membership. The non-empty set is explicit caller-reviewed
evidence.

#### Forecast configuration

The complete injected configuration must contain the accepted Decision 0003 V1
values, including:

- category base scores;
- every factor adder;
- generic cold-start scale `100 bp/work point`;
- HIGH/MEDIUM/LOW range multipliers as exact rational/integer forms;
- 100-bp public forecast precision;
- compatible-history minimum `3`;
- HIGH-confidence minimum history `5`;
- 90-day recency limit;
- ratio-consistency factor `2`;
- confidence ordering;
- method/configuration/profile versions; and
- any stable identifiers needed for calculation/evidence traceability.

Tests must inject configuration. Safety-relevant or reproducibility-sensitive
calculation must not depend on distributed unversioned literals.

#### Calibration candidates

T004 may accept optional calibration candidates as explicit pure input. It does
not load T002 persistence itself.

Each candidate needs enough evidence to apply or reject every Decision 0003
compatibility criterion, including:

- candidate/run identity;
- project/repository scope identity;
- bucket identity/class;
- forecast method/configuration/profile versions used by the original forecast;
- original low/expected/high values for that bucket;
- run outcome;
- explicit normalized actual implementation consumption compatible with that
  bucket;
- record/evidence time;
- amendment/current-evidence status or equivalent evidence needed to avoid using
  superseded incompatible observations; and
- provenance/reference sufficient to explain inclusion or exclusion.

A raw T002 amount/unit without a reviewed compatible normalized representation is
not a valid calibration amount for V1.

### Typed public outcomes

The public evaluation boundary should use a discriminated outcome with two
non-overlapping cases.

#### Input rejection

Structurally invalid evidence returns a typed rejection that:

- never authorizes work;
- has stable validation identifiers and paths;
- retains useful factual IDs/received scalar evidence where safe;
- contains no fabricated forecast range or confidence; and
- handles expected validation failures without an uncaught exception.

#### Forecast evaluation

An evaluable case returns structured forecast evidence containing:

- all reviewed work characterization;
- item-level scoring details;
- total work score;
- every required bucket;
- baseline expected calculation per bucket;
- every calibration candidate considered;
- deterministic inclusion/exclusion classification and reason IDs;
- included ratios;
- median ratio when applicable;
- adjusted expected amount;
- raw range calculations;
- rounded low/expected/high;
- per-bucket confidence;
- overall confidence;
- assumptions;
- unknowns;
- versions; and
- explicit evaluation time.

Output collections whose order is not semantically meaningful must use a
documented deterministic canonical ordering independent of locale.

### Exact score calculation

For each work item:

`ItemScore = CategoryBase + Complexity + Context + Repository + Dependency +
Validation + Novelty + CorrectionExposure`

For the tranche:

`WorkScore = sum(ItemScore)`

Use exactly the Decision 0003 values.

An explicit `UNKNOWN` factor uses that factor's highest accepted adder and is
recorded as an unknown that forces LOW confidence.

Reject arithmetic overflow or unsafe integer/rational results rather than
clamping.

### Cold-start calculation

For every required forecast bucket `b`:

`E0[b] = WorkScore * 100 bp`

Cold start requires no history.

No provider-specific or bucket-specific scale is introduced in initial V1. A
future profile-specific scale requires separately approved versioned semantics.

### Compatible-history selection

For every candidate and bucket, deterministically evaluate every accepted
Decision 0003 criterion.

A candidate is included only when all required compatibility checks pass.

Stable exclusion reason identifiers should cover at least:

- project/repository mismatch;
- bucket mismatch;
- forecast method mismatch;
- configuration mismatch;
- profile mismatch;
- non-COMPLETED outcome;
- missing/incompatible normalized actual implementation consumption;
- missing/nonpositive original expected forecast;
- outside 90-day recency;
- superseded/invalid current evidence; and
- structurally invalid candidate evidence where the entire input is not already
  rejected.

Do not silently discard an outlier that otherwise qualifies.

### Median calibration

For each included completed candidate:

`ratio = actualImplementation / originalExpected`

Use exact rational arithmetic where practical and preserve numerator/denominator
evidence.

- 0–2 included candidates: `E = E0`.
- 3+ included candidates: `E = E0 * median(ratios)`.

Define median deterministically:

- odd count: middle sorted ratio;
- even count: exact arithmetic mean of the two middle ratios.

Do not convert ratios to binary floating point before determining order or
median.

### Confidence evaluation

Per bucket:

1. any explicit required `UNKNOWN` factor or accepted incomplete profile
   evidence → `LOW`;
2. otherwise, fewer than five included compatible completed observations →
   `MEDIUM`;
3. otherwise, `HIGH` only when all calibration ratios are positive and
   `maxRatio <= 2 * minRatio`;
4. if five or more observations exist but consistency fails → `MEDIUM`.

Overall confidence is the most conservative bucket confidence.

History insufficiency alone never changes a fully known characterization from
MEDIUM to LOW.

### Range calculation and rounding

From adjusted expected `E[b]`, calculate exact rational raw bounds using the
accepted confidence band.

Round public values to 100-bp increments:

- low: down;
- expected: up;
- high: up.

For non-empty positive work, a positive public bound must not round to zero.

Do not clamp to `10,000 bp`. Preserve raw and rounded evidence and guarantee:

`0 <= low <= expected <= high`.

### Forecast-to-policy projection

Implement the accepted confidence mapping as a pure projection boundary that
does not invoke `packages/policy-engine`.

For one bucket:

- HIGH:
  - demand = rounded expected;
  - uncertainty = `KNOWN`.
- MEDIUM:
  - demand = rounded expected;
  - uncertainty = `UNCERTAIN_BUT_BOUNDED`.
- LOW:
  - uncertainty = `UNKNOWN_OR_INVALID`;
  - retain forecast planning evidence but do not present the projection as
    authorizing.

When rounded expected demand exceeds the Gate A V1 maximum compatible
per-bucket raw demand, return a typed `NOT_COMPOSABLE`-style result with a
stable reason rather than clamping or narrowing.

The projection contract must be tested against the actual T003
`policyRawQuantitySchema` and `policyUncertaintySchema` (or their reviewed
current equivalents) so compatibility is real rather than nominal.

T004 must not reproduce Gate A reserve, affordability, mode, defer, stop, or
decision logic.

### Forecast-error helper semantics

T004 may implement pure comparison helpers required to verify Decision 0003
semantics, but it must not persist or aggregate performance claims.

For a compatible COMPLETED run:

- signed error = actual − expected;
- absolute error = `abs(actual − expected)`;
- range hit = `low <= actual <= high`;
- calibration ratio = `actual / expected`.

For PARTIAL or FAILED runs, return an explicit not-comparable-for-full-completion
result. Preserve actual evidence without calling the difference forecast error.

Missing/incompatible actual evidence also returns explicit unavailable
comparison evidence.

Do not calculate or expose an overall accuracy percentage.

## Allowed architectural surfaces

An approved T004 implementation may change only:

- `packages/forecast-engine/**` for package configuration, pure forecast
  calculation, policy projection, comparison helpers, fixtures, tests, exports,
  and focused documentation;
- `packages/contracts/**` for reviewed forecast/task/configuration/calibration
  runtime schemas/types and focused tests;
- root workspace TypeScript, Vitest, lint, formatting, package-manifest, or
  lockfile configuration only when narrowly required to wire the new package into
  the accepted toolchain;
- documentation directly needed to run, verify, review, and hand off T004.

No application use case, web UI, server action, persistence adapter, migration,
database schema, AI adapter, platform adapter, automatic history loader, or
Governor-plan storage is authorized.

Do not change Decision 0002, Decision 0003, T001/T002 product semantics, T003
policy semantics, or existing migrations to fit an implementation preference.

## Explicit exclusions

Do not implement, simulate, infer, or imply:

- Governor reserve allocation;
- operating-mode calculation;
- `PROCEED`, `NARROW`, `DEFER`, or `STOP / PRESERVE`;
- automatic narrowed-scope selection;
- complete preflight composition;
- governed-plan persistence;
- forecast persistence or database history loading;
- automatic Codex balance/usage retrieval;
- provider-specific or non-linear capacity conversion;
- automatic reinterpretation of T002 raw units;
- AI-only or AI-authoritative characterization;
- model calls inside the pure engine;
- opaque statistical/ML calibration;
- percentile/probability claims for forecast ranges;
- forecast “accuracy” or savings/productivity claims;
- cross-project benchmarking;
- another coding-agent platform;
- UI/dashboard work;
- authentication, billing, analytics, deployment, or production operations; or
- T005–T008 behavior.

## Required tests and evidence

### Contract tests

- Every accepted category/factor/confidence/version value parses.
- Representative unknown/case-variant unsupported values fail.
- Explicit `UNKNOWN` parses only where approved.
- Missing required characterization is rejected rather than converted to
  `UNKNOWN`.
- Valid multi-work-item/multi-bucket inputs and outputs round-trip without losing
  provenance or versions.
- Duplicate work-item IDs and duplicate bucket identities are rejected.
- Invalid/non-offset timestamps and unsupported versions fail.
- Structurally invalid cases return typed non-authorizing rejection without a
  fabricated range/confidence.

### Scoring tests

- Every category base score.
- Every factor adder.
- Every UNKNOWN conservative-adder case.
- Multi-item summation.
- Exact cold-start `100 bp/work point`.
- Safe arithmetic/overflow behavior.
- Input work-item ordering does not change semantic output.

### Range and confidence tests

- Exact HIGH/MEDIUM/LOW range multipliers.
- 100-bp low-down/expected-up/high-up rounding.
- Positive non-empty forecast does not become zero.
- `low <= expected <= high` for generated valid cases.
- Cold start with complete characterization is MEDIUM.
- UNKNOWN forces LOW.
- 4 compatible runs remain MEDIUM.
- 5 compatible consistent runs become HIGH.
- 5+ inconsistent runs remain MEDIUM.
- Overall confidence is the most conservative bucket confidence.

### History-selection and calibration tests

- 0, 1, and 2 compatible runs do not adjust the baseline.
- 3 compatible runs use the exact median ratio.
- Even-count median uses the exact middle-pair mean.
- Same-project/repository requirement.
- Bucket, method, configuration, and profile compatibility.
- COMPLETED-only calibration.
- 90-day exact boundary and immediately older case.
- Missing/incompatible actual evidence exclusion.
- Superseded/ineligible candidate exclusion.
- Outliers remain present and auditable.
- Existing raw T002-style evidence cannot become comparable without reviewed
  normalized evidence.
- Candidate input ordering does not alter included set, median, or output.

### Policy-projection tests

- HIGH → expected + `KNOWN`.
- MEDIUM → expected + `UNCERTAIN_BUT_BOUNDED`.
- LOW → `UNKNOWN_OR_INVALID`.
- A MEDIUM worked example aligns with the Gate A 5/4 uncertainty behavior.
- Expected demand within one cycle validates against the actual current T003
  policy-demand contract.
- Above-cycle expected demand returns typed not-composable evidence and is never
  clamped.
- Projection code contains no Gate A mode/reserve/decision implementation.

### Forecast-error tests

- COMPLETED signed and absolute error.
- Range hit true/false boundaries.
- Exact calibration ratio.
- PARTIAL and FAILED return not-comparable-for-full-completion.
- Missing/incompatible actual evidence returns unavailable.
- No overall accuracy percentage or cross-bucket error aggregation.

### Determinism, provenance, and invariants

- Identical input/history/evaluation-time/configuration returns deeply identical
  semantic output.
- Canonical output order is locale-independent and documented.
- Every result retains complete method/configuration/profile versions.
- Every included/excluded history candidate has a stable reason.
- Every calculation retains sufficient raw/exact evidence to reproduce output.
- Multi-bucket estimates are never aggregated or substituted.
- Forecast Engine V1 has no UI, persistence, network, AI, provider, environment,
  randomness, or system-clock dependency.

### Repository verification

Run and pass:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm db:generate
git diff --check
```

If repository-wide formatting still contains known unrelated baseline failures,
the implementation must prove all T004 changed files independently pass the
repository formatter and document the unchanged baseline failure. Do not modify
unrelated files solely to make a repository-wide pre-existing format failure
green.

`pnpm db:generate` must show no schema drift because T004 authorizes no database
changes.

## Acceptance criteria

T004 is acceptable only when all are true:

1. Decision 0003 remains byte-unchanged and all implemented forecast semantics
   match it exactly.
2. One pure public evaluator returns typed rejection or a deterministic versioned
   forecast evaluation.
3. Work scoring uses only the accepted visible category/factor configuration.
4. Manual reviewed characterization is sufficient; no AI provider is required.
5. Every required bucket receives an independent forecast and no cross-bucket
   arithmetic occurs.
6. Cold start works with zero history at MEDIUM confidence when characterization
   is complete.
7. UNKNOWN factors receive accepted conservative adders and force LOW confidence.
8. History compatibility, recency, COMPLETED-only selection, and median
   adjustment exactly match Decision 0003.
9. Partial/failed runs remain factual evidence but do not calibrate
   full-completion forecasts.
10. Existing T002 raw units are not silently reinterpreted.
11. Range multipliers and 100-bp rounding exactly match Decision 0003.
12. Public ranges preserve `low <= expected <= high` and do not claim percentile
    or probability meaning.
13. Forecasts greater than one cycle remain unclamped.
14. HIGH/MEDIUM/LOW map to Gate A exactly as accepted.
15. Above-cycle demand returns typed non-composable evidence rather than a
    fabricated policy input.
16. Forecast-error helpers match the accepted COMPLETED/PARTIAL/FAILED behavior.
17. Every result preserves assumptions, unknowns, provenance, calculation
    evidence, included/excluded history, and versions.
18. Identical inputs produce deterministic output independent of irrelevant input
    ordering.
19. Forecast-engine and contracts preserve inward dependency direction and add no
    UI/persistence/provider/AI dependency.
20. No Governor decision, reserve calculation, complete preflight, persistence,
    automatic retrieval, UI, or later-tranche behavior is implemented.
21. All required focused and repository checks pass without weakening existing
    tests or validation.
22. The pull-request diff remains inside this assignment or stops for founder
    review.

## Expected documentation

Document:

- public forecast and projection entry points;
- Decision 0003 traceability;
- complete injected V1 configuration;
- scoring and UNKNOWN behavior;
- cold-start calculations;
- history compatibility and median adjustment;
- confidence/range semantics;
- exact rounding;
- above-cycle behavior;
- policy-composition boundary;
- forecast-error helper behavior;
- focused/full verification commands;
- assumptions and deliberately deferred behavior; and
- confirmation that no persistence, UI, AI, provider, migration, or Gate A logic
  changed.

## Branch and pull-request expectations

Founder implementation authorization is granted.

1. create `feature/tranche-004-forecast-engine-v1` from the exact clean
   `main` commit that lands this approval record;
2. keep changes inside the allowed surfaces;
3. do not commit implementation directly to `main`;
4. run all required focused and repository verification;
5. open one focused pull request targeting `main`; and
6. do not merge without founder acceptance.

The PR must include:

- architecture/implementation summary;
- Decision 0003 and assignment acceptance checklists;
- score/configuration-to-test traceability;
- worked cold-start, history-informed, UNKNOWN, and above-cycle examples;
- policy-projection compatibility evidence;
- exact test/coverage/verification results;
- no-schema-diff confirmation;
- deterministic/provenance evidence;
- assumptions/blockers;
- explicitly deferred behavior; and
- clean git status.

## Handoff requirements

At founder-review handoff provide:

- branch, final SHA, and PR link;
- changed-file list and diff stat;
- focused/public API examples;
- exact test counts and coverage;
- cold-start and calibrated calculation evidence;
- history inclusion/exclusion evidence;
- confidence/range/rounding evidence;
- policy-projection evidence;
- forecast-error comparison evidence;
- confirmation Decision 0003 is byte-unchanged;
- confirmation T003 policy behavior and database schema are unchanged;
- clean working tree; and
- exact deferred work.

## Explicit stop conditions

Stop and request founder review if implementation would require:

- changing any Decision 0003 weight, scale, multiplier, threshold, range meaning,
  confidence rule, compatibility criterion, recency rule, median procedure,
  rounding rule, or policy mapping;
- adding a new task factor or category with product meaning not recorded in
  Decision 0003;
- inventing a bucket-specific scale/profile;
- automatically normalizing raw T002 evidence;
- choosing provider-specific capacity conversion;
- changing Gate A policy contracts or behavior to make a forecast fit;
- clamping or splitting an above-cycle forecast into an invented policy scope;
- deciding that a PARTIAL/FAILED run is calibration-compatible;
- inferring task characterization with AI as authoritative input;
- adding persistence, migration, UI, application orchestration, provider access,
  automatic history retrieval, billing, authentication, or deployment;
- introducing opaque ML/statistical prediction or probability claims;
- making a performance/accuracy/savings claim unsupported by recorded evidence;
- requiring a new broad dependency or framework;
- changing existing T001/T002/T003 semantics; or
- implementing T005–T008 behavior.

Do not resolve a stop condition with a guessed default, hidden fallback, or UI
disclaimer. Preserve the reviewable state and identify the smallest founder
decision required.
