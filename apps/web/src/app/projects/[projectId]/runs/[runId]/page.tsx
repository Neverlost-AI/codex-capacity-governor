import { DevelopmentRunNotFoundError } from "@capacity-governor/application";
import { identifierSchema } from "@capacity-governor/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutcomeEvidence } from "../../../../../components/outcome-evidence";
import { RunOutcomeForm } from "../../../../../components/run-outcome-form";
import { getApplicationService } from "../../../../../server/application";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ projectId: string; runId: string }>;
}) {
  const { projectId, runId } = await params;
  if (
    !identifierSchema.safeParse(projectId).success ||
    !identifierSchema.safeParse(runId).success
  ) {
    notFound();
  }

  let history;
  try {
    history = await (await getApplicationService()).getRunHistory(runId);
  } catch (error) {
    if (error instanceof DevelopmentRunNotFoundError) notFound();
    return (
      <div className="narrow-shell">
        <Link className="back-link" href={`/projects/${projectId}`}>
          ← Project
        </Link>
        <div className="notice error" role="alert">
          This run history could not be loaded. Confirm the database connection
          and try again.
        </div>
      </div>
    );
  }
  if (history.run.projectId !== projectId) notFound();

  return (
    <div className="page-shell project-page">
      <Link className="back-link" href={`/projects/${projectId}`}>
        ← Project
      </Link>
      <header className="project-heading">
        <div>
          <p className="eyebrow">Run and outcome history</p>
          <h1>Unguided development run</h1>
          <p>
            This run is explicitly <strong>UNGUIDED</strong>. No Governor plan,
            forecast, recommendation, or policy decision exists for it.
          </p>
        </div>
        <span className="draft-badge new">UNGUIDED</span>
      </header>

      {history.observations.length ? (
        <section
          aria-labelledby="audit-history-heading"
          className="audit-section"
        >
          <div className="section-heading">
            <h2 id="audit-history-heading">Outcome audit history</h2>
            <p>
              Every observation is retained. The final card is the current
              recorded view; earlier evidence is never overwritten.
            </p>
          </div>
          <div className="outcome-history">
            {history.observations.map((entry) => (
              <OutcomeEvidence
                entry={entry}
                isCurrent={
                  entry.observation.id ===
                  history.currentOutcome?.observation.id
                }
                key={entry.observation.id}
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="notice">
          This run exists, but no outcome observation has been recorded yet.
        </p>
      )}

      <RunOutcomeForm
        current={history.currentOutcome}
        key={history.currentOutcome?.observation.id ?? "initial"}
        projectId={projectId}
        runId={runId}
      />
    </div>
  );
}
