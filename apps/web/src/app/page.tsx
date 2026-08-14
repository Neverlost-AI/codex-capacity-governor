import type { Project } from "@capacity-governor/contracts";
import Link from "next/link";
import { getApplicationService } from "../server/application";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let projects: Project[];
  let loadError = false;
  try {
    projects = await (await getApplicationService()).listProjects();
  } catch {
    projects = [];
    loadError = true;
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Codex-first resource governance</p>
          <h1>Bound the work before the work begins.</h1>
          <p className="hero-copy">
            Create a project and preserve a manual preflight draft. Forecasting
            and Governor policy are intentionally not active in this tranche.
          </p>
        </div>
        <Link className="button" href="/projects/new">
          Create project
        </Link>
      </section>

      <section aria-labelledby="projects-heading" className="content-section">
        <div className="content-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2 id="projects-heading">Projects</h2>
          </div>
          <p>{projects.length} saved</p>
        </div>

        {loadError ? (
          <div className="notice error" role="alert">
            Projects could not be loaded. Confirm that `DATABASE_URL` is
            configured and the database is available, then reload this page.
          </div>
        ) : null}

        {!loadError && projects.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon" aria-hidden="true">
              01
            </p>
            <h3>No projects yet</h3>
            <p>
              Create the first project to begin a bounded manual preflight
              draft.
            </p>
            <Link href="/projects/new">Create your first project →</Link>
          </div>
        ) : null}

        <div className="project-grid">
          {projects.map((project) => (
            <Link
              className="project-card"
              href={`/projects/${project.id}`}
              key={project.id}
            >
              <span className="project-arrow" aria-hidden="true">
                ↗
              </span>
              <h3>{project.name}</h3>
              <p>{project.description || "No project description"}</p>
              <small>
                Updated{" "}
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                }).format(new Date(project.updatedAt))}
              </small>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
