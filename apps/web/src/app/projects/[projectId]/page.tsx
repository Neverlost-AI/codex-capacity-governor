import { ProjectNotFoundError } from "@capacity-governor/application";
import { identifierSchema } from "@capacity-governor/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PreflightForm } from "../../../components/preflight-form";
import { getApplicationService } from "../../../server/application";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (!identifierSchema.safeParse(projectId).success) notFound();

  let result;
  try {
    result = await (await getApplicationService()).getProject(projectId);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) notFound();
    return (
      <div className="narrow-shell">
        <Link className="back-link" href="/">
          ← Projects
        </Link>
        <div className="notice error" role="alert">
          This project could not be loaded. Confirm the database connection and
          try again.
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell project-page">
      <Link className="back-link" href="/">
        ← Projects
      </Link>
      <header className="project-heading">
        <div>
          <p className="eyebrow">Manual preflight draft</p>
          <h1>{result.project.name}</h1>
          {result.project.description ? (
            <p>{result.project.description}</p>
          ) : null}
        </div>
        <span
          className={`draft-badge ${result.preflightDraft ? "saved" : "new"}`}
        >
          {result.preflightDraft ? "Saved draft" : "Not yet saved"}
        </span>
      </header>
      <PreflightForm draft={result.preflightDraft} projectId={projectId} />
    </div>
  );
}
