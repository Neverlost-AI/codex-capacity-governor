"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="narrow-shell">
      <p className="eyebrow">Application error</p>
      <h1>Something went wrong while loading this page.</h1>
      <p>Try loading the page again.</p>
      <button className="button" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
