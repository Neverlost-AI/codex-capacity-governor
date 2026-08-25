# Contracts

Portable domain vocabulary shared by the application and core engines. Keep this package independent of UI frameworks, databases, transport protocols, and AI/platform SDKs.

The Tranche 001 and founder-approved Tranche 002 recording vocabularies are
backed by runtime Zod schemas in `src/index.ts`. T002 schemas describe only
`UNGUIDED` runs, manually entered factual outcome evidence, and append-only
amendments.

Founder-approved Tranche 003 multi-bucket policy input schemas and portable
rejection/evaluation result types live in `src/policy.ts`. Raw policy quantities
retain canonical decimal evidence and explicit exact-whitelist units; the policy
engine, not this contract package or the caller, owns normalization and policy
calculation. Forecast, calibration, persistence, UI, AI, and platform-adapter
semantics remain outside this package.
