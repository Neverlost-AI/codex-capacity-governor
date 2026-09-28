"use client";

import { useState } from "react";
import type {
  GovernedHistory,
  GovernedUsageInput,
} from "@capacity-governor/contracts";

const categories = ["IMPLEMENTATION", "CORRECTION", "VALIDATION"] as const;
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
type UsageRow = Omit<GovernedUsageInput, "reviewed"> & { reviewed: boolean };

export function GovernedOutcomeForm({
  history,
  csrf,
}: {
  history: GovernedHistory;
  csrf: string;
}) {
  const latest = history.observations.at(-1);
  const [runOutcome, setRunOutcome] = useState<
    "COMPLETED" | "PARTIAL" | "FAILED"
  >(latest?.runOutcome ?? "COMPLETED");
  const [validationResult, setValidationResult] = useState<
    "NOT_RUN" | "PASSED" | "PARTIAL" | "FAILED" | "INCONCLUSIVE"
  >(latest?.validationResult ?? "NOT_RUN");
  const [adherence, setAdherence] = useState<
    "FOLLOWED" | "PARTIALLY_FOLLOWED" | "NOT_FOLLOWED" | "UNKNOWN" | ""
  >("");
  const [adherenceExplanation, setAdherenceExplanation] = useState(
    latest?.adherenceExplanation ?? "",
  );
  const [failures, setFailures] = useState(
    latest?.unexpectedFailures.join("\n") ?? "",
  );
  const [deferred, setDeferred] = useState(
    latest?.deferredWork.join("\n") ?? "",
  );
  const [notes, setNotes] = useState(latest?.notes ?? "");
  const [amendmentReason, setAmendmentReason] = useState("");
  const [remainingAmount, setRemainingAmount] = useState(
    latest?.remainingCapacity?.amount.toString() ?? "",
  );
  const [remainingUnit, setRemainingUnit] = useState(
    latest?.remainingCapacity?.unit ?? "",
  );
  const [remainingObservedAt, setRemainingObservedAt] = useState(
    latest?.remainingCapacity?.observedAt ?? "",
  );
  const [usage, setUsage] = useState<UsageRow[]>(
    () => latest?.usage.map((entry) => ({ ...entry, reviewed: false })) ?? [],
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const bucketResults =
    history.attempt.forecast.kind === "FORECAST_EVALUATION"
      ? history.attempt.forecast.bucketResults
      : [];
  const update = (
    bucketId: string,
    category: (typeof categories)[number],
    patch: Partial<UsageRow>,
  ) => {
    const bucket = bucketResults.find(
      (entry) => entry.bucket.bucketId === bucketId,
    )!.bucket;
    setUsage((current) => {
      const found = current.find(
        (entry) => entry.bucketId === bucketId && entry.category === category,
      );
      const base: UsageRow = found ?? {
        bucketId,
        providerId: bucket.providerId,
        capacityWindowId: bucket.capacityWindowId,
        resetCycleId: bucket.resetCycleId,
        bucketProfileVersion: bucket.bucketProfileVersion,
        category,
        rawValue: "",
        rawUnit: "PERCENT",
        sourceReference: "",
        observedAt: "",
        reviewed: false,
        exactCycleOnly: "UNKNOWN",
      };
      const next = { ...base, ...patch };
      return [
        ...current.filter(
          (entry) =>
            !(entry.bucketId === bucketId && entry.category === category),
        ),
        next,
      ];
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!adherence) {
      setError("Choose operator-reported adherence explicitly.");
      return;
    }
    if (usage.some((entry) => entry.rawValue !== "" && !entry.reviewed)) {
      setError(
        "Review every entered bucket usage value for this outcome version.",
      );
      return;
    }
    if (
      usage.some(
        (entry) =>
          entry.rawValue === "" && (entry.sourceReference || entry.observedAt),
      )
    ) {
      setError("Enter a value for each sourced usage row, or clear the row.");
      return;
    }
    const entered = usage
      .filter((entry) => entry.rawValue !== "")
      .map((entry) => ({ ...entry, reviewed: true as const }));
    const remainingCapacity =
      remainingAmount === ""
        ? undefined
        : {
            amount: Number(remainingAmount),
            unit: remainingUnit,
            observedAt: remainingObservedAt,
            source: "manual" as const,
          };
    const input = {
      runOutcome,
      validationResult,
      adherence,
      ...(adherenceExplanation.trim()
        ? { adherenceExplanation: adherenceExplanation.trim() }
        : {}),
      unexpectedFailures: lines(failures),
      deferredWork: lines(deferred),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(remainingCapacity ? { remainingCapacity } : {}),
      usage: entered,
    };
    setPending(true);
    try {
      const response = await fetch("/governed/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrf,
          runId: history.link.id,
          input,
          ...(latest ? { predecessorId: latest.id, amendmentReason } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Could not save outcome");
      window.location.reload();
    } catch (failure) {
      setError((failure as Error).message);
      setPending(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="form-card"
      aria-label={
        latest ? "Append governed outcome amendment" : "Record governed outcome"
      }
    >
      <h2>
        {latest
          ? "Append a complete outcome amendment"
          : "Record factual outcome"}
      </h2>
      <p>
        Each version is a complete observation. Copied usage values must be
        reviewed again. Omitted usage is unknown; enter 0 only when explicitly
        observed.
      </p>
      {latest ? (
        <label>
          Amendment reason{" "}
          <input
            required
            value={amendmentReason}
            onChange={(event) => setAmendmentReason(event.target.value)}
          />
        </label>
      ) : null}
      <label>
        Run outcome{" "}
        <select
          value={runOutcome}
          onChange={(event) =>
            setRunOutcome(event.target.value as typeof runOutcome)
          }
        >
          <option>COMPLETED</option>
          <option>PARTIAL</option>
          <option>FAILED</option>
        </select>
      </label>
      <label>
        Independent validation result{" "}
        <select
          value={validationResult}
          onChange={(event) =>
            setValidationResult(event.target.value as typeof validationResult)
          }
        >
          <option>NOT_RUN</option>
          <option>PASSED</option>
          <option>PARTIAL</option>
          <option>FAILED</option>
          <option>INCONCLUSIVE</option>
        </select>
      </label>
      <label>
        Operator-reported adherence{" "}
        <select
          required
          value={adherence}
          onChange={(event) =>
            setAdherence(event.target.value as typeof adherence)
          }
        >
          <option value="">Choose explicitly</option>
          <option>FOLLOWED</option>
          <option>PARTIALLY_FOLLOWED</option>
          <option>NOT_FOLLOWED</option>
          <option>UNKNOWN</option>
        </select>
      </label>
      <label>
        Adherence explanation{" "}
        {adherence === "PARTIALLY_FOLLOWED" ? "(required)" : "(optional)"}
        <textarea
          required={adherence === "PARTIALLY_FOLLOWED"}
          value={adherenceExplanation}
          onChange={(event) => setAdherenceExplanation(event.target.value)}
        />
      </label>
      {history.link.authorizesWork ? null : (
        <p className="notice error">
          Original {history.link.decision} decision did not authorize work.
          Recording facts does not change that decision.
        </p>
      )}
      <label>
        Unexpected failures (one per line)
        <textarea
          value={failures}
          onChange={(event) => setFailures(event.target.value)}
        />
      </label>
      <label>
        Deferred work (one per line)
        <textarea
          value={deferred}
          onChange={(event) => setDeferred(event.target.value)}
        />
      </label>
      <label>
        Factual notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <fieldset>
        <legend>Optional factual remaining snapshot</legend>
        <label>
          Remaining amount{" "}
          <input
            type="number"
            min="0"
            step="any"
            value={remainingAmount}
            onChange={(event) => setRemainingAmount(event.target.value)}
          />
        </label>
        <label>
          Remaining unit{" "}
          <input
            value={remainingUnit}
            onChange={(event) => setRemainingUnit(event.target.value)}
          />
        </label>
        <label>
          Remaining observed at (ISO timestamp with offset){" "}
          <input
            value={remainingObservedAt}
            onChange={(event) => setRemainingObservedAt(event.target.value)}
          />
        </label>
      </fieldset>
      {bucketResults.map(({ bucket }) => (
        <fieldset key={bucket.bucketId}>
          <legend>
            {bucket.bucketId} · {bucket.providerId} · {bucket.capacityWindowId}{" "}
            · {bucket.resetCycleId}
          </legend>
          {categories.map((category) => {
            const row = usage.find(
              (entry) =>
                entry.bucketId === bucket.bucketId &&
                entry.category === category,
            );
            return (
              <div className="form-card" key={category}>
                <h3>{category}</h3>
                <label>
                  {category} actual (blank means unknown; 0 is explicit){" "}
                  <input
                    value={row?.rawValue ?? ""}
                    onChange={(event) =>
                      update(bucket.bucketId, category, {
                        rawValue: event.target.value,
                        reviewed: false,
                      })
                    }
                  />
                </label>
                <label>
                  Unit{" "}
                  <select
                    value={row?.rawUnit ?? "PERCENT"}
                    onChange={(event) =>
                      update(bucket.bucketId, category, {
                        rawUnit: event.target.value as
                          "PERCENT" | "BASIS_POINTS",
                        reviewed: false,
                      })
                    }
                  >
                    <option>PERCENT</option>
                    <option>BASIS_POINTS</option>
                  </select>
                </label>
                <label>
                  Factual source reference{" "}
                  <input
                    value={row?.sourceReference ?? ""}
                    onChange={(event) =>
                      update(bucket.bucketId, category, {
                        sourceReference: event.target.value,
                        reviewed: false,
                      })
                    }
                  />
                </label>
                <label>
                  Observed at (ISO timestamp with offset){" "}
                  <input
                    value={row?.observedAt ?? ""}
                    onChange={(event) =>
                      update(bucket.bucketId, category, {
                        observedAt: event.target.value,
                        reviewed: false,
                      })
                    }
                  />
                </label>
                <label>
                  Only this named window/reset cycle, no unexplained reset or
                  unrelated activity?
                  <select
                    value={row?.exactCycleOnly ?? "UNKNOWN"}
                    onChange={(event) =>
                      update(bucket.bucketId, category, {
                        exactCycleOnly: event.target.value as
                          "YES" | "NO" | "UNKNOWN",
                        reviewed: false,
                      })
                    }
                  >
                    <option>UNKNOWN</option>
                    <option>YES</option>
                    <option>NO</option>
                  </select>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={row?.reviewed ?? false}
                    onChange={(event) =>
                      update(bucket.bucketId, category, {
                        reviewed: event.target.checked,
                      })
                    }
                  />{" "}
                  I reviewed this exact manual value, source and cycle assertion
                  for this outcome version.
                </label>
              </div>
            );
          })}
        </fieldset>
      ))}
      {error ? (
        <p role="alert" className="notice error">
          {error}
        </p>
      ) : null}
      <button disabled={pending} type="submit">
        {latest ? "Append amendment" : "Save outcome"}
      </button>
    </form>
  );
}
