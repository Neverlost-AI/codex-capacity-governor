# Web application

The Next.js application composes the Tranche 001 manual-preflight flow and the
Tranche 002 unguided run/outcome-history flow with the framework-independent
application package and an outward Drizzle persistence adapter.

## Boundaries

- `src/app` and `src/components` own web input and rendering.
- `packages/application` owns use cases and repository ports.
- `src/server/db` implements those ports with Drizzle.
- `packages/contracts` owns shared runtime schemas and types.
- T002 additionally persists `DevelopmentRun`, immutable
  `RunOutcomeObservation`, and categorized `ActualCapacityConsumption` records.

Legacy draft/run flows do not forecast or issue Governor decisions. T005 adds
a separate manual reviewed preflight invoking the real accepted forecast and
policy engines, with immutable saved evidence and historical reopen. It does
not calibrate or enable execution. See [T005 implementation notes](../../docs/TRANCHE_005_IMPLEMENTATION_NOTES.md)
for supported loopback launch, pairing/session/CSRF requirements, migration,
evidence reproduction and limits. All product reads/actions require pairing.

## Run-history persistence

Committed migrations create the accepted T001 tables first and add the three
T002 tables without rewriting T001 data. Project run lists use newest
`createdAt`, then run ID, as their deterministic order. Outcome history follows
the linear predecessor chain from the original observation to the current one.
An amendment and all of its consumption records commit in one transaction; a
stale predecessor is rejected and no prior row is updated or deleted.

`pnpm db:migrate` applies the forward migrations. Rolling T002 back by dropping
its tables would permanently delete run and outcome evidence, so no automatic
rollback is provided. Preserve or export that evidence before any separately
reviewed destructive rollback.
