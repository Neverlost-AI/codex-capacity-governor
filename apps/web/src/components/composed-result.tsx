import type { ComposedAttempt } from "@capacity-governor/contracts";
import { PlanningDisclosure } from "./planning-disclosure";
export function ComposedResult({ attempt }: { attempt: ComposedAttempt }) {
  const policy = attempt.policy;
  const forecast = attempt.forecast;
  return (
    <article>
      <h1>Saved capacity preflight</h1>
      <p className="notice">
        Historical saved evaluation — not current authorization. Current
        guidance requires a new reviewed evaluation with fresh evidence.
        Reopening does not rerun or refresh this result.
      </p>
      <PlanningDisclosure />
      <p>
        Evaluated at {attempt.evaluationTime}. Forecast{" "}
        {attempt.revision.forecastConfiguration.methodVersion} /{" "}
        {attempt.revision.forecastConfiguration.configurationVersion}; policy{" "}
        {attempt.revision.policyConfiguration.policyVersion} /{" "}
        {attempt.revision.policyConfiguration.configurationVersion}.
      </p>
      {forecast.kind === "INPUT_REJECTION" ? (
        <section>
          <h2>Forecast INPUT_REJECTION</h2>
          <pre>{JSON.stringify(forecast.issues, null, 2)}</pre>
        </section>
      ) : (
        <section>
          <h2>Independent bucket planning ranges</h2>
          {forecast.bucketResults.map((result) => (
            <div className="form-card" key={result.bucket.bucketId}>
              <h3>
                {result.bucket.bucketId} · {result.bucket.capacityWindowId}
              </h3>
              <p>
                {result.bucket.providerId} / {result.bucket.capacityWindowId} /{" "}
                {result.bucket.resetCycleId}
              </p>
              <p>
                Low {result.roundedRange.lowBasisPoints} bp · Expected{" "}
                {result.roundedRange.expectedBasisPoints} bp · High{" "}
                {result.roundedRange.highBasisPoints} bp
              </p>
              <p>Confidence: {result.confidence}</p>
            </div>
          ))}
          <h3>Assumptions and unknowns</h3>
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
        </section>
      )}
      {attempt.projections.some(
        (projection) => projection.kind === "NOT_COMPOSABLE",
      ) ? (
        <section>
          <h2>NOT_COMPOSABLE</h2>
          <p>
            Retained planning demand cannot be consumed by Gate A V1.
            Above-cycle demand is not clamped or translated into a Governor
            decision. Review a genuinely different scope through a new
            preflight.
          </p>
          <pre className="evidence-json">
            {JSON.stringify(attempt.projections, null, 2)}
          </pre>
        </section>
      ) : null}
      {policy?.kind === "INPUT_REJECTION" ? (
        <section>
          <h2>Policy INPUT_REJECTION</h2>
          <p>
            Malformed or inconsistent policy evidence is different from an
            evaluable UNKNOWN_OR_INVALID stop. No Governor mode or decision was
            invented.
          </p>
          <pre className="evidence-json">
            {JSON.stringify(policy.issues, null, 2)}
          </pre>
        </section>
      ) : null}
      {policy?.kind === "POLICY_EVALUATION" ? (
        <section>
          <h2>{policy.aggregateDecision}</h2>
          <p>Operating mode: {policy.aggregateMode}</p>
          <p>
            Limiting buckets: {policy.limitingBucketIds.join(", ")}. Blocking
            buckets: {policy.blockingBucketIds.join(", ") || "none"}.
          </p>
          <p>
            {policy.aggregateDecision === "NARROW"
              ? "Define an explicitly new, smaller coherent scope and perform a new reviewed preflight. This result authorizes no partial execution."
              : policy.aggregateDecision === "DEFER"
                ? "No work now. After the qualifying reset, obtain fresh observations for every required bucket and perform a complete new preflight."
                : policy.aggregateDecision === "STOP / PRESERVE"
                  ? "No new implementation. Correct the evidence or scope through a new reviewed revision; protected reserves remain independent."
                  : "PROCEED is a policy result, not founder acceptance of a repository tranche or authority for automatic execution."}
          </p>
          {policy.bucketResults.map((bucket) => (
            <div className="form-card" key={bucket.bucketId}>
              <h3>{bucket.bucketId} allocations</h3>
              <p>
                A={bucket.availableBasisPoints} bp · C=
                {bucket.correctionReserveBasisPoints} bp · V=
                {bucket.validationReserveBasisPoints} bp · I=
                {bucket.implementationAllocationBasisPoints} bp
              </p>
              <p>
                Supplied expected demand {bucket.suppliedDemandBasisPoints} bp;
                policy-adjusted demand {bucket.adjustedDemandBasisPoints} bp.{" "}
                {bucket.uncertainty} · {bucket.mode} ·{" "}
                {bucket.candidateDecision}
              </p>
              <p>
                Rules: {bucket.ruleIds.join(", ")}. Stops:{" "}
                {bucket.stopIds.join(", ") || "none"}.
              </p>
            </div>
          ))}
          <p>
            Aggregate rules: {policy.ruleIds.join(", ")}. Stops:{" "}
            {policy.stopIds.join(", ") || "none"}.
          </p>
        </section>
      ) : null}
      <button disabled>Automatic execution unavailable</button>
      <details>
        <summary>
          Complete immutable inputs, configurations, receipt and engine evidence
        </summary>
        <pre className="evidence-json">{JSON.stringify(attempt, null, 2)}</pre>
      </details>
    </article>
  );
}
