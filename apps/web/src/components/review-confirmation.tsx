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
    <form onSubmit={submit}>
      <CsrfField />
      {error ? (
        <p ref={summary} tabIndex={-1} role="alert">
          {error}
        </p>
      ) : null}
      <label>
        <input name="work" type="checkbox" required />I explicitly confirm all
        reviewed work inputs.
      </label>
      <label>
        <input name="buckets" type="checkbox" required />I explicitly confirm
        this exact required bucket set.
      </label>
      <p>
        Confirmation does not refresh observation times. The separate
        minimum-coherent-scope answer remains exactly as reviewed.
      </p>
      <button type="submit" disabled={pending}>
        {pending ? "Evaluating and saving…" : "Confirm, evaluate and save"}
      </button>
    </form>
  );
}
