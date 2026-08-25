import type { OutcomeObservationWithConsumption } from "@capacity-governor/contracts";

const formatTimestamp = (value: string): string =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));

export const OutcomeEvidence = ({
  entry,
  isCurrent,
}: {
  entry: OutcomeObservationWithConsumption;
  isCurrent: boolean;
}) => {
  const { observation, actualConsumption } = entry;
  return (
    <article className={`outcome-card ${isCurrent ? "current" : "historical"}`}>
      <header>
        <div>
          <p className="eyebrow">
            {observation.supersedesObservationId
              ? "Append-only amendment"
              : "Original observation"}
          </p>
          <h3>
            {observation.runOutcome} · {observation.validationResult}
          </h3>
        </div>
        <span className="draft-badge saved">
          {isCurrent ? "Current" : "Preserved history"}
        </span>
      </header>
      <p className="evidence-meta">
        Recorded {formatTimestamp(observation.recordedAt)} UTC
      </p>
      {observation.amendmentReason ? (
        <div className="evidence-block">
          <h4>Amendment reason</h4>
          <p>{observation.amendmentReason}</p>
        </div>
      ) : null}
      <div className="evidence-grid">
        <div className="evidence-block">
          <h4>Actual consumption</h4>
          {actualConsumption.length ? (
            <ul>
              {actualConsumption.map((consumption) => (
                <li key={consumption.id}>
                  {consumption.category}: {consumption.amount}{" "}
                  {consumption.unit}
                  {" · manual"}
                </li>
              ))}
            </ul>
          ) : (
            <p>Not recorded.</p>
          )}
        </div>
        <div className="evidence-block">
          <h4>Remaining capacity</h4>
          {observation.remainingCapacity ? (
            <p>
              {observation.remainingCapacity.amount}{" "}
              {observation.remainingCapacity.unit} · observed{" "}
              {formatTimestamp(observation.remainingCapacity.observedAt)} UTC ·
              manual
            </p>
          ) : (
            <p>Not recorded.</p>
          )}
        </div>
        <div className="evidence-block">
          <h4>Unexpected failures</h4>
          {observation.unexpectedFailures.length ? (
            <ul>
              {observation.unexpectedFailures.map((failure) => (
                <li key={failure}>{failure}</li>
              ))}
            </ul>
          ) : (
            <p>None recorded.</p>
          )}
        </div>
        <div className="evidence-block">
          <h4>Deferred work</h4>
          {observation.deferredWork.length ? (
            <ul>
              {observation.deferredWork.map((work) => (
                <li key={work}>{work}</li>
              ))}
            </ul>
          ) : (
            <p>None recorded.</p>
          )}
        </div>
      </div>
      {observation.notes ? (
        <div className="evidence-block">
          <h4>Factual notes</h4>
          <p>{observation.notes}</p>
        </div>
      ) : null}
    </article>
  );
};
