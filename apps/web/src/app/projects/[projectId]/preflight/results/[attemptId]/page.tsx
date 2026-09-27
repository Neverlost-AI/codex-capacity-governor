import Link from "next/link";
import { getComposedService } from "../../../../../../server/composed-application";
import { requireLocalAccess } from "../../../../../../server/access";
import { ComposedResult } from "../../../../../../components/composed-result";
export const dynamic = "force-dynamic";
export default async function ResultPage({
  params,
}: {
  params: Promise<{ projectId: string; attemptId: string }>;
}) {
  const { projectId, attemptId } = await params;
  await requireLocalAccess();
  let attempt;
  try {
    attempt = await (await getComposedService()).reopen(projectId, attemptId);
  } catch {
    attempt = undefined;
  }
  if (!attempt)
    return (
      <div className="narrow-shell">
        <h1>Saved evidence unavailable</h1>
        <p role="alert">
          Stored evidence integrity, ownership or database access could not be
          established. This is not an authorizing result; no repair or fresh
          evaluation occurred.
        </p>
        <Link href={`/projects/${projectId}`}>Back to project</Link>
      </div>
    );
  return (
    <div className="narrow-shell">
      <Link href={`/projects/${projectId}`}>Back to project</Link>
      <ComposedResult attempt={attempt} />
      <Link href={`/projects/${projectId}/preflight/new`}>
        Create a new reviewed evaluation
      </Link>
    </div>
  );
}
