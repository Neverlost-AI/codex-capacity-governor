# Web application

The Next.js application composes Tranche 001 UI and server actions with the framework-independent application package and an outward Drizzle persistence adapter.

## Boundaries

- `src/app` and `src/components` own web input and rendering.
- `packages/application` owns use cases and repository ports.
- `src/server/db` implements those ports with Drizzle.
- `packages/contracts` owns shared runtime schemas and types.
- Only `Project` and `PreflightDraft` are persisted.

The application does not forecast, calculate reserves, or issue Governor decisions.
