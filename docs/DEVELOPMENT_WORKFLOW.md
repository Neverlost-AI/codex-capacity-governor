# Development workflow

## Bounded tranche model

Every implementation assignment must be a coherent, reviewable tranche. Before work begins, write down:

- objective and user-visible or architectural outcome;
- files/modules expected to change;
- explicit exclusions;
- inputs and approved assumptions;
- acceptance criteria and required tests;
- dependencies and migration/rollback risk;
- founder decisions needed before implementation.

If new information expands the tranche materially, stop and propose a follow-up tranche. Do not silently absorb adjacent refactors, new integrations, or speculative infrastructure.

## Branch and pull-request flow

1. Confirm the tranche contract and acceptance criteria.
2. Create a short-lived branch such as `feature/manual-preflight-draft` or `fix/forecast-range-validation`.
3. Make focused commits that preserve a reviewable history.
4. Run the relevant type, lint, test, and build checks.
5. Open a pull request containing:
   - summary and rationale;
   - acceptance-criteria checklist;
   - tests run and results;
   - screenshots for user-visible changes;
   - assumptions and open questions;
   - intentionally deferred work;
   - migrations, operational impact, and rollback notes.
6. Founder and Codex review the diff against the tranche, product boundary, and tests.
7. Choose `accept`, `revise`, `hold`, or `stop`. Start the next tranche only after that decision.

Avoid mixing formatting churn or unrelated cleanup with functional changes. A pull request should be reversible without dismantling unrelated work.

## Assumptions and decisions

Local implementation assumptions belong in the pull request. Durable, cross-cutting choices belong in an architecture decision record under `docs/decisions/`.

Escalate instead of assuming when a choice changes:

- policy meaning or threshold behavior;
- budget units or normalization;
- correction or validation reserve guarantees;
- stored evidence or audit history;
- a shared contract;
- privacy, credentials, retention, or external data transfer;
- dependencies, hosting, or integration scope beyond the approved tranche.

## Test expectations

| Change | Minimum evidence |
| --- | --- |
| Pure policy/forecast logic | Deterministic unit tests for normal values, exact boundaries, invalid inputs, and conservative failure behavior. |
| Contract/schema change | Parsing/validation tests plus compatibility review for stored records and callers. |
| Persistence change | Repository integration tests and forward migration verification; rollback notes where reversal is unsafe. |
| API/application use case | Success, validation, authorization, and dependency-failure tests. |
| UI behavior | Component tests for meaningful states and accessibility queries. |
| Critical user journey | At least one Playwright path covering the tranche's successful flow and relevant failure state. |
| Bug fix | A regression test that fails before the fix when practical. |

Substantive work is not complete while required checks are failing. Never remove or weaken a test solely to obtain a green result.

## Recommended first collaborator tranche

The founder-approved assignment is [Tranche 001: Manual Preflight Draft](TRANCHE_001_MANUAL_PREFLIGHT_DRAFT.md). That document is the authoritative scope, acceptance, stop-condition, and handoff contract for the first collaborator.
