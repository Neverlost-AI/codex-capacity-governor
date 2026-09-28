# Codex Capacity Governor

Codex Capacity Governor is a Codex-first resource-governance layer for AI-assisted software development. It evaluates a project or bounded development tranche before execution, forecasts likely capacity needs, protects correction and validation reserves, and recommends the safest operating policy for the available budget.

> Given the available Codex budget, reset timing, project state, task complexity, risk, and validation requirements, what is the safest and most efficient way to complete this work?

The Governor treats AI coding capacity as a finite development budget to plan before execution—not merely usage to measure afterward.

## Repository status

The application implements the accepted T001 manual draft, T002 factual
`UNGUIDED` run/outcome history, T005 manual, single-operator local, cold-start
composed preflight, and T006 governed outcomes, append-only amendments,
comparison and viewable history. T003 remains the pure deterministic
multi-bucket policy engine; T004 remains pure forecasting, policy-demand
projection, comparison helpers and supplied-history adjustment. T005 saves
immutable reviewed inputs and attempts, including negative results.

[T005](docs/TRANCHE_005_COMPLETE_CAPACITY_PREFLIGHT.md) was founder-accepted and
merged in PR #11. [T006](docs/TRANCHE_006_GOVERNED_OUTCOMES.md) was separately
founder-accepted and merged in PR #13. The resulting local loop is **not**
host-ready: the founder-directed next sequence proposes a separately approved
[private-hosted foundation](docs/TRANCHE_007_PRIVATE_HOSTED_FOUNDATION_DRAFT.md),
hosted verification, then three measured public builds under the
[T007 protocol](docs/TRANCHE_007_INTERNAL_TESTING_AND_LOCAL_RELEASE_DRAFT.md).
Neither hosting/provisioning nor measured execution is authorized by these drafts.
Future forecasts remain cold-start: the automatic history loader is deferred, and the
[calibration method concern](docs/FORECAST_CALIBRATION_CONCERN_001.md) remains
unresolved before that loader.
AI analysis, automatic capacity retrieval and Governor-to-Codex runtime
integration remain unimplemented; broader MVP placement is retained in the
[roadmap](docs/MVP_ROADMAP.md), not decided by accepting manual T005.

The accepted builder/reviewer workflow governs repository development only:
a builder authors changes, a separate reviewer checks an exact commit, and the
founder retains approval gates. It is not a runtime Codex integration and does
not execute Governor plans. Supported local startup uses T005's loopback-only
pairing, exact-origin and server-confirmation boundary; it is not hosted identity
and must not be exposed through a tunnel or proxy. The later public demo and
invited T008 pilot require separate approval.

## Local development

Prerequisites:

- Node.js 22 or newer;
- pnpm 11.20.0 through Corepack or `pnpm.cmd` on Windows;
- Docker with Compose for the normal local PostgreSQL path.

From a clean checkout:

```bash
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Open `http://127.0.0.1:3000` and pair using the launch-terminal secret. Do not
expose the local app through a proxy, tunnel, port forward or unsupported launch
path. The migration command and application startup both apply committed
migrations idempotently. Tests use an embedded PGlite build of PostgreSQL by
default, so unit/integration verification does not require Docker.

Required verification:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Core loop

The MVP is intended to prove one complete learning loop:

1. Create or open a project.
2. Describe a product brief or bounded development tranche.
3. Enter an available or allocated budget, reset timing, and optional reserve preferences.
4. Review task decomposition, complexity, risk, and forecast confidence.
5. Receive low, expected, and high forecasts plus an operating mode, allocations, optimization guidance, and explicit stop conditions.
6. Receive one primary policy decision: `PROCEED`, `NARROW`, `DEFER`, or `STOP / PRESERVE`.
7. Execute the work outside the Governor or through a later integration.
8. Record actual consumption, corrections, validation, failures, and deferred work.
9. Compare forecast with actual usage to improve future calibration.

A tranche is affordable only when implementation, reasonable correction, and required validation all fit within the permitted budget.

## Operating modes

- **FULL** — budget comfortably supports implementation, correction, and validation.
- **CONSERVATION** — reduce scope and unnecessary parallelism while protecting validation reserve.
- **LOW** — complete only the smallest coherent unit, avoid expansion, and verify before continuing.
- **CRITICAL** — begin no new feature work; preserve state, record unresolved work, prepare a precise handoff, and stop.

AI-assisted analysis may classify work and uncertainty. A deterministic, auditable policy engine decides what the available budget permits. The two responsibilities must remain separable.

## Intended users and planning levers

Initial users include AI-heavy developers, technical founders working within constrained development budgets, developers coordinating multiple repositories, and small teams that need explicit agent-usage policies. The product is also intended to make costly sessions more predictable for people whose time, energy, or cognitive capacity is limited.

Depending on evidence and approved policy, the Governor may optimize scope, context loaded for a tranche, model strategy, parallelism, dependencies, validation reserve, correction/recovery reserve, and reset timing.

## Proposed MVP stack

- TypeScript monorepo managed with pnpm
- Next.js and React for the web application and server-side application layer
- PostgreSQL with Drizzle ORM for durable project, preflight, plan, and outcome records
- Zod schemas at process and transport boundaries
- Vitest and Testing Library for unit/component tests; Playwright for critical browser flows
- Official, documented AI APIs behind an optional analysis adapter; manual analysis and budget entry remain supported
- A container-compatible Node deployment with no required hosting vendor

Exact versions and deployment providers should be selected when the first application tranche is bootstrapped and committed with a lockfile.

## Repository map

```text
apps/
  web/                    Next.js UI and PostgreSQL/Drizzle adapter
packages/
  contracts/              Portable domain vocabulary and boundary types
  application/            Framework-independent use-case coordination
  policy-engine/          Deterministic founder-owned policy rules
  forecast-engine/        Forecasting and calibration logic
  ai-analysis/            Optional AI classification behind a port
  platform-adapters/      Normalization of coding-agent capacity state
docs/
  ARCHITECTURE_CONTEXT.md Architecture, boundaries, and open decisions
  DEVELOPMENT_WORKFLOW.md Bounded-tranche and review workflow
  decisions/              Accepted and proposed decision records
```

See [Architecture context](docs/ARCHITECTURE_CONTEXT.md) and [Development workflow](docs/DEVELOPMENT_WORKFLOW.md) before beginning substantive work. The accepted assignments are [Tranche 001: Manual Preflight Draft](docs/TRANCHE_001_MANUAL_PREFLIGHT_DRAFT.md) and [Tranche 002: Run and Outcome History Foundation](docs/TRANCHE_002_RUN_AND_OUTCOME_HISTORY_FOUNDATION.md). Repository-wide agent guidance is in [AGENTS.md](AGENTS.md).

## MVP boundaries

The initial MVP does not require automatic access to private Codex balances, authentication cookies, undocumented endpoints, billing, enterprise deployment, multiple coding-agent integrations, or Claude Code support. It must not claim demonstrated savings, productivity gains, forecast accuracy, or commercial validation without pilot evidence.

Forecast-versus-actual history—including poor forecasts and negative outcomes—is product evidence and should be preserved.

## Collaboration boundary

The founder owns product meaning, policy rules, operating modes, reserve philosophy, forecasting method, prioritization, and acceptance. Collaborators work in explicitly bounded implementation tranches through branches and pull requests. The accepted first collaborator assignment is [Tranche 001: Manual Preflight Draft](docs/TRANCHE_001_MANUAL_PREFLIGHT_DRAFT.md).
