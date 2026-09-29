# Decision 0007 — Private hosted foundation target and zero-spend boundary

**Status:** Founder accepted, 2026-09-28. This decision does not authorize provisioning or deployment.

**Owner:** Founder.

## Context

The founder accepted the independently reviewed, locally implemented private hosted foundation at exact commit `30c8f21f944099dd563c927faf928166b78731cc`. Its local tests do not establish live Google, Vercel, or Supabase behavior. T007 measured attempts, a public demo, and invited access remain separate gates.

## Decision

- Vercel is the selected application host, and Supabase **Free** PostgreSQL is the selected database tier for the founder-only private host. Keep the existing local mode separate.
- The incremental spending ceiling is **$0**. Do not purchase, upgrade, enable paid add-ons, or incur new charges. Preserve existing Supabase projects: do not delete, transfer, repurpose, overwrite, or migrate them for Governor. A dedicated Governor project is conditional on a verified available Free-project slot and separate provisioning authority. If no suitable no-cost slot exists, stop for a founder decision rather than using an existing project or a paid tier.
- Before any provisioning or deployment, verify the actual Vercel account plan and its permitted use, Supabase Free-project availability and quotas, and the no-cost operational path. The selected products are not a claim that the existing accounts or a private Neverlost Systems deployment already qualify at $0.
- Supabase Free does not supply managed automatic database backups; a separately reviewed, no-cost export/offsite-retention and disposable restore procedure must satisfy the existing backup/restore gate before measured use. Free-project inactivity pausing and quota limits must be accounted for in the hosted go/no-go. Do not weaken the evidence-integrity, authentication, ownership, or recovery requirements to fit the tier.
- The acceptance covers the exact reviewed implementation, not a push, merge, vendor setup, live integration result, public release, measured T007 run, or history-loader/calibration change. Each still requires its applicable authorization and verification.

## Consequences and open gates

The [hosted runbook](../HOSTED_VERCEL_SUPABASE_RUNBOOK.md) remains conditional. First perform read-only account/plan and Free-slot checks; then propose a no-cost backup/restore and deployment plan for separate founder approval. If the $0 ceiling or existing safeguards cannot be met, stop and report the conflict. No existing Supabase project may be disturbed to make room.

## Alternatives considered

- A paid database tier or host upgrade could provide different availability or backup features, but violates the current $0 ceiling and is not authorized.
- Reusing an existing Supabase project could avoid a new slot but violates the founder's preservation boundary.
- Staying local remains available if the selected hosted path cannot satisfy the gate without new authority.

## Source limits

The tier caveats above reflect the providers' published documentation, not verified account state: [Supabase Free limits](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [Supabase Free pausing](https://supabase.com/docs/guides/platform/free-project-pausing), and [Vercel Hobby use limits](https://vercel.com/docs/plans/hobby). Verify current terms and the actual accounts before any live action.
