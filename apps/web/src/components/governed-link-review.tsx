"use client";

import { useState } from "react";
import type { ComposedAttempt } from "@capacity-governor/contracts";

export function GovernedLinkReview({
  attempt,
  csrf,
}: {
  attempt: ComposedAttempt;
  csrf: string;
}) {
  const [challenge, setChallenge] = useState<string>();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (
    attempt.forecast.kind !== "FORECAST_EVALUATION" ||
    attempt.policy?.kind !== "POLICY_EVALUATION"
  )
    return (
      <p role="status">
        This saved attempt cannot establish a governed run. It remains visible
        as historical evidence.
      </p>
    );
  const projectId = attempt.revision.input.projectId;
  const post = async (url: string, body: object) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrf, ...body }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Request failed");
    return result;
  };
  return (
    <section aria-labelledby="governed-link-heading">
      <h2 id="governed-link-heading">Record one bounded development run</h2>
      <p>
        This link records which historical evaluation informed this run. It does
        not refresh capacity or authorize work now. Ordinary coding, testing,
        fixes, prompts and handoffs within this bounded attempt stay in one run.
      </p>
      {attempt.policy.authorizesWork ? null : (
        <p className="notice error">
          Work recorded despite a non-authorizing decision.{" "}
          {attempt.policy.aggregateDecision} did not permit execution.
        </p>
      )}
      <dl>
        <dt>Saved attempt</dt>
        <dd>{attempt.id}</dd>
        <dt>Revision</dt>
        <dd>{attempt.revision.id}</dd>
        <dt>Receipt and digest</dt>
        <dd>
          {attempt.receipt.id} · {attempt.receipt.canonicalDigest}
        </dd>
        <dt>Decision at evaluation time</dt>
        <dd>{attempt.policy.aggregateDecision}</dd>
        <dt>Method / configuration / profile</dt>
        <dd>
          {attempt.forecast.configuration.methodVersion} ·{" "}
          {attempt.forecast.configuration.configurationVersion} ·{" "}
          {attempt.forecast.configuration.bucketProfileVersion}
        </dd>
      </dl>
      <h3>Exact required buckets</h3>
      <ul>
        {attempt.receipt.buckets.map((bucket) => (
          <li key={bucket.bucketId}>
            {bucket.bucketId} · {bucket.providerId} · {bucket.capacityWindowId}{" "}
            · {bucket.resetCycleId}
          </li>
        ))}
      </ul>
      {!challenge ? (
        <button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError("");
            try {
              const result = await post("/governed/review", {
                projectId,
                attemptId: attempt.id,
              });
              setChallenge(result.challenge);
            } catch (failure) {
              setError((failure as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          Review exact saved attempt
        </button>
      ) : (
        <>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />{" "}
            I confirm this exact saved evaluation informed this particular
            bounded run.
          </label>
          <button
            disabled={!confirmed || pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                const result = await post("/governed/confirm", {
                  projectId,
                  attemptId: attempt.id,
                  challenge,
                  confirmedExactAttempt: true,
                });
                window.location.assign(result.runUrl);
              } catch (failure) {
                setError((failure as Error).message);
                setChallenge(undefined);
                setConfirmed(false);
              } finally {
                setPending(false);
              }
            }}
          >
            Create one governed run
          </button>
        </>
      )}
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
