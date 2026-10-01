"use client";
import { useState, useRef, type FormEvent } from "react";
import { CsrfField } from "./local-session";
export function ReviewConfirmation({
  revisionId,
  challenge,
}: {
  revisionId: string;
  challenge: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const summary = useRef<HTMLParagraphElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/preflight/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrf: form.get("csrf"),
          revisionId,
          challenge,
          confirmedWorkInputs: form.get("work") === "on",
          confirmedRequiredBuckets: form.get("buckets") === "on",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.resultUrl);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No saved result. Retry or review again.",
      );
      setPending(false);
      requestAnimationFrame(() => summary.current?.focus());
    }
  };
  return (
    <form onSubmit={submit} className="confirmation-form form-section">
      <CsrfField />
      <h2>Confirm these exact inputs</h2>
      {error ? (
        <p ref={summary} tabIndex={-1} role="alert">
          {error}
        </p>
      ) : null}
      <label className="check-row">
        <input name="work" type="checkbox" required />I confirm the work description and planning details above.
      </label>
      <label className="check-row">
        <input name="buckets" type="checkbox" required />I confirm these are all required capacity windows and the readings are exact.
      </label>
      <p>
        Confirmation does not refresh the reading times. Your answer about the
        smallest complete scope stays as reviewed.
      </p>
      <button type="submit" disabled={pending}>
        {pending ? "Evaluating and saving…" : "Confirm, evaluate and save"}
      </button>
    </form>
  );
}
