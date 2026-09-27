# Decision 0004: T005 manual local preflight boundary

## Status

FOUNDER-ACCEPTED SCOPE DECISIONS F1-F9. Implementation, PR #10 merge and
deployment are NOT authorized by this record. The finalized assignment still
requires exact-commit documentation review and a separate implementation grant.

## Context and controlling authority

Accepted Decisions 0001-0003 and T001-T004 remain controlling and byte-unchanged.
The founder retained F1-F7, accepted F8 as specified for a single-operator local
prototype, and accepted F9 source precedence with the clarification that a manual
T005 does not automatically remove broader features from the eventual MVP.

## Accepted choices

| Decision | Accepted T005 boundary                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1       | Existing manual characterization taxonomy, explicit repository reference and immutable revision scope identity; no silent conversion of legacy values.                                                                                                                               |
| F2       | Manual-first T005; AI characterization deferred from this tranche.                                                                                                                                                                                                                   |
| F3       | Confirm frozen inputs, then evaluate and persist; no browser-authored final result.                                                                                                                                                                                                  |
| F4       | Existing deterministic explanations and neutral guidance only.                                                                                                                                                                                                                       |
| F5       | Reopened results are historical; current guidance requires reviewed reevaluation.                                                                                                                                                                                                    |
| F6       | Immutable revision/attempt/plan evidence, including negative submitted evaluations, saved atomically.                                                                                                                                                                                |
| F7       | Cold-start preflight only; governed outcomes, compatible actuals, comparison and history loading follow in T006.                                                                                                                                                                     |
| F8       | Single-operator loopback access, local pairing session, exact-origin/CSRF guards and server-owned one-use confirmation evidence bound to the immutable input revision, digest and exact bucket set. Browser trust flags never establish authority.                                   |
| F9       | Latest founder rulings and accepted decisions control semantics; final accepted assignments bound implementation; tracked product/architecture/roadmap provide context; V0.2 brief is historical vision and V0.1 origin context. Broader MVP features are not automatically removed. |

The detailed accepted F8 access restrictions, trusted-local operating limits,
canonical digest, explicit attestations, transaction/retry behavior and required
tests are specified in the
[T005 assignment](../TRANCHE_005_COMPLETE_CAPACITY_PREFLIGHT.md).
It does not authenticate legal human identity or resolve general upstream/hosted
authentication. Server-issued provenance records what the admitted local session
explicitly confirmed; no actor string or browser boolean alone is sufficient.

## Consequences and limits

T005 is manual, local and cold-start: only the preflight portion of the complete
preflight → outcome → comparison loop. The UI must disclose uncalibrated planning
estimates, MEDIUM confidence as known characterization rather than demonstrated
prediction accuracy, and capacity-window percentages rather than purchased-credit
cost estimates.

[Source reconciliation](../PRODUCT_BRIEF_RECONCILIATION.md) and the
[roadmap](../MVP_ROADMAP.md) distinguish deferred-from-T005 features, later assigned
tranches and proposed first-MVP exclusions pending a separate founder decision.
Proposed exclusions are not accepted by this record.

[Calibration concern 001](../FORECAST_CALIBRATION_CONCERN_001.md) remains unresolved
before T006. No method/formula/configuration revision is selected here and Decision
0003 remains unchanged. The builder/reviewer development workflow is not a
Governor-to-Codex runtime integration.

## Next gate

Independent exact-commit review of these documentation changes, then founder
review and an explicit T005 implementation grant from an accepted main baseline.
No implementation branch, migration, runtime integration, T006 work or PR #10
merge is authorized now.
