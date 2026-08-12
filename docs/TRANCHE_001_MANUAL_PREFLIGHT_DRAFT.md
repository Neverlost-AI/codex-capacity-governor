# Tranche 001: Manual Preflight Draft

## Assignment status

- **Status:** Founder-approved for collaborator assignment
- **Type:** Bounded vertical slice
- **Recommended branch:** `feature/tranche-001-manual-preflight-draft`
- **Pull-request target:** `main`
- **Product owner and acceptance owner:** Founder

This document is the complete implementation boundary for Tranche 001. Read `README.md`, `AGENTS.md`, `docs/ARCHITECTURE_CONTEXT.md`, and `docs/DEVELOPMENT_WORKFLOW.md` before starting.

## Objective

Bootstrap the proposed pnpm/Next.js development stack and implement the smallest complete manual-data path through the established architecture:

> Create a project → create and save its manual preflight draft → reopen the saved project and draft.

This tranche establishes the application, persistence, validation, testing, and collaborator-review patterns that later work will follow. It does not implement forecasting or resource-governance policy.

## User-visible completion condition

From a clean local checkout, a user can:

1. start the documented application and local PostgreSQL database;
2. create a project;
3. enter a bounded tranche description and the manual preflight fields represented by the existing draft contracts;
4. receive accessible, understandable feedback for invalid input or a failed save;
5. save the project and its associated preflight draft;
6. leave the editing view or restart the application; and
7. reopen the same persisted project and preflight draft with the saved values intact.

The UI must not display or imply a forecast, operating mode, policy decision, affordability result, or reserve calculation.

## Technical scope

### Workspace and application bootstrap

- Initialize a pnpm workspace with a committed lockfile.
- Bootstrap a conventional Next.js/React/TypeScript application in `apps/web`.
- Configure the minimum required lint, formatting, typecheck, unit/integration test, build, and Playwright tooling.
- Select stable dependency versions and document the required Node.js and pnpm versions.
- Keep the local setup understandable to another web/AI developer; avoid speculative infrastructure or framework wrappers.

### Contracts and runtime validation

- Use the vocabulary in `packages/contracts/src/index.ts` as the starting contract rather than redesigning the product.
- Add reviewed runtime schemas where data crosses a form, server, application, or persistence boundary.
- Keep compile-time types and runtime schemas aligned from one clear source of truth.
- Validate manual capacity amount/unit, reset timing/timezone, tranche content, reserve preferences when supplied, and project/preflight identifiers.
- Reject invalid numeric values, malformed dates, invalid shares, and empty required text consistently at both the server boundary and the relevant user interface.
- If an existing draft contract is technically inconsistent or cannot be validated without deciding new product semantics, document the issue and stop that part of the work for founder review.

### Application boundary

- Implement only the use cases needed to create a project, save its manual preflight draft, and reopen both.
- Define repository ports at the application boundary. Application and contract code must not import Next.js, React, Drizzle, PostgreSQL drivers, or browser APIs.
- Make the association between a `PreflightDraft` and its `Project` explicit and test it.
- Keep orchestration free of forecast, policy, AI-analysis, and platform-adapter behavior.

### Persistence

- Persist only `Project` and `PreflightDraft` records.
- Use PostgreSQL and Drizzle ORM with reviewable, committed migrations.
- Implement Drizzle/PostgreSQL behind the application repository ports.
- Preserve the manual values needed to recreate the draft faithfully; do not normalize them through an invented policy or platform rule.
- Add only the identifiers, timestamps, indexes, and integrity constraints required for this bounded create/save/reopen flow.
- Do not create placeholder tables for future domain records.

### User interface and errors

- Provide a focused project-creation and manual-preflight-draft workflow.
- Use explicit labels, logical heading order, keyboard-operable controls, associated field errors, and an understandable error summary or focus strategy after failed submission.
- Distinguish validation failures, not-found states, and recoverable persistence/server failures in plain language.
- Preserve entered values after a recoverable validation or save failure where practical.
- Do not introduce a broad design system or unrelated product navigation.

## Allowed architectural surfaces

The tranche may change only the surfaces needed for its accepted vertical slice:

- root workspace manifests, lockfile, and focused development/test configuration;
- `apps/web/**` for Next.js UI, routes, and infrastructure composition;
- `packages/contracts/**` for aligned runtime schemas, draft contract refinements, package configuration, and tests;
- `packages/application/**` for use cases and persistence ports;
- one narrowly scoped PostgreSQL/Drizzle adapter location outside the core packages;
- database migrations for `Project` and `PreflightDraft` only;
- local development/test support such as an example environment file or a PostgreSQL container configuration;
- documentation directly required to install, run, migrate, test, and review this tranche;
- a concise architecture decision record only if a durable technical choice cannot be explained adequately in the pull request.

The collaborator may propose a small change within these surfaces when it improves dependency direction or testability. Explain it in the pull request; do not use the proposal as permission to redesign adjacent packages.

## Prohibited surfaces and semantics

Do not implement, simulate, stub with invented behavior, or redefine:

- forecasting formulas;
- forecast confidence scoring;
- Governor policy thresholds;
- `PROCEED`, `NARROW`, `DEFER`, or `STOP / PRESERVE` decision logic;
- correction-reserve calculations;
- validation-reserve calculations;
- reset/defer semantics;
- AI analysis;
- OpenAI or Codex account integration;
- automatic Codex balance retrieval;
- Claude Code or another coding-agent integration;
- authentication beyond what is strictly necessary for the bounded local prototype;
- billing or production deployment;
- new product semantics or unsupported product/evidence claims;
- changes to the founder-controlled policy architecture.

Do not add or implement `Forecast`, `GovernedExecutionPlan`, `ExecutionOutcome`, `CalibrationObservation`, task-assessment persistence, policy configuration, or platform-capacity normalization. Existing draft types may remain in the contracts package, but this tranche must not execute or persist those concepts.

## Required tests and checks

The pull request must include and pass:

1. **Schema/unit tests** covering valid input and representative invalid input, including numeric, date/timezone, required-text, and optional-reserve cases actually supported by the form.
2. **Application tests** using fakes or in-memory test doubles for project creation, draft save, project/draft association, reopen behavior, not found, and repository failure behavior.
3. **Persistence integration tests** against PostgreSQL proving the migrations apply and `Project` plus `PreflightDraft` round-trip through the adapter with their relationship intact.
4. **UI tests** for accessible labels, validation messages, retained input after recoverable failure where implemented, and understandable not-found/server-error states.
5. **One Playwright end-to-end test** proving project create → preflight save → leave/reopen → saved values visible.
6. **Repository checks** for formatting, lint, TypeScript, all tests, production build, and migration consistency.

Tests must exercise public boundaries and observable behavior. Do not weaken validation, replace meaningful tests with snapshots, or mock the end-to-end persistence path merely to make checks pass.

## Acceptance criteria

Tranche 001 is acceptable only when all of the following are true:

1. A developer can follow the documentation from a clean checkout to install dependencies, start PostgreSQL, apply migrations, and run the application.
2. A user can create and persist a project without entering unrelated future-product data.
3. A user can create, save, leave, and reopen a manual preflight draft associated with that project.
4. Only `Project` and `PreflightDraft` are persisted; migrations contain no speculative future tables.
5. Invalid input is rejected at runtime boundaries and communicated accessibly in the UI.
6. Persistence is implemented behind repository/application boundaries; core packages do not depend on Drizzle, PostgreSQL, Next.js, or React.
7. Manual values round-trip without policy-driven transformation or invented normalization.
8. No forecast, confidence, allocation, operating mode, policy decision, or affordability output is produced or implied.
9. The required unit, application, integration, UI, and Playwright tests pass.
10. Formatting, lint, typecheck, production build, and migration checks pass.
11. The pull request documents assumptions, open questions, exclusions, migrations, test evidence, and intentionally deferred work.
12. The diff remains within this assignment or explicitly identifies a blocker instead of expanding scope.

## Expected documentation

Update repository documentation only as needed to provide:

- prerequisites and pinned Node.js/pnpm expectations;
- clean-checkout installation and local startup commands;
- PostgreSQL setup, environment-variable names, migration commands, and reset/test-database instructions;
- an `.env.example` or equivalent containing placeholders only—never secrets;
- commands for format, lint, typecheck, unit/integration tests, Playwright, and production build;
- a short description of the application/repository/adapter dependency direction;
- any assumptions or unresolved questions discovered during implementation.

Do not rewrite the product definition or architecture documents to fit an implementation preference.

## Branch and pull-request expectations

- Create `feature/tranche-001-manual-preflight-draft` from the accepted `main` baseline.
- Do not commit directly to `main`.
- Keep commits focused and reviewable; exclude unrelated formatting or refactors.
- Open one pull request targeting `main` when the tranche is ready for founder review.
- The pull request must include:
  - a concise implementation summary and rationale;
  - an acceptance-criteria checklist;
  - exact validation commands and results;
  - screenshots of the primary flow and meaningful error states;
  - migration and rollback notes;
  - assumptions and open questions;
  - the exact work intentionally left unbuilt;
  - known limitations and recommended follow-up work, without implementing it.

Review results are `accept`, `revise`, `hold`, or `stop`. No next tranche begins until the founder records that decision.

## Handoff requirements

At review handoff, provide:

- the branch name, final commit SHA, and pull-request link;
- a clean `git status` and confirmation that no secrets or local artifacts are included;
- a file/migration summary sufficient for a reviewer to navigate the change;
- clean-checkout setup steps verified by the collaborator;
- test and build evidence, including the Playwright path;
- screenshots or a short recording of create → save → reopen and relevant error handling;
- blockers, compromises, assumptions, and any founder decision requested;
- confirmation that every prohibited feature remains unimplemented.

## Explicit stop conditions

Stop the affected work, preserve the branch in a reviewable state, and document the blocker if:

- implementation requires choosing a forecast formula, confidence method, policy threshold, mode, decision rule, reserve calculation, or reset/defer rule;
- a field or validation rule cannot be defined without inventing budget or product semantics;
- the tranche appears to require persistence beyond `Project` and `PreflightDraft`;
- the architecture would require core packages to depend on UI, ORM, database, or provider code;
- a private credential, authentication cookie, undocumented API, or automatic Codex balance source appears necessary;
- meaningful authentication, billing, deployment, AI analysis, or another platform integration becomes necessary;
- a new dependency or infrastructure component materially expands the approved stack or operational surface;
- a required test cannot be made reliable without weakening the intended boundary;
- repository state contains unrelated changes that cannot be separated safely;
- completing the work would change founder-controlled policy architecture or product meaning.

Do not solve a stop condition by inventing a default. State the exact decision needed, the affected acceptance criterion, and the smallest options the founder can evaluate.

## Review rubric

The tranche will be used to evaluate:

- **Code quality:** clarity, maintainability, validation, error handling, and appropriate dependency choices.
- **Architecture adherence:** inward dependency direction and clean application/repository boundaries.
- **Communication:** useful documentation, clear assumptions, and precise review handoff.
- **Scope discipline:** no prohibited behavior, speculative tables, or adjacent redesign.
- **Independence:** sound execution inside the approved boundary and timely escalation only for genuine founder decisions.
- **Testing discipline:** meaningful tests at the correct layers and reproducible validation evidence.
- **Collaboration fit:** reviewable commits, responsiveness to feedback, and respect for product ownership.
