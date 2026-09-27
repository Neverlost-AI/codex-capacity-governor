import type { ComposedAttempt } from "@capacity-governor/contracts";
import { PlanningDisclosure } from "./planning-disclosure";
import {
  percentageFromBasisPoints as percent,
  readableValue,
} from "./preflight-presentation";

export function ComposedResult({ attempt }: { attempt: ComposedAttempt }) {
  const policy = attempt.policy;
  const forecast = attempt.forecast;
  const notComposable = attempt.projections.some(
    (projection) => projection.kind === "NOT_COMPOSABLE",
  );
  const windowName = (id: string) => {
    const bucket = attempt.revision.input.buckets.find(
      (candidate) => candidate.bucketId === id,
    );
    return bucket ? `${bucket.capacityWindowId} (${id})` : id;
  };
  return (
    <article className="composed-result">
      <h1>Saved capacity preflight</h1>
      <p className="notice historical-notice">
        Historical saved evaluation — not current authorization. Current
        guidance requires a new reviewed evaluation with fresh evidence.
        Reopening does not rerun or refresh this result.
      </p>
      <section
        className="decision-panel"
        data-decision={
          policy?.kind === "POLICY_EVALUATION"
            ? policy.aggregateDecision
            : "EVIDENCE_UNAVAILABLE"
        }
        aria-label="Decision at evaluation time"
      >
        <p className="eyebrow">At evaluation time · {attempt.evaluationTime}</p>
        {policy?.kind === "POLICY_EVALUATION" ? (
          <>
            <h2>{policy.aggregateDecision}</h2>
            <p>Operating mode: {readableValue(policy.aggregateMode)}</p>
            <p>
              Limiting windows:{" "}
              {policy.limitingBucketIds.map(windowName).join(", ") || "none"}.
              Blocking windows:{" "}
              {policy.blockingBucketIds.map(windowName).join(", ") || "none"}.
            </p>
            <p>
              {policy.stopIds.length
                ? policy.stopIds.map(readableValue).join(" ")
                : policy.blockingBucketIds.length
                  ? "The reviewed scope exceeds the safe implementation allocation in the blocking windows."
                  : policy.aggregateDecision === "NARROW"
                    ? "Low capacity requires an explicit minimum-coherent-scope attestation to proceed; this scope was not attested as minimum."
                    : "The reviewed demand fits each required window's implementation allocation while preserving correction and validation reserves."}
            </p>
            <p>
              {policy.aggregateDecision === "NARROW"
                ? "Define an explicitly new, smaller coherent scope and perform a new reviewed preflight. This result authorizes no partial execution."
                : policy.aggregateDecision === "DEFER"
                  ? "No work now. After the qualifying reset, obtain fresh observations for every required window and perform a complete new preflight."
                  : policy.aggregateDecision === "STOP / PRESERVE"
                    ? "No new implementation. Correct the evidence or scope through a new reviewed revision; protected reserves remain independent."
                    : "PROCEED is a policy result, not founder acceptance of a repository tranche or authority for automatic execution."}
            </p>
          </>
        ) : forecast.kind === "INPUT_REJECTION" ? (
          <>
            <h2>Forecast inputs rejected</h2>
            <p>
              Forecast inputs were rejected. Correct the reported fields and
              create a new reviewed evaluation; no Governor mode or decision
              exists.
            </p>
            <ul>
              {forecast.issues.map((issue, index) => (
                <li key={index}>
                  {issue.path.join(".")}: {readableValue(issue.id)}
                </li>
              ))}
            </ul>
          </>
        ) : notComposable ? (
          <>
            <h2>Forecast cannot be used for a policy decision</h2>
            <p>
              Retained planning demand cannot be consumed by Gate A V1.
              Above-cycle demand is not clamped or translated into a Governor
              decision. Review a genuinely different scope through a new
              preflight.
            </p>
          </>
        ) : policy?.kind === "INPUT_REJECTION" ? (
          <>
            <h2>Policy inputs rejected</h2>
            <p>
              Malformed or inconsistent policy evidence is different from an
              evaluable unknown-uncertainty stop. Correct the reported evidence;
              no Governor mode or decision was invented.
            </p>
            <ul>
              {policy.issues.map((issue, index) => (
                <li key={index}>
                  {issue.path.join(".")}: {readableValue(issue.validationId)}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      <PlanningDisclosure />
      {forecast.kind === "FORECAST_EVALUATION" ? (
        <section>
          <h2>Independent window planning ranges</h2>
          {forecast.bucketResults.map((result) => (
            <div className="form-card" key={result.bucket.bucketId}>
              <h3>
                {result.bucket.capacityWindowId} · {result.bucket.bucketId}
              </h3>
              <p>
                Low {percent(result.roundedRange.lowBasisPoints)} · Expected
                implementation usage{" "}
                {percent(result.roundedRange.expectedBasisPoints)} · High{" "}
                {percent(result.roundedRange.highBasisPoints)}
              </p>
              <p>
                Confidence: {readableValue(result.confidence)} (evidence
                quality, not accuracy).
              </p>
            </div>
          ))}
          <h3>Assumptions and unknowns</h3>
          <p>
            These are cold-start estimates: no historical adjustment is applied.
            The configured work-point scale and planning bands are assumptions,
            not measured usage.
          </p>
          {forecast.unknowns.length ? (
            <ul>
              {forecast.unknowns.map((unknown, index) => (
                <li key={index}>{readableValue(unknown)}</li>
              ))}
            </ul>
          ) : (
            <p>No unknown work factors were reported by the forecast.</p>
          )}
          <details>
            <summary>Technical assumptions and unknown evidence</summary>
            <pre className="evidence-json">
              {JSON.stringify(
                {
                  assumptions: forecast.assumptions,
                  unknowns: forecast.unknowns,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      ) : null}
      {policy?.kind === "POLICY_EVALUATION" ? (
        <section>
          <h2>Protected allocations by window</h2>
          {policy.bucketResults.map((bucket) => (
            <div className="form-card" key={bucket.bucketId}>
              <h3>{bucket.bucketId} allocations</h3>
              <p>{windowName(bucket.bucketId)}</p>
              <dl className="summary-grid">
                {(
                  [
                    ["Available capacity", bucket.availableBasisPoints],
                    [
                      "Expected implementation usage",
                      bucket.suppliedDemandBasisPoints,
                    ],
                    [
                      "Demand including uncertainty allowance",
                      bucket.adjustedDemandBasisPoints,
                    ],
                    ["Correction reserve", bucket.correctionReserveBasisPoints],
                    ["Validation reserve", bucket.validationReserveBasisPoints],
                    [
                      "Implementation allocation",
                      bucket.implementationAllocationBasisPoints,
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{percent(value)}</dd>
                  </div>
                ))}
              </dl>
              <p>
                {bucket.stopIds.length
                  ? bucket.stopIds.map(readableValue).join(" ")
                  : bucket.currentAffordable
                    ? "Reviewed demand fits this window's protected implementation allocation."
                    : "This window blocks the reviewed scope's implementation demand."}
              </p>
            </div>
          ))}
        </section>
      ) : null}
      <button disabled>Automatic execution unavailable</button>
      <details>
        <summary>
          Complete immutable inputs, configurations, receipt and engine evidence
        </summary>
        <p>
          Technical values retain raw amounts, exact integer basis points,
          unrounded rational evidence, IDs and complete configurations. 100 bp =
          one percentage point; forecast planning precision is 100 bp, while
          policy allocations retain whole-bp precision. No cross-window
          arithmetic is performed.
        </p>
        <pre className="evidence-json">{JSON.stringify(attempt, null, 2)}</pre>
      </details>
    </article>
  );
}
