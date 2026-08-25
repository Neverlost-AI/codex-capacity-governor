"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="narrow-shell">
      <p className="eyebrow">Application error</p>
      <h1>Something interrupted this draft.</h1>
      <p>
        Your previous saved values remain in the database. Try loading the page
        again.
      </p>
      <button className="button" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
