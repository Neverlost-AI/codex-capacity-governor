import Link from "next/link";
import { ProjectForm } from "../../../components/project-form";

export default function NewProjectPage() {
  return (
    <div className="narrow-shell">
      <Link className="back-link" href="/">
        ← Projects
      </Link>
      <div className="page-intro">
        <p className="eyebrow">New workspace</p>
        <h1>Create a project</h1>
        <p>
          After creating the project, describe the work, enter each required
          capacity window, and review your answers.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}
