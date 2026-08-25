import { ProjectNotFoundError } from "@capacity-governor/application";
import { identifierSchema } from "@capacity-governor/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateRunForm } from "../../../components/create-run-form";
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
  let runs;
  try {
    const service = await getApplicationService();
    [result, runs] = await Promise.all([
      service.getProject(projectId),
      service.listProjectRuns(projectId),
    ]);
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
      <section
        aria-labelledby="run-history-heading"
        className="run-history-section"
      >
        <div className="section-heading">
          <p className="eyebrow">Factual execution evidence</p>
          <h2 id="run-history-heading">Development run history</h2>
          <p>
            Runs recorded here are unguided. They contain no forecast,
            affordability result, operating mode, or Governor decision.
          </p>
        </div>
        {result.preflightDraft ? (
          <CreateRunForm
            preflightDraftId={result.preflightDraft.id}
            projectId={projectId}
          />
        ) : (
          <p className="notice">
            Save the manual preflight draft before creating a development run.
          </p>
        )}
        {runs.length ? (
          <ol className="run-list">
            {runs.map(({ run, latestOutcome }) => (
              <li key={run.id}>
                <Link href={`/projects/${projectId}/runs/${run.id}`}>
                  <span>
                    <strong>UNGUIDED run</strong>
                    <small>{new Date(run.createdAt).toLocaleString()}</small>
                  </span>
                  <span className="run-status">
                    {latestOutcome
                      ? `${latestOutcome.observation.runOutcome} · ${latestOutcome.observation.validationResult}`
                      : "Outcome not recorded"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-state">No development runs recorded yet.</p>
        )}
      </section>
    </div>
  );
}
