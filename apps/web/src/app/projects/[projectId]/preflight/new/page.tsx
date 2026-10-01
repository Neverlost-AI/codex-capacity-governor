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
  await (await getApplicationService()).getProject(projectId);
  return (
    <div className="narrow-shell">
      <Link href={`/projects/${projectId}`}>Back to project</Link>
      <ComposedForm projectId={projectId} />
    </div>
  );
}
