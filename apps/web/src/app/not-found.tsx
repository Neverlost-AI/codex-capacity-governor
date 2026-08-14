import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="narrow-shell">
      <p className="eyebrow">Not found</p>
      <h1>That project is not available.</h1>
      <p>It may have been removed or the address may be incomplete.</p>
      <Link className="button" href="/">
        Return to projects
      </Link>
    </div>
  );
}
