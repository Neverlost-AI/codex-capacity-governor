import Link from "next/link";
import { requireLocalAccess } from "../../../../../../server/access";
import { ReviewConfirmation } from "../../../../../../components/review-confirmation";
import { PlanningDisclosure } from "../../../../../../components/planning-disclosure";
import { ComposedReview } from "../../../../../../components/composed-review";
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
    review = await boundary.pending(cookie, revisionId);
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
      <nav aria-label="Preflight steps"><ol className="preflight-steps"><li>1. Work</li><li>2. Capacity</li><li aria-current="step">3. Review</li></ol></nav>
      <h1>Review your preflight</h1>
      <PlanningDisclosure />
      <ComposedReview revision={review.revision} digest={review.digest} />
      <ReviewConfirmation
        revisionId={revisionId}
        challenge={review.challenge}
      />
      <Link href={`/projects/${projectId}/preflight/new`}>
        Edit work or capacity in a new review
      </Link>
    </div>
  );
}
