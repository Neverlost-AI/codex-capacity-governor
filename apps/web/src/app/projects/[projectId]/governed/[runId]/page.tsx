import Link from "next/link";
import { requireLocalAccess } from "../../../../../server/access";
import { getGovernedService } from "../../../../../server/governed-application";
import { GovernedOutcomeForm } from "../../../../../components/governed-outcome-form";
export const dynamic = "force-dynamic";
export default async function GovernedRunPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = await params;
  const { session } = await requireLocalAccess();
  let history;
  try {
    history = await (await getGovernedService()).reopen(runId);
    if (history.link.projectId !== projectId)
      throw new Error("Project mismatch");
  } catch {
    return (
      <main className="narrow-shell">
        <h1>Governed evidence unavailable</h1>
        <p role="alert">
          Ownership, integrity or database evidence could not be established.
          Nothing was repaired or reauthorized.
        </p>
        <Link href={`/projects/${projectId}`}>Back to project</Link>
      </main>
    );
  }
  return (
    <main className="page-shell">
      <Link href={`/projects/${projectId}`}>Back to project</Link>
      <h1>Governed bounded run</h1>
      <p className="notice historical-notice">
        Historical decision at evaluation time, not current authorization.
        Reopening does not refresh capacity or recompute the decision.
      </p>
      <p>
        Original plan:{" "}
        <Link
          href={`/projects/${projectId}/preflight/results/${history.attempt.id}`}
        >
          {history.attempt.revision.input.title} · saved attempt{" "}
          {history.attempt.id}
        </Link>
      </p>
      <p>
        Original decision: {history.link.decision}.{" "}
        {history.link.authorizesWork
          ? "Original result was PROCEED."
          : "Work recorded despite a non-authorizing decision."}
      </p>
      <p>
        Confirmation: {history.link.confirmationReference} ·{" "}
        {history.link.actorReference} · {history.link.confirmedAt}
      </p>
      <section aria-label="Outcome and comparison history">
        <h2>Complete outcome versions</h2>
        {!history.observations.length ? (
          <p>
            No outcome has been recorded. Missing actual usage is unknown, not
            zero.
          </p>
        ) : null}
        {history.observations.map((item, index) => (
          <article className="form-card" key={item.id}>
            <h3>
              {index === history.observations.length - 1
                ? "Current"
                : "Superseded"}{" "}
              version {index + 1} · {item.recordedAt}
            </h3>
            {item.amendmentReason ? (
              <p>Amendment reason: {item.amendmentReason}</p>
            ) : null}
            <p>
              Outcome: {item.runOutcome} · Validation: {item.validationResult}
            </p>
            <p>
              Operator-reported adherence: {item.adherence}
              {item.adherenceExplanation
                ? ` — ${item.adherenceExplanation}`
                : ""}
              . This is self-report, not independently verified compliance.
            </p>
            <p>
              Failures: {item.unexpectedFailures.join("; ") || "none recorded"}.
              Deferred work: {item.deferredWork.join("; ") || "none recorded"}.
            </p>
            <p>
              Notes: {item.notes ?? "none recorded"}. Remaining snapshot:{" "}
              {item.remainingCapacity
                ? `${item.remainingCapacity.amount} ${item.remainingCapacity.unit} at ${item.remainingCapacity.observedAt}`
                : "unknown"}
              .
            </p>
            {history.attempt.revision.input.buckets.map((bucket) => {
              const comparison = item.comparisons.find(
                (entry) => entry.bucketId === bucket.bucketId,
              );
              const usage = item.usage.filter(
                (entry) => entry.bucketId === bucket.bucketId,
              );
              return (
                <section
                  key={bucket.bucketId}
                  aria-label={`${bucket.bucketId} comparison`}
                >
                  <h4>
                    {bucket.bucketId} · {bucket.providerId} ·{" "}
                    {bucket.capacityWindowId} · {bucket.resetCycleId}
                  </h4>
                  {usage.length ? (
                    <ul>
                      {usage.map((entry) => (
                        <li key={entry.category}>
                          {entry.category}: {entry.rawValue} {entry.rawUnit} ={" "}
                          {entry.normalizedBasisPoints} bp · source{" "}
                          {entry.sourceReference} · observed {entry.observedAt}{" "}
                          · cycle assertion {entry.exactCycleOnly} · reviewed{" "}
                          {entry.reviewedAt}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No bucket usage entered; unknown, not zero.</p>
                  )}
                  {comparison?.comparison.kind ===
                  "COMPARABLE_FULL_COMPLETION" ? (
                    <p>
                      Issued EXPECTED{" "}
                      {comparison.comparison.expectedBasisPoints} bp; actual{" "}
                      {comparison.comparison.actualBasisPoints} bp; signed error{" "}
                      {comparison.comparison.signedError.sign}{" "}
                      {comparison.comparison.signedError.magnitude.numerator}/
                      {comparison.comparison.signedError.magnitude.denominator}{" "}
                      bp; absolute error{" "}
                      {comparison.comparison.absoluteError.numerator}/
                      {comparison.comparison.absoluteError.denominator} bp;
                      range hit {comparison.comparison.rangeHit ? "yes" : "no"};
                      issued-expected calibration ratio{" "}
                      {comparison.comparison.calibrationRatio.numerator}/
                      {comparison.comparison.calibrationRatio.denominator}.
                    </p>
                  ) : comparison?.comparison.kind ===
                    "NOT_COMPARABLE_FULL_COMPLETION" ? (
                    <p>
                      LOWER_BOUND_ONLY:{" "}
                      {comparison.comparison.observedActualBasisPoints} bp
                      observed for {item.runOutcome}; no full-completion error
                      or calibration candidate.
                    </p>
                  ) : (
                    <p>
                      UNAVAILABLE:{" "}
                      {comparison?.unavailableDetail ??
                        comparison?.comparison.reasonId ??
                        "No compatible comparison"}
                      .
                    </p>
                  )}
                </section>
              );
            })}
            <details>
              <summary>Versioned factual and comparison evidence</summary>
              <pre className="evidence-json">
                {JSON.stringify(item, null, 2)}
              </pre>
            </details>
          </article>
        ))}
      </section>
      <GovernedOutcomeForm history={history} csrf={session.csrf} />
    </main>
  );
}
