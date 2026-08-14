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
          A project groups the bounded manual preflight draft you will create
          next.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}
