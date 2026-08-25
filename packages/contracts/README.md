# Contracts

Portable domain vocabulary shared by the application and core engines. Keep this package independent of UI frameworks, databases, transport protocols, and AI/platform SDKs.

The Tranche 001 and founder-approved Tranche 002 recording vocabularies are
backed by runtime Zod schemas in `src/index.ts`. T002 schemas describe only
`UNGUIDED` runs, manually entered factual outcome evidence, and append-only
amendments. Later-tranche types remain compile-time placeholders only; their
presence does not authorize implementation or settle founder-controlled
semantics.
