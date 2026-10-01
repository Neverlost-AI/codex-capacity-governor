import type { ComposedRevision } from "@capacity-governor/contracts";
import {
  percentageFromBasisPoints,
  readableValue,
} from "./preflight-presentation";

function Entries({ values }: { values: string[] }) {
  return values.length ? (
    <ul>
      {values.map((value, index) => (
        <li key={index}>{value}</li>
      ))}
    </ul>
  ) : (
    <p>None entered.</p>
  );
}
export function ComposedReview({
  revision,
  digest,
}: {
  revision: ComposedRevision;
  digest: string;
}) {
  const input = revision.input;
  return (
    <div className="review-summary">
      <section className="form-section">
        <h2>Work</h2>
        <dl>
          <dt>Repository or scope reference</dt>
          <dd>{input.repositoryReference}</dd>
          <dt>Work title</dt>
          <dd>{input.title}</dd>
          <dt>What will be done</dt>
          <dd className="preserve-lines">{input.brief}</dd>
        </dl>
        <h3>Out of scope</h3>
        <Entries values={input.explicitExclusions} />
        <h3>What must be true when the work is done</h3>
        <Entries values={input.acceptanceCriteria} />
      </section>
      <section>
        <h2>Work to estimate</h2>
        {input.workItems.map((item) => (
          <div className="form-card" key={item.workItemId}>
            <h3>{item.label}</h3>
            <dl className="summary-grid">
              <div>
                <dt>Work item reference</dt>
                <dd>{item.workItemId}</dd>
              </div>
              {Object.entries(item)
                .filter(([key]) => key !== "workItemId" && key !== "label")
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (char) => char.toUpperCase())}
                    </dt>
                    <dd>{readableValue(value)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </section>
      <section>
        <h2>Required capacity windows</h2>
        <p>
          Please check that every required window is listed. Each window is
          assessed on its own; the amounts are not combined.
        </p>
        {input.buckets.map((bucket) => (
          <div className="form-card" key={bucket.bucketId}>
            <h3>
              {bucket.capacityWindowId} · {bucket.bucketId}
            </h3>
            <dl className="summary-grid">
              <div>
                <dt>Provider</dt>
                <dd>{bucket.providerId}</dd>
              </div>
              <div>
                <dt>Reset cycle reference</dt>
                <dd>{bucket.resetCycleId}</dd>
              </div>
              <div>
                <dt>Available amount as entered</dt>
                <dd>
                  {bucket.availableCapacity.amount} ·{" "}
                  {readableValue(bucket.availableCapacity.unit)}
                </dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>{bucket.observedAt}</dd>
              </div>
              <div>
                <dt>Planning profile evidence</dt>
                <dd>
                  {readableValue(bucket.profile.status)} ·{" "}
                  {bucket.profile.evidenceReference}
                </dd>
              </div>
              <div>
                <dt>Reset information</dt>
                <dd>{readableValue(bucket.reset.kind)}</dd>
              </div>
              {bucket.reset.kind === "CONFIRMED" ? (
                <>
                  <div>
                    <dt>Reset time</dt>
                    <dd>{bucket.reset.resetsAt}</dd>
                  </div>
                  <div>
                    <dt>Source timezone</dt>
                    <dd>{bucket.reset.sourceTimezone}</dd>
                  </div>
                  <div>
                    <dt>UTC reset time</dt>
                    <dd>{bucket.reset.normalizedUtc}</dd>
                  </div>
                  <div>
                    <dt>Post-reset availability</dt>
                    <dd>
                      {bucket.reset.expectedPostResetAvailability
                        ? `${bucket.reset.expectedPostResetAvailability.amount} · ${readableValue(bucket.reset.expectedPostResetAvailability.unit)}`
                        : "Not supplied; no replenishment is assumed."}
                    </dd>
                  </div>
                </>
              ) : bucket.reset.kind !== "NONE" ? (
                <div>
                  <dt>Reset notes</dt>
                  <dd>{bucket.reset.notes ?? "None entered."}</dd>
                </div>
              ) : null}
              {(["correctionReserve", "validationReserve"] as const).map(
                (kind) => (
                  <div key={kind}>
                    <dt>
                      {kind === "correctionReserve"
                        ? "Correction reserve preferences"
                        : "Validation reserve preferences"}
                    </dt>
                    <dd>
                      {bucket[kind] ? (
                        <>
                          {bucket[kind]?.manualMinimum
                            ? `Minimum ${bucket[kind]?.manualMinimum?.amount} · ${readableValue(bucket[kind]!.manualMinimum!.unit)}`
                            : "No manual minimum"}
                          ;{" "}
                          {bucket[kind]?.targetShareBasisPoints !== undefined
                            ? `target share ${percentageFromBasisPoints(bucket[kind]!.targetShareBasisPoints!)} of available capacity`
                            : "no target share supplied"}
                        </>
                      ) : (
                        "Not supplied; configured reserve floors still apply."
                      )}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        ))}
      </section>
      <section className="form-section">
        <h2>Other activity and scope checks</h2>
        {input.knownCapacityActivities.length ? (
          input.knownCapacityActivities.map((activity) => (
            <dl key={activity.eventId}>
              <dt>Activity identity</dt>
              <dd>{activity.eventId}</dd>
              <dt>Occurred at</dt>
              <dd>{activity.occurredAt}</dd>
              <dt>Affected window IDs</dt>
              <dd>{activity.affectedBucketIds.join(", ")}</dd>
              <dt>Factual source</dt>
              <dd>{activity.source}</dd>
            </dl>
          ))
        ) : (
          <p>
            No known activity records entered. This does not prove absence of
            external activity.
          </p>
        )}
        <h3>Active required stops</h3>
        <Entries values={input.activeMandatoryStopIds} />
        <p>
          Smallest complete scope: {input.minimumCoherentScope ? "Yes" : "No"}.
          This answer is separate from the required window list.
        </p>
      </section>
      <details>
        <summary>
          Technical details — complete frozen inputs, IDs, digest and
          configurations
        </summary>
        <p>Canonical digest: {digest}</p>
        <pre
          className="evidence-json"
          tabIndex={0}
          aria-label="Complete reviewed evidence"
        >
          {JSON.stringify(revision, null, 2)}
        </pre>
      </details>
    </div>
  );
}
