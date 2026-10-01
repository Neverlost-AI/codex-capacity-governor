import { ProjectNotFoundError } from "@capacity-governor/application";
import { identifierSchema } from "@capacity-governor/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateRunForm } from "../../../components/create-run-form";
import { PreflightForm } from "../../../components/preflight-form";
import { getApplicationService } from "../../../server/application";
import { getComposedService } from "../../../server/composed-application";
import { getGovernedService } from "../../../server/governed-application";

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
  let evaluations;
  let governed;
  try {
    const service = await getApplicationService();
    [result, runs, evaluations, governed] = await Promise.all([
      service.getProject(projectId),
      service.listProjectRuns(projectId),
      (await getComposedService()).list(projectId),
      (await getGovernedService()).list(projectId),
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
          <p className="eyebrow">Capacity Governor project</p>
          <h1>{result.project.name}</h1>
          {result.project.description ? (
            <p>{result.project.description}</p>
          ) : null}
        </div>
      </header>
      <section aria-labelledby="composed-heading">
        <h2 id="composed-heading">Capacity preflight</h2>
        <p>
          Start with your work, enter each required capacity window, then review
          and confirm the exact inputs before an evaluation is saved.
        </p>
        <Link href={`/projects/${projectId}/preflight/new`}>
          Start capacity preflight
        </Link>
        <h3>Historical saved evaluations</h3>
        <ul>
          {evaluations.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/projects/${projectId}/preflight/results/${attempt.id}`}
              >
                {attempt.revision.input.title} · {attempt.evaluationTime} ·{" "}
                {attempt.policy?.kind === "POLICY_EVALUATION"
                  ? attempt.policy.aggregateDecision
                  : (attempt.policy?.kind ??
                    (attempt.forecast.kind === "INPUT_REJECTION"
                      ? "INPUT_REJECTION"
                      : "NOT_COMPOSABLE"))}
              </Link>
            </li>
          ))}
        </ul>
        <h3>Governed bounded runs</h3>
        <p>
          Each link records an exact historical attempt; it does not refresh
          guidance. Later preflights remain cold-start.
        </p>
        <ul>
          {governed.map((history) => (
            <li key={history.link.id}>
              <Link href={`/projects/${projectId}/governed/${history.link.id}`}>
                {history.attempt.revision.input.title} · {history.link.decision}{" "}
                · {history.observations.at(-1)?.runOutcome ?? "outcome unknown"}
              </Link>
              {!history.link.authorizesWork
                ? " · work recorded despite non-authorizing decision"
                : ""}
            </li>
          ))}
        </ul>
      </section>
      <details className="legacy-history">
        <summary>Earlier manual drafts and unguided runs</summary>
        <p>
          These records are separate from the reviewed capacity preflight. Draft
          amounts are not converted into capacity window evidence.
        </p>
        <span className={`draft-badge ${result.preflightDraft ? "saved" : "new"}`}>
          {result.preflightDraft ? "Saved draft" : "No saved draft"}
        </span>
        <PreflightForm draft={result.preflightDraft} projectId={projectId} />
        <section
          aria-labelledby="run-history-heading"
          className="run-history-section"
        >
        <div className="section-heading">
          <p className="eyebrow">Factual execution evidence</p>
          <h2 id="run-history-heading">Development run history</h2>
          <p>
            The legacy runs below remain unguided. They contain no forecast,
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
      </details>
    </div>
  );
}
