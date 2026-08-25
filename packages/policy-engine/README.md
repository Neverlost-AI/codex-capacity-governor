# Governor policy engine

Pure, deterministic implementation of the founder-approved Gate A V1 policy in
`docs/decisions/0002-gate-a-governor-policy-semantics-v1.md`.

## Public boundary

`evaluatePolicyV1(input: unknown)` returns one typed outcome:

- `INPUT_REJECTION` for structurally malformed or contract-invalid evidence;
  this outcome never contains a mode or decision and never authorizes work; or
- `POLICY_EVALUATION` for an evaluable case, including every per-bucket result,
  one aggregate mode, one aggregate decision, stable rule/stop identifiers, and
  the exact configuration/evidence needed to reproduce the result.

Import the evaluator and accepted configuration fixture from
`@capacity-governor/policy-engine`. Runtime input schemas and portable result
types are exported by `@capacity-governor/contracts`.

## Determinism and exact arithmetic

- Evaluation time is caller-supplied; the engine does not read the system clock.
- Raw policy quantities use canonical decimal text plus an exact-whitelist unit.
- Normalization is evaluator-owned and uses integer/rational arithmetic.
- Reserve floors use `1,500 / 10,000`; bounded uncertainty uses exact `5 / 4`.
- Available capacity rounds down; demand and reserve requirements round up.
- Required buckets are evaluated independently and output in stable bucket-ID
  order. Capacity is never transferred, summed, or substituted across buckets.
- Post-reset defer evidence recalculates `A_post`, `C_post`, `V_post`, and
  `I_post` independently for each blocking bucket.

## Focused verification

```text
pnpm --filter @capacity-governor/policy-engine typecheck
pnpm test packages/contracts/test/policy.test.ts packages/policy-engine/test/policy.test.ts
```

The package has no UI, persistence, network, provider, forecast, calibration, or
AI dependency. It does not construct or persist a governed execution plan.
