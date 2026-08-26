# Gate B: Forecasting Method V1 options

## Document status

**Founder-review preparation only — not approved — no implementation authority**

- **Prepared:** 2026-08-25
- **Prepared by:** Codex
- **Decision owner:** Founder
- **Applies to:** proposed Forecast Engine V1 semantics
- **Does not authorize:** Gate B closure, Tranche 004, forecast-engine code,
  contracts, persistence, migrations, UI, AI analysis, calibration automation,
  or composition with Governor policy

This document compares options and recommends a coherent V1 package. Only the
cross-cutting rulings recorded below are founder-resolved; every other semantic
remains a proposal until explicitly accepted or changed. The companion draft
decision record is
`docs/decisions/0003-gate-b-forecasting-method-v1-DRAFT.md`.

## Executive recommendation

Use a **manual-first, deterministic three-point decomposition with an optional
accepted reference-class adjustment**:

1. The caller supplies the authoritative required capacity buckets. Forecasting
   never infers, adds, removes, combines, or substitutes buckets.
2. A human/caller decomposes the bounded scope into explicit work components.
3. For every component and required bucket, the caller supplies optimistic
   plausible, expected planning, and conservative plausible implementation
   demand in an explicit bucket-compatible unit.
4. The forecast sums each point independently within each bucket. Buckets remain
   separate.
5. With no qualified history, the manual three-point totals are the forecast and
   confidence cannot exceed `MEDIUM`.
6. The preferred history set contains at least five qualified comparable
   completed runs from the preceding 180 days. When that threshold is not met,
   older qualified completed runs may be presented only as a separate, explicit
   fallback set with their age and provenance. Whether either set may produce a
   numeric adjustment remains held for founder review.
7. Partial and failed runs remain visible but are not treated as completed-scope
   point observations. Their consumption is lower-bound/adverse evidence.
8. Confidence is an evidence-quality label, not a probability or accuracy
   claim.
9. Forecast error is calculated independently per bucket and compatible unit.
   Cross-bucket errors are never averaged or netted.
10. Every input, assumption, exclusion, history reference, adjustment, rounding
    operation, and configuration version remains reproducible.

This recommendation is intentionally modest. It works with zero historical
runs, preserves manual characterization, permits transparent improvement from
history, and avoids inventing statistical precision or opaque learning.

## Founder review disposition — 2026-08-25

The founder has accepted five cross-cutting rulings, but has not yet accepted
the complete Gate B method. A row is `HOLD` when the ruling resolved only part of
that decision or did not address it. `CHANGE` records an explicit change to the
original recommendation.

| # | Gate B decision | Current result | Founder ruling recorded / remaining hold |
| ---: | --- | --- | --- |
| 1 | Initial forecasting method | `HOLD` | No ruling yet on manual decomposition or history-factor application. |
| 2 | Low / expected / high semantics | `HOLD` | Implementation-only scope and preservation above one cycle are accepted; plausible-band meanings and rounding remain held. |
| 3 | Confidence semantics | `HOLD` | `EXPECTED` is the candidate `D[b]`, unchanged by confidence; confidence taxonomy and any Gate A uncertainty mapping remain held. |
| 4 | Task inputs | `HOLD` | No ruling yet on taxonomy, required fields, or one-component fallback. |
| 5 | Historical calibration/comparables | `CHANGE` | Prefer five comparable completed runs inside 180 days; permit older history only as an explicit, separate fallback. Matching rules and numeric use remain held. |
| 6 | Cold start | `HOLD` | No ruling yet on confidence ceiling or rejection boundaries. |
| 7 | Assumptions/provenance | `HOLD` | No ruling yet on acceptance authority or overridable settings. |
| 8 | Forecast error | `HOLD` | Partial/failed lower-bound treatment is accepted; the complete error and summary method remains held. |
| 9 | Uncertainty disclosure | `HOLD` | Separate demand, uncertainty, and provenance are accepted; full disclosure requirements remain held. |
| 10 | Future calibration use | `HOLD` | No ruling yet on median adjustment or acceptance workflow. |

Gate B therefore remains **DRAFT / NOT APPROVED**. None of these rulings
authorizes Tranche 004.

## Compatibility with Gate A and PR #3

Decision 0002 and PR #3 establish a multi-bucket policy input. Forecasting must
therefore produce independent evidence for every caller-authoritative required
bucket `b`; it must not produce one global demand scalar.

PR #3 expects, for each required bucket:

- an explicit raw implementation-demand amount and unit;
- evaluator-owned Gate A normalization to basis points;
- one uncertainty state: `KNOWN`, `UNCERTAIN_BUT_BOUNDED`, or
  `UNKNOWN_OR_INVALID`; and
- no inference of required-bucket membership.

The recommended Gate B output can be made cleanly consumable by that boundary by
retaining all three forecast points while exposing a proposed raw demand point
and proposed uncertainty mapping per bucket. Those proposed mappings are
founder-controlled and are listed as decisions below; forecasting must not call
or bypass policy.

Two compatibility limits are material:

1. T003 accepts policy demand only within one bucket cycle (`0..10,000 bp` after
   normalization). Gate B must preserve an authoritative raw forecast above one
   cycle without clamping. A future bridge must not misrepresent that value as a
   valid one-cycle T003 input; the evaluator/policy layer owns its interpretation
   and consequences.
2. Current T002 actual-consumption records identify category, amount, unit, and
   source, but not a Gate A bucket/provider/window/reset-cycle identity. They
   cannot automatically become multi-bucket comparable observations without a
   later reviewed linkage contract. No migration is proposed here.

## Terms used in this proposal

### Required bucket

One explicit capacity constraint supplied with authoritative actor provenance.
The forecast treats bucket membership as input evidence. It never discovers the
set.

### Bucket family

The provider/source and capacity-window identity used to determine whether
historical evidence concerns the same kind of constraint. A particular reset
cycle remains part of observation provenance but is not itself the historical
cohort, because every cycle may have a different identity.

### Work component

One explicit, coherent part of the bounded scope that can receive its own manual
three-point estimate. Decomposition is caller-authored; forecasting must not
invent missing work or a narrower scope.

### Three-point estimate

For component `j` and bucket `b`:

- `L[j,b]`: optimistic plausible implementation demand under stated favorable
  assumptions;
- `E[j,b]`: the planning point the caller considers most representative; and
- `H[j,b]`: conservative plausible implementation demand under stated risks.

The points are planning evidence, not probabilities, guarantees, contractual
minimums, or maximum possible consumption.

### Comparable run

A historical run that passes the approved identity, method/version, task-shape,
outcome, unit, recency, completeness, and amendment-quality rules. Similarity is
never inferred from free text or AI output in V1.

### Accepted history adjustment

A deterministic reference-class factor calculated from qualified observations,
shown with its full cohort, and explicitly accepted by an authoritative actor
for a new forecast. Acceptance creates new forecast evidence; it does not mutate
history or a prior forecast.

## Decision 1 — Initial forecasting method

### Option A — Fixed rule table

Map task taxonomy values such as complexity and novelty to configured capacity
ranges.

**Advantages:** fast input, highly repeatable, easy to test.

**Tradeoffs:** initial weights would be weakly evidenced; a small taxonomy can
hide important scope differences; fixed values can create false authority.

### Option B — Manual three-point estimate only

Require the caller to enter low/expected/high demand for the intact scope or its
components.

**Advantages:** works immediately, exposes judgment, makes no unsupported claim.

**Tradeoffs:** more user effort; consistency depends on user discipline; history
cannot improve the output unless a separate procedure is added.

### Option C — Manual decomposition plus transparent reference class

Use manual component-level three-point estimates for every forecast. When
qualified history exists, calculate an explicit median adjustment suggestion and
apply it only after authoritative acceptance.

**Advantages:** useful at cold start, deterministic, auditable, and capable of
improving later inputs without opaque ML.

**Tradeoffs:** needs careful comparability and provenance rules; manual entry
remains meaningful work; accepted factors can still be poor if the cohort is
weak.

### Recommended V1 choice

**Option C.** Do not use unreviewed taxonomy weights to manufacture base demand.
Taxonomy characterizes evidence and comparability; the initial numeric anchor is
manual.

### Assumptions

- A bounded scope can be decomposed into components without the engine inventing
  product scope.
- A user can give bucket-specific planning estimates or explicitly state that
  the evidence is insufficient.

### Founder approval required

- Accept manual three-point decomposition as the numeric cold-start authority?
- Permit a history-derived factor only after explicit actor acceptance?
- Should V1 support an undecomposed single-component scope as a valid manual
  fallback?

## Decision 2 — Low / expected / high range semantics

### Option A — Minimum / most likely / maximum

Treat low and high as hard bounds.

**Tradeoff:** simple language, but forecasts cannot honestly prove absolute
minimums or maxima. This invites guarantee interpretation.

### Option B — Percentile-like points

Define low/expected/high as values such as P20/P50/P80.

**Tradeoff:** statistically familiar, but unjustified with sparse or zero
history and easy to mistake for calibrated probability.

### Option C — Plausible planning band

Define low and high through explicit favorable/adverse assumptions, with
expected as the central planning point. Do not assign probabilities.

**Tradeoff:** honest and cold-start friendly, but less statistically concise and
dependent on good assumption disclosure.

### Recommended V1 choice

**Option C**, with these proposed invariants per bucket:

- all points are nonnegative and use an explicit compatible unit;
- `L[b] <= E[b] <= H[b]`;
- points from different buckets are never summed, averaged, or compared;
- the original component inputs remain recoverable;
- low rounds outward/down, while expected and high round outward/up when whole
  policy-compatible units are needed; and
- range width is displayed, but not translated into a probability.

The founder has accepted that the range covers **implementation demand only**.
Correction and validation exposure remain distinct evidence for Gate A reserve
inputs and must not be silently added to `D[b]`. A later layer may forecast
broader lifecycle or operational costs without changing Gate B V1.

Gate B also preserves the authoritative raw range when any point exceeds one
normalized cycle. It never clamps `1.4` cycle-equivalents to `1.0` or chooses a
policy consequence.

### Founder ruling recorded

- **Accepted:** Gate B forecasts implementation demand only.
- **Accepted:** authoritative raw values above one cycle remain unchanged.

### Remaining founder approval required

- Accept plausible-band rather than percentile semantics?
- Approve the directional rounding proposal?
- Approve the exact typed representation for a raw value above one cycle at the
  future Gate B-to-policy bridge, without changing or clamping it?

## Decision 3 — Confidence semantics

### Option A — Numeric probability

Return a percentage such as 70% confidence.

**Tradeoff:** compact but unsupported before calibration and ambiguous about
what event the probability describes.

### Option B — Three evidence-quality levels

Use `LOW`, `MEDIUM`, and `HIGH`, determined by explicit completeness, unknown,
and comparable-history rules.

**Tradeoff:** understandable and testable, but thresholds still require founder
approval and do not express every nuance.

### Option C — Evidence profile only

Return factors without one headline label.

**Tradeoff:** avoids oversimplification but is harder to consume in Gate A and
harder to scan in the UI.

### Recommended V1 choice

**Option B**, always accompanied by its evidence profile:

- `HIGH`: complete manual characterization, no material unbounded unknown, and
  at least the approved minimum qualified completed history with acceptable
  coverage/dispersion evidence;
- `MEDIUM`: complete manual characterization with bounded unknowns; zero history
  is allowed, so cold start normally begins here;
- `LOW`: an evaluable range exists but material evidence limitations remain; and
- missing required numeric evidence returns a typed forecast rejection rather
  than a fabricated confidence.

Confidence does not mean probability of completion, probability that actual is
inside the range, correctness, affordability, or authorization.

### Founder-accepted Gate A bridge boundary

For every bucket, Gate B must preserve and expose separately:

- authoritative raw `EXPECTED` as the candidate `D[b]`;
- confidence and uncertainty evidence without changing `EXPECTED`; and
- authoritative required-bucket provenance.

Gate A/T003 remains authoritative for normalization and for the effect of
uncertainty on policy evaluation. Gate B must not pre-apply Gate A's uncertainty
margin, inflate demand because confidence is lower, or turn confidence into a
policy decision.

The exact translation, if any, from Gate B `HIGH | MEDIUM | LOW` confidence to
Gate A `KNOWN | UNCERTAIN_BUT_BOUNDED | UNKNOWN_OR_INVALID` remains held. The
bridge may retain both fields until that translation is approved.

### Founder approval required

- Accept the three labels and their exact evidence thresholds, including whether
  five recent qualified completed runs are sufficient for possible `HIGH`?
- Approve a translation from confidence to Gate A uncertainty, or require the
  caller to supply policy uncertainty separately?

### Founder ruling recorded

- **Accepted with clarification:** unmodified `EXPECTED` is the candidate
  `D[b]`; demand and uncertainty remain separate; Gate A owns uncertainty's
  policy effect.

## Decision 4 — Task inputs

### Option A — Brief only

Forecast directly from a title and description.

**Tradeoff:** easy, but opaque and incompatible with deterministic manual-first
forecasting.

### Option B — Small categorical taxonomy

Require complexity, risk, dependencies, and validation burden.

**Tradeoff:** fast and comparable, but insufficient as the sole numeric basis.

### Option C — Structured components, categories, and manual ranges

Require an intact scope identity, explicit components, per-bucket three-point
inputs, and a compact evidence taxonomy.

**Tradeoff:** most transparent and useful, but has the highest input burden.

### Recommended V1 choice

**Option C**, with these proposed input families:

- scope/tranche identity and actor provenance;
- authoritative required-bucket set and bucket-family identity;
- component identity, title, description, and explicit exclusions;
- per-component/per-bucket raw `L/E/H` amount and unit;
- complexity: `LOW | MEDIUM | HIGH | UNKNOWN`;
- novelty: `FAMILIAR | PARTLY_FAMILIAR | NEW | UNKNOWN`;
- context readiness: `COMPLETE | PARTIAL | MISSING`;
- dependencies as explicit records with `KNOWN | UNCERTAIN | BLOCKED` status;
- validation burden: `LIGHT | STANDARD | HEAVY | UNKNOWN`;
- correction exposure: `LOW | MEDIUM | HIGH | UNKNOWN`;
- assumptions, unknowns, and exclusions; and
- source `MANUAL` or separately reviewed `AI_PROPOSED`, with manual review and
  acceptance required before authority.

The taxonomy does not automatically apply numeric weights in V1. It supports
confidence, comparison, explanation, and later reviewed configuration.

### Founder approval required

- Approve the proposed taxonomy values and which fields are required?
- Confirm that AI may only propose, never establish authoritative inputs?
- Decide whether one undecomposed component is sufficient for the quick/manual
  path.

## Decision 5 — Historical calibration and comparable-run rules

### Option A — Any same-project run

**Tradeoff:** maximizes data but mixes incompatible buckets, methods, scope
shapes, and evidence quality.

### Option B — Exact-match cohort

Require exact equality across every category.

**Tradeoff:** highly defensible but may yield almost no history.

### Option C — Versioned eligibility plus explicit similarity keys

Require hard compatibility on bucket family, units, method/configuration, and
data quality; use reviewed categorical keys for work-shape similarity.

**Tradeoff:** balanced and auditable, but founder must approve which keys are
hard filters.

### Recommended V1 choice

**Option C.** Preferred-history eligibility requires all of:

- same provider/manual-source and capacity-window family;
- compatible raw unit or an approved exact conversion;
- same forecast-method major version and compatible configuration cohort;
- `COMPLETED` outcome for the intact forecasted scope;
- final, bucket-linked `IMPLEMENTATION` actual consumption;
- no unresolved amendment or data-quality conflict;
- no deferred work that belonged to the forecasted intact scope;
- completion inside the preceding 180 days; and
- approved matching task-shape keys.

Use a median, retain every included/excluded run and reason, and do not
statistically delete outliers in V1. Data-invalid or incompatible observations
may be excluded; surprising valid observations remain.

The founder changed the history-window rule as follows:

1. The preferred set requires at least five qualified comparable completed runs
   inside the preceding 180 days.
2. If it contains fewer than five, older qualified comparable completed runs
   may be shown as fallback evidence.
3. The fallback set remains separate from the preferred set. It must be labeled
   `OLDER_HISTORY_FALLBACK`, retain each observation's age and provenance, and
   state that the preferred recent-history threshold was not met.
4. Older observations are never silently mixed into the preferred set.
5. Whether fallback evidence may produce a numeric factor, or only disclosure
   and confidence evidence, remains held for founder approval.

### Founder approval required

- Which taxonomy fields are mandatory exact matches?
- May the older fallback set produce a numeric suggestion, or is it disclosure
  and confidence evidence only?
- May cross-project evidence be comparable when the actor, repository, and
  privacy boundary permit it, or must V1 remain within one project?

### Founder ruling recorded

- **Changed:** prefer at least five comparable completed runs inside 180 days;
  when fewer exist, permit older qualified completed history only as explicit,
  provenance-preserving fallback evidence that is not mixed into the preferred
  set.

## Decision 6 — Cold-start / insufficient-history behavior

### Option A — Fixed default ranges

**Tradeoff:** quickest experience, but initial constants would look more
authoritative than the evidence permits.

### Option B — Refuse forecasts without history

**Tradeoff:** defensible but defeats the MVP requirement to be useful at zero
history.

### Option C — Manual range with confidence ceiling

Use manual decomposition, disclose no-history status, apply no history factor,
and cap confidence at `MEDIUM`.

**Tradeoff:** useful and honest, but requires user judgment and does not promise
calibration.

### Recommended V1 choice

**Option C.** If manual numeric inputs are complete and unknowns are bounded,
produce the range with `MEDIUM` confidence and `historyCount = 0`. If a valid
range exists but a material unknown is unbounded, retain the evaluation with
`LOW` confidence so the proposed Gate A bridge can fail closed. If required
numeric or structural evidence is missing or invalid, return a typed
non-authorizing forecast rejection; do not fill a hidden default.

An optional future quick-start preset may be versioned, displayed, and manually
accepted, but no numeric preset is recommended without founder approval.

### Founder approval required

- Accept `MEDIUM` as the maximum cold-start confidence?
- Require three-point manual input, or approve explicit default widening factors?
- Which missing fields cause `LOW` versus typed rejection?

## Decision 7 — Configurable assumptions and provenance

### Option A — Hard-coded defaults

**Tradeoff:** simple but unauditable across versions and difficult to correct.

### Option B — Versioned global configuration only

**Tradeoff:** reproducible but too rigid for explicit project facts.

### Option C — Versioned configuration plus recorded authoritative overrides

**Tradeoff:** flexible and auditable, but requires clear override authority and
new-forecast semantics.

### Recommended V1 choice

**Option C.** Every assumption or adjustment should retain:

- stable key and semantic description;
- exact value, unit, or rational numerator/denominator;
- source kind: `FOUNDER_CONFIGURATION`, `MANUAL_EVIDENCE`, or
  `ACCEPTED_HISTORY_SUGGESTION`;
- source reference(s), actor/reference, and `recorded_at`;
- forecast method and configuration version;
- whether it was proposed or authoritatively accepted; and
- explanation/reason.

Overrides create a new forecast. They never mutate prior configuration,
forecasts, history, or outcomes.

### Founder approval required

- Who may accept an override: founder only, or the authoritative caller/user?
- Which configuration values are non-overridable?
- Must every history suggestion be manually accepted in V1?

## Decision 8 — Forecast-error calculation

### Option A — Expected-point absolute error only

**Tradeoff:** simple but hides direction and range performance.

### Option B — Signed, absolute, relative, and range-coverage evidence

**Tradeoff:** informative and transparent, but requires explicit zero-value,
unit, outcome, and aggregation rules.

### Option C — One aggregate accuracy score

**Tradeoff:** easy to market, but obscures buckets, evidence quality, and small
samples. It invites unsupported claims.

### Recommended V1 choice

**Option B**, independently per compatible bucket:

- signed error: `actualImplementation[b] - E[b]` (positive means
  under-forecast);
- absolute error: `abs(actualImplementation[b] - E[b])`;
- signed relative error: `(actualImplementation[b] - E[b]) / E[b]` only when
  `E[b] > 0`;
- absolute relative error: absolute value of the signed relative error;
- range position: `BELOW_LOW | WITHIN_RANGE | ABOVE_HIGH`; and
- exact source quantities, rational calculation evidence, rounding, method
  version, and outcome-quality status.

Never aggregate across distinct buckets. Across comparable runs, report the
cohort size and medians of signed and absolute relative error; retain the
individual observations. Do not publish an accuracy claim from this alone.

### Founder approval required

- Approve expected as the primary comparison point?
- Approve relative error as undefined when expected is zero?
- Approve medians, not means, for comparable cohort summaries?
- Approve the completed/partial/failed treatment below?

## Decision 9 — Uncertainty disclosure

### Option A — Confidence label only

**Tradeoff:** compact but insufficiently explainable.

### Option B — Free-text caveat

**Tradeoff:** flexible but inconsistent and difficult to test.

### Option C — Structured evidence plus concise plain language

**Tradeoff:** more fields, but auditable, testable, and understandable.

### Recommended V1 choice

**Option C.** Every forecast should expose:

- assumptions and their provenance;
- material unknowns and whether each is bounded;
- exclusions and deferred work;
- component contributions to each bucket range;
- history cohort size, included/excluded references, and limitations;
- accepted history factor, if any;
- range width and rounding evidence;
- confidence reasons and ceiling; and
- the exact statement: “Planning range, not a guarantee or authorization.”

Do not display probability, expected savings, productivity, or accuracy claims
without separately sufficient evidence.

### Founder approval required

- Approve required disclosure fields and language?
- Should a material unknown always cap confidence at `LOW`, or only when it is
  unbounded?
- Which disclosures must be shown to a user versus retained only as audit data?

## Decision 10 — Future calibration use

### Option A — Display history only

**Tradeoff:** safest but does not directly improve numeric inputs.

### Option B — Automatic online adjustment

**Tradeoff:** convenient but becomes opaque quickly and is inappropriate for
small cohorts.

### Option C — Deterministic suggestion with explicit acceptance

Calculate a visible reference-class factor from qualified observations, show
the cohort and exact procedure, and require acceptance before applying it.

**Tradeoff:** improves future planning without opaque ML, but adds a review step
and depends on honest comparability.

### Recommended V1 choice

**Option C.** For a qualified bucket cohort with observations `k`:

`ratio[k,b] = actualImplementation[k,b] / expectedForecast[k,b]`

when the expected value is positive. The suggested factor is the median ratio.
Once accepted, apply the same nonnegative factor to low, expected, and high for
that bucket and round outward. Retain the unadjusted range, factor, adjusted
range, cohort, actor, and acceptance time.

No silent background update, cross-bucket factor, model training, or mutation of
prior evidence is allowed.

### Founder approval required

- Approve median actual/expected ratio as the V1 suggestion?
- Approve explicit acceptance rather than automatic application?
- Should factors be calculated at whole-scope bucket level, component class, or
  both?
- Is an extreme factor held for founder review, and if so at what versioned
  boundary?

## Plain proposed procedure

For every forecast request:

1. Validate the explicit required-bucket set, scope identity, actor provenance,
   configuration version, components, raw amounts, units, and monotonic ranges.
2. Reject rather than invent any missing required bucket estimate or unsupported
   conversion.
3. For each bucket independently, sum component lows, expecteds, and highs using
   exact decimal/rational arithmetic.
4. Select preferred qualified history using only approved deterministic filters:
   at least five comparable completed runs inside the preceding 180 days.
5. If the preferred threshold is not met, keep any older qualified fallback set
   separate, preserve age/provenance, and disclose the shortfall. Do not silently
   mix it into the preferred set or infer authority for numeric adjustment.
6. Calculate or apply a median actual/expected suggestion only if the founder
   later approves its source-set and acceptance rules.
7. Multiply all three bucket points by the same accepted bucket factor. Round
   low down and expected/high up when producing whole policy-compatible values.
8. Determine confidence from the approved evidence rules; never infer a
   probability.
9. Return every bucket range, confidence, components, assumptions, unknowns,
   history cohort, exclusions, exact calculations, and versions in stable order.
10. Optionally expose the founder-approved policy-demand and uncertainty
    candidates. Do not invoke policy or authorize work.

## Worked example — cold start

Assume the caller authoritatively supplies two required buckets and two work
components. All values below are manual implementation-demand estimates in
basis points of their identified bucket cycles.

| Bucket | Component | Low | Expected | High |
| --- | --- | ---: | ---: | ---: |
| 5-hour | application change | 600 | 900 | 1,400 |
| 5-hour | integration support | 300 | 500 | 900 |
| weekly | application change | 120 | 200 | 350 |
| weekly | integration support | 80 | 120 | 250 |

With no qualified history:

| Bucket | Low | Expected | High | History factor | Confidence |
| --- | ---: | ---: | ---: | ---: | --- |
| 5-hour | 900 | 1,400 | 2,300 | 1 | `MEDIUM` proposed |
| weekly | 200 | 320 | 600 | 1 | `MEDIUM` proposed |

The buckets remain independent. The values are not added to a global `1,720 bp`
expected demand.

Under the founder-accepted bridge boundary, raw candidate `D[b]` is the unchanged
expected point: `1,400 bp` for the 5-hour bucket and `320 bp` for the weekly
bucket. Confidence/uncertainty evidence travels separately. Gate A independently
normalizes and determines any uncertainty effect; Gate B does not pre-apply Gate
A's `5/4` margin.

## Worked example — history informed

Suppose five qualified completed 5-hour observations have exact
actual-to-expected ratios:

`11/10, 19/20, 6/5, 21/20, 23/20`

Sorted, these are `19/20, 21/20, 11/10, 23/20, 6/5`; the median is `11/10`.
The engine proposes factor `11/10 = 1.10` and identifies all five runs. An
authoritative actor accepts it for the new 5-hour forecast.

Applying it to the cold-start totals:

- low: `floor(900 * 11/10) = 990`;
- expected: `ceil(1,400 * 11/10) = 1,540`; and
- high: `ceil(2,300 * 11/10) = 2,530`.

If the weekly bucket lacks its own qualified cohort, its factor remains `1` and
its range remains `200 / 320 / 600`. The 5-hour history never adjusts weekly
capacity.

Whether the 5-hour confidence becomes `HIGH` still depends on the founder-
approved completeness, coverage, and adverse-evidence rules; five runs alone do
not silently guarantee elevation.

If only three qualified completed runs occurred inside 180 days, they form the
preferred-but-insufficient set. Older qualified runs may be presented in a
separate `OLDER_HISTORY_FALLBACK` set with their ages and provenance. They do
not silently become part of the five-run recent set, and no numeric use is
authorized until the founder resolves that held question.

## Partial and failed run treatment

### Option A — Treat consumed-to-date as the actual point

This understates completion demand when scope remains unfinished.

### Option B — Scale consumption by a reported percent complete

This creates fragile precision and depends on a new percent-complete semantic.

### Option C — Retain as lower-bound/adverse evidence

Do not use the value as a completed-scope point ratio. Record consumption to
date, outcome, validation, failures, and deferred work. Use it in disclosure and
confidence under an approved rule.

### Recommended V1 choice

**Option C.** The automatic quantitative meaning is limited to the historical
run itself:

- retain each observation independently by bucket, compatible raw unit,
  consumed amount, observation time, outcome, failure/defer evidence, and
  provenance;
- for that intact run, completed demand is known to be greater than or equal to
  the maximum compatible consumed-to-date observation; do not sum repeated
  snapshots of the same consumption;
- exclude the record from completed-run ratios, medians, error summaries, and
  preferred/fallback completed-run counts; and
- do not automatically transfer the lower bound to a different future scope or
  raise that scope's `L/E/H`. Such use requires separately accepted,
  actor-provenanced applicability evidence and an approved rule.

Examples:

- A `PARTIAL` run consumes `800 bp` against expected `1,400 bp`. `800 bp` is a
  lower bound for the intact scope, not a `-600 bp` forecast success.
- A `FAILED` run consumes `900 bp` before failure. It is adverse evidence and a
  lower bound, not a completed-scope point error.
- A `COMPLETED` run consumes `1,600 bp` against expected `1,400 bp`. Signed error
  is `+200 bp`, absolute error is `200 bp`, and exact relative error is `1/7`.
  If the original range was `900..2,300`, range position is `WITHIN_RANGE`.

Founder must still decide whether and when partial/failed evidence lowers a
future forecast's confidence, whether an explicitly accepted lower bound may
raise a future range, and whether a later completed remainder may be linked into
one intact-scope observation.

## Confidence examples

- **Cold start, complete manual evidence:** no history, all components and
  buckets estimated, bounded unknowns -> recommended `MEDIUM` ceiling.
- **History supported:** at least five qualified completed observations, complete
  current inputs, accepted factor, and approved coverage quality -> potentially
  `HIGH`, subject to founder approval of the exact rule.
- **Material limitation:** estimates exist but a major dependency or context gap
  remains -> recommended `LOW`; retain the uncertainty evidence separately for
  Gate A/caller policy interpretation.
- **Missing bucket estimate:** no forecast is fabricated; return typed rejection.

## Edge and boundary cases

| Case | Recommended V1 treatment | Founder decision still needed |
| --- | --- | --- |
| `L = E = H = 0` | Valid only for an explicitly zero-demand component; retain explanation. | Whether a whole-scope zero forecast is allowed. |
| `L > E` or `E > H` | Typed rejection; never reorder silently. | Stable rejection vocabulary. |
| Negative/non-finite amount | Typed rejection. | Exact decimal representation contract. |
| Mixed units inside one bucket | Reject unless an approved exact conversion exists. | Whether to require one unit per bucket in V1. |
| Same numeric value in different buckets | Retain separately; never substitute. | None; controlled by Gate A. |
| Expected value `0`, actual positive | Signed/absolute error valid; relative error undefined. | Approve undefined-relative representation. |
| Expected/high exceeds one cycle | Preserve the authoritative raw value unchanged; mark that it exceeds the one-cycle T003 boundary; leave interpretation and consequences to evaluator policy. | Exact bridge representation remains held. |
| No completed history | Factor `1`; confidence ceiling `MEDIUM`. | Approve ceiling and manual input minimum. |
| Fewer than five comparable completed runs inside 180 days | Keep the recent set explicit; show older qualified history only as a separate, age-provenanced fallback set. | Whether fallback may produce a numeric suggestion. |
| Valid extreme historical run | Retain; median limits influence; no silent outlier deletion. | Any founder-review hold boundary. |
| Partial/failed run | Lower-bound/adverse evidence, not point calibration. | Confidence effect. |
| Amended outcome | Use only the current accepted observation while retaining the amendment chain. | Exact T006 linkage semantics. |
| Unsupported provider/unit | Typed rejection; no heuristic conversion. | Later adapter decision. |
| AI-proposed characterization | Non-authoritative until explicitly reviewed and accepted. | Review/acceptance actor. |

## Explicit unknowns requiring founder approval

The recommendation is not implementation-ready until the founder resolves at
least these questions:

1. Do the proposed plausible-band meanings and directional rounding rules apply?
2. What exact confidence taxonomy applies, and does it translate to Gate A
   uncertainty or travel as separate evidence for caller interpretation?
3. Is `MEDIUM` the cold-start ceiling, and what evidence permits `HIGH`?
4. Which task taxonomy keys and comparable-run filters are required?
5. May the explicit older-history fallback produce a numeric suggestion, and
   what confidence effect does its age have?
6. Must history suggestions be explicitly accepted, and by whom?
7. How does partial/failed lower-bound evidence affect a future forecast's range
   or confidence without entering completed-run statistics?
8. What exact typed bridge representation preserves over-one-cycle raw demand
   before policy interpretation?
9. What future contract links T002/T006 actual consumption to Gate A bucket
   identity without rewriting existing evidence?
10. Which configuration values and manual overrides are allowed, and which are
    non-overridable?

No answer is inferred by this document. The draft decision record presents each
item for individual founder disposition.
