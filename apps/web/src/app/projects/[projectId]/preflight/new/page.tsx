import Link from "next/link";
import { getApplicationService } from "../../../../../server/application";
import { ComposedForm } from "../../../../../components/composed-form";
export const dynamic = "force-dynamic";
export default async function NewPreflight({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const result = await (await getApplicationService()).getProject(projectId);
  return (
    <div className="narrow-shell">
      <Link href={`/projects/${projectId}`}>Back to project</Link>
      {result.preflightDraft ? (
        <ComposedForm projectId={projectId} draft={result.preflightDraft} />
      ) : (
        <p>
          Save a manual structural draft before creating a composed preflight
          revision.
        </p>
      )}
    </div>
  );
}
