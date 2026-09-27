# Product Brief source reconciliation for T005

## Status and search boundary

F9 source precedence is founder-accepted, with the clarification that manual
T005 does not automatically remove broader features from the eventual MVP.
F1-F8 are accepted separately and are not reopened. No external PDF is copied into this
repository or treated as new implementation authority.

Read-only search located the configured Obsidian vault via its local vault-path
configuration, then searched Capacity Governor filenames/references in the vault
and relevant project material locations. No other repository was inspected.

- Vault: `C:\Users\35jsu\Downloads\Obsidian\Neverlost`.
- Capacity Governor folder:
  `Neverlost Systems\Products\Capacity Governor` under that vault.
- That folder contains Accepted Governance Profile v0.1 and T003 implementation
  and technical-review notes. No Product Brief was found there.
- Original and later Product Brief PDFs were found in Downloads as below.
- No standalone brief exists in the tracked Capacity Governor repository.
- The general home-directory listing was denied by the sandbox; locating the
  vault and PDFs through readable, specific paths was sufficient. This is not
  a claim to have exhaustively searched every drive or inaccessible folder.

## Source identity

| Source                       | Declared status/date                                                  | Location                                                                  | SHA-256                                                            |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Product Brief V0.1, 9 pages  | Concept approved for bounded prototype exploration; July 31, 2026     | `C:\Users\35jsu\Downloads\Codex Capacity Governor Product Brief.pdf`      | `7D5CEAC76BF3C3FE8892DD857F8111890A5EC98967A25DB734F2CCADFDA16E36` |
| Product Brief V0.2, 11 pages | Collaborator review / Galuxium Nexus V2 MVP planning; August 11, 2026 | `C:\Users\35jsu\Downloads\Codex_Capacity_Governor_Product_Brief_v0_2.pdf` | `294D8AD67FC0D113E09A095FF8B82DA258D7FE36127E02617967317043EF1935` |

All pages were text-extracted. Scope, example and architecture pages were also
rendered and visually inspected. V0.2 page 6 is blank, not an inferred missing
requirement. Version/date and status come from the PDFs themselves, not file
modification times. V0.2 does not state that it is the final accepted T005 scope.

## Confirmed common requirements

Both briefs support manual capacity input, capacity-aware planning, correction
and validation protection, explicit modes/decisions, retained outcomes and
learning from evidence. V0.2 foregrounds preflight with forecast ranges and
confidence, separation of AI characterization from deterministic policy, and
the full forecast-to-actual learning loop. Both reject private-account access,
credential/cookie collection and unsupported savings claims.

The tracked roadmap preserves the full loop. Accepted/merged T005 supplies the
composed manual preflight and immutable plan baseline; it is not the complete
first prototype. Proposed T006 supplies governed outcomes/comparison/factual
history; required T007 gathers formal internal evidence and local release
checks. A history-informed forecast loader may instead belong to the fuller
product, pending founder placement and method decisions. T008 is a separately
authorized hosted public demo/pilot, not a synonym for local prototype use.

## Differences and accepted source reconciliation

| Brief requirement/example                                                                                            | Reference                    | Relationship to accepted documents and T005                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic policy application, milestone monitoring, routine-failure handling, Codex skill/plugin and simulated feeds | V0.1 pp. 1-5, 8              | Broader original prototype vision. Current roadmap excludes automatic execution from T005 and treats integration as later work. The builder/reviewer skill is developer governance, not this product integration. No simulated/live feed is added.                                                            |
| Scalar percentage example with reserve_percent 10 and example mode/permissions                                       | V0.1 p. 6                    | Not controlling numeric policy. Decision 0002 later approves independent buckets, exact-whitelist units, 15% reserve floors and exact mode/decision rules. Do not implement the old example or infer a conversion.                                                                                            |
| Whole-project automatic decomposition and sequencing                                                                 | V0.2 p. 3                    | T005 accepts manual bounded work-item characterization through F1/F2. No automatic whole-project decomposition is authorized. Preserve the broader idea as unassigned product follow-up, not a new prerequisite.                                                                                              |
| Credit amounts, separate investigation allocation, selected-model/expected-output cost factors                       | V0.2 pp. 3-4, 9              | Historical illustrative model differs from Decisions 0002/0003. V1 uses independent bucket basis points, residual implementation and two protected reserves, accepted seven factor adders and 100 bp/work-point prior. Credits/model prices/investigation reserves require later approved mappings/semantics. |
| AI-assisted decomposition in the required user flow                                                                  | V0.2 pp. 7-8                 | F2 explicitly accepts manual-only T005 and defers AI. This is an intentional later founder scope ruling, not evidence that the brief required no AI. AI remains a visible optional future proposal.                                                                                                           |
| Model/context/parallelism/dependency optimization report                                                             | V0.2 pp. 4-5, 7              | F4 accepts existing deterministic explanations and neutral next steps only. Broader optimization heuristics remain unassigned; none is invented to satisfy the older vision.                                                                                                                                  |
| Full preflight-to-history loop, actual outcomes and project comparison                                               | V0.2 pp. 4-5, 7, 11          | The first local prototype needs governed outcomes and queryable history after T005. F7 deferred linkage/comparison/history loading from T005, but the newer milestone wording places history-informed future forecasts in the fuller product. Exact T006 loader placement is an open founder decision. T002 UNGUIDED history is preserved. |
| Project/repository/general allocations beyond one run                                                                | V0.2 p. 9                    | No portfolio allocation, general reserve or fungible global balance is implied by T005. Current buckets remain independent. Broader allocation requires later founder prioritization and semantics.                                                                                                           |
| Paste/upload brief, user/session state and future integration                                                        | V0.2 pp. 7-8                 | T001 text intake plus T005 manual characterization covers the bounded input path, not paste/upload of an MVP/tranche spec or human review of AI-assisted decomposition. Those fuller-product workflows need separate assignments. Minimal T005 local pairing is not hosted identity; runtime integration remains unassigned. |
| Public hackathon demonstration and later distribution/commercial tiers                                               | V0.2 pp. 7, 10-11; V0.1 p. 7 | Historical delivery/market context does not authorize hosting or billing. Current roadmap T008 owns separately approved external pilot preparation; commercial work remains excluded.                                                                                                                         |
| Forecast-error/effectiveness/accuracy improvement measures                                                           | V0.1 p. 7; V0.2 p. 10        | Evidence questions, not proven results. Decision 0003 controls bucket-specific comparison and no overall accuracy percentage. T006/T007/T008 provide later evidence, without unsupported claims.                                                                                                              |

These are material scope/model differences, but they do not justify reopening
accepted F1-F7 or accepted Gate A/B. The recommendation is to record their
precedence explicitly and retain the larger product goals in the roadmap.
If the founder instead wants a historical requirement in T005, that is a new
explicit assignment revision requiring review, not a builder default.

## Accepted authority for F9

1. Explicit latest founder rulings and accepted Decisions 0001-0003 control
   recording, policy and forecast semantics respectively. Any conflict among
   controlling records must be escalated rather than resolved silently.
2. The final founder-approved T005 assignment defines allowed implementation
   scope, acceptance tests and exclusions; F1-F9 are accepted. Implementation
   still requires a separate explicit grant.
3. Tracked README, architecture and roadmap explain the product, inward
   dependency direction and sequence; old readiness/status prose is not newer
   authority than accepted decisions and merge evidence.
4. V0.2 is retained historical product vision and V0.1 origin context. Neither
   is a blanket authorization, a conversion table or a reason to add scope.

The found briefs resolve the source gap. Their discovery does not automatically
adopt a PDF requirement into T005, and accepting T005 does not automatically
remove that requirement from the MVP. The following placement distinctions are
controlling for planning, not new implementation authority.

## Broader product placement — three distinct categories

| Category                                                                  | Features and current treatment                                                                                                                                                                                         | Founder authority still needed                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Deferred from T005; first-MVP membership and tranche placement unresolved | Optional AI characterization; whole-project decomposition/sequencing; model/context/parallelism guidance; paste/upload parsing; basic Governor-to-Codex runtime integration. These stay visible in the product vision. | Decide whether each belongs in the first MVP and assign a bounded tranche if included. None is removed by manual T005 acceptance. |
| First-prototype stages, not yet authorized                                | T006 governed outcomes, reviewed compatible actuals, per-bucket comparison and factual history; required T007 internal dogfooding/local release readiness.                                   | Approve T006 semantic/migration decisions and T007 protocol/checklist. Concern 001's pre-T006 gate effect and loader placement require founder ruling. |
| Fuller-product capabilities needing bounded assignments                   | History-informed future forecasts via approved Gate B/T004 pure capability plus a reviewed loader/method; paste/upload MVP/tranche spec; human-reviewed AI-assisted decomposition.             | Decide loader placement, concern 001/V2 method and cross-version evidence rules; scope intake and AI review separately. No implementation authority. |
| Separately gated hosted stage                                              | T008 external public demo/pilot.                                                                                                                                                                  | Approve hosted identity, privacy/retention, operations and participant protocol independently of local F8. |
| Proposed exclusion from the first MVP, pending founder decision           | Rich project/portfolio allocation and purchased-credit/model-price cost forecasting. Recommendation: defer these beyond the first MVP to avoid unapproved fungibility and provider-cost semantics.                     | ACCEPT/CHANGE/HOLD each proposed exclusion separately. This recommendation is not an accepted exclusion.                          |

Existing accepted post-MVP boundaries (billing, Claude Code, enterprise/team
features, automatic provider retrieval and ML calibration) remain unchanged;
they are not new exclusions inferred from F9. An improved future workflow adapter
is distinct from deciding whether a basic runtime integration belongs in the MVP.
The builder/reviewer agents are development governance, not either runtime adapter.

## Interpretation and calibration limits

T005 must label cold-start forecasts as uncalibrated planning estimates. MEDIUM
indicates known characterization, not measured predictive accuracy. Values are
capacity-window percentages, not purchased-credit cost estimates. The broader
briefs' improvement goals remain evidence questions rather than proven claims.

[Calibration concern 001](FORECAST_CALIBRATION_CONCERN_001.md) records possible
feedback drift from applying actual/originalExpected ratios to the cold-start
baseline when originalExpected was already adjusted. The
[T006 analysis](T006_CALIBRATION_AND_MILESTONES_DRAFT.md) proposes options but no
accepted method or Decision 0003 change. The founder must resolve the concern
and decide whether its existing pre-T006 gate blocks an outcome-only T006 or
only history loading. The proposed first-MVP exclusions above remain proposals,
not approved narrowing of the broader product.
