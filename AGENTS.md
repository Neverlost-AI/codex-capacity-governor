# Repository guidance

## Scope

Work only inside this repository. Treat every assignment as a bounded tranche with explicit inputs, deliverables, exclusions, and acceptance criteria. Do not expand scope, add integrations, introduce dependencies, or refactor adjacent areas without documenting the need and obtaining approval.

Preserve these boundaries:

- AI-assisted classification is optional and separate from deterministic policy.
- Policy logic is pure, auditable, and independent of UI, persistence, and vendors.
- Manual capacity and analysis input remains supported.
- Codex-specific data is normalized behind an adapter; do not add Claude Code yet.
- Never use private credentials, cookies, undocumented endpoints, or unsupported product claims.

## Development workflow

Create a focused branch for each approved tranche and submit changes through a pull request. Keep commits reviewable. A pull request must state what changed, what was intentionally excluded, assumptions, open questions, tests run, and any migration or rollback concerns.

If an assumption would alter product policy, budget semantics, reserve behavior, evidence handling, or a public contract, stop and request founder approval. Record durable technical decisions in `docs/decisions/`.

## Quality bar

Substantive work requires tests at the lowest useful level. Policy and forecast logic require deterministic unit and boundary tests. Persistence changes require repository/integration tests and migration coverage. User-visible workflows require component tests and at least one critical-path browser test. Bug fixes require a regression test where practical.

Run the relevant type, lint, test, and build checks before requesting review. Do not weaken validation or delete failing tests merely to make a tranche pass.

See `docs/DEVELOPMENT_WORKFLOW.md` for the tranche and review process.
