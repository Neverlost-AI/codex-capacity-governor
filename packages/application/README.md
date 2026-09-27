# Application layer

Framework-independent use cases coordinate contracts and persistence ports.
Alongside the Tranche 001 project/preflight behavior, Tranche 002 adds only
unguided-run creation, initial outcome recording, append-only amendment, project
run listing, and full history retrieval.

This package owns orchestration and cross-record validation, not React rendering,
SQL/ORM implementations, provider SDKs, or policy formulas. Initial outcome and
amendment repository operations are transactional boundaries; stale amendments
are rejected through the expected-current-observation contract.

T005 adds `createComposedService` (`prepare`, trusted-boundary `confirm`, `list`,
`reopen`) and `ComposedRepository`. Injected time, IDs, digest, complete configs
and repositories compose the real forecast/projection/policy APIs without
owning their formulas. History input remains empty; negative outcomes and
complete immutable evidence are saved atomically. See [T005 notes](../../docs/TRANCHE_005_IMPLEMENTATION_NOTES.md).
