# Decision 0008: Direct three-step reviewed preflight

## Status

Founder approved replacing the separate mandatory manual-draft prerequisite for new reviewed preflights and requested three plain-language stages: Work, Capacity, Review. This record documents the implementation boundary; it does not approve a deployment or measured challenge build.

## Decision

- A new reviewed preflight starts directly from a project. Work scope is entered once in Work, required independent capacity windows in Capacity, and exact frozen inputs are displayed in Review before the existing two explicit confirmations. Neither required window membership nor planning factors are inferred. Unknown remains an explicit planning-factor choice.
- The stored `preflightDraftId` link is optional for newly prepared revisions and governed links. Historical revisions and governed links keep their existing draft IDs and remain readable. A direct revision receives its own server-generated `parentTrancheId`; the draft-owned path keeps its historical tranche ID. No legacy scalar budget, reset, or reserve value is converted into window evidence.
- Direct reviews cannot claim an earlier revision as their predecessor: without a draft-linked scope identity, that would let unrelated work appear to be a correction. Each new direct review remains independent. The historical draft-linked correction rule remains available.
- The two existing database draft-ID columns for composed revisions and hosted pending reviews become nullable. The historical draft table, unguided runs, policy inputs, forecasting configuration, confirmation receipt, canonical digest, and evaluation engines remain unchanged. Pending review replacement is scoped to the session and project so a direct review supersedes an earlier pending review for that project.
- Legacy manual drafts and unguided run history stay accessible in a separate, collapsed project section. They are not a first step in the reviewed preflight.

## Compatibility and rollback

The migration drops only `NOT NULL` constraints and does not rewrite old rows. Restoring the old constraints requires first removing or migrating direct reviews with null draft IDs; that cannot be done without changing their immutable evidence. Rollback of the UI and application code should therefore retain the nullable columns and historical direct records, or be paired with an explicit founder-approved data plan. Existing draft-linked snapshots are still validated against their draft ownership.
