# Application layer

Framework-independent use cases coordinate contracts and persistence ports.
Alongside the Tranche 001 project/preflight behavior, Tranche 002 adds only
unguided-run creation, initial outcome recording, append-only amendment, project
run listing, and full history retrieval.

This package owns orchestration and cross-record validation, not React rendering,
SQL/ORM implementations, provider SDKs, or policy formulas. Initial outcome and
amendment repository operations are transactional boundaries; stale amendments
are rejected through the expected-current-observation contract.
