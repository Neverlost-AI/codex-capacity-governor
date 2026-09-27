import Link from "next/link";
import { requireLocalAccess } from "../../../../../../server/access";
import { ReviewConfirmation } from "../../../../../../components/review-confirmation";
import { PlanningDisclosure } from "../../../../../../components/planning-disclosure";
export const dynamic = "force-dynamic";
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ projectId: string; revisionId: string }>;
}) {
  const { projectId, revisionId } = await params;
  const { cookie, boundary } = await requireLocalAccess();
  let review;
  try {
    review = boundary.pending(cookie, revisionId);
    if (review.revision.input.projectId !== projectId)
      throw new Error("Wrong project");
  } catch {
    review = undefined;
  }
  if (!review)
    return (
      <div className="narrow-shell">
        <h1>Review unavailable</h1>
        <p role="alert">
          This review expired, was replaced, or belongs to another
          session/project. No evaluation has been saved by this request.
        </p>
        <Link href={`/projects/${projectId}/preflight/new`}>
          Review inputs again
        </Link>
      </div>
    );
  return (
    <div className="narrow-shell">
      <h1>Review exact frozen inputs</h1>
      <PlanningDisclosure />
      <p>
        Revision {revisionId}. Canonical digest {review.digest}. Minimum
        coherent scope:{" "}
        {review.revision.input.minimumCoherentScope ? "Yes" : "No"}.
      </p>
      <h2>Exact required bucket membership</h2>
      <ul>
        {review.revision.input.buckets.map((bucket) => (
          <li key={bucket.bucketId}>
            {bucket.bucketId} · {bucket.providerId} / {bucket.capacityWindowId}{" "}
            / {bucket.resetCycleId}
          </li>
        ))}
      </ul>
      <h2>All material inputs and accepted configurations</h2>
      <pre
        className="evidence-json"
        tabIndex={0}
        aria-label="Complete reviewed evidence"
      >
        {JSON.stringify(review.revision, null, 2)}
      </pre>
      <ReviewConfirmation
        revisionId={revisionId}
        challenge={review.challenge}
      />
      <Link href={`/projects/${projectId}/preflight/new`}>
        Edit through a new reviewed revision
      </Link>
    </div>
  );
}
