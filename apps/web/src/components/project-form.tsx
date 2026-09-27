"use client";
import { CsrfField } from "./local-session";

import { useActionState } from "react";
import { createProjectAction } from "../app/actions";
import { initialFormState, type FormActionState } from "../app/form-state";
import { FieldError, SubmitButton } from "./form-controls";

export const ProjectFormFields = ({ state }: { state: FormActionState }) => (
  <>
    {state.message ? (
      <div
        className={`notice ${state.status}`}
        role={state.status === "error" ? "alert" : "status"}
      >
        {state.message}
      </div>
    ) : null}

    <div className="field">
      <label htmlFor="name">Project name</label>
      <input
        aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
        aria-invalid={Boolean(state.fieldErrors?.name)}
        defaultValue={state.values?.name}
        id="name"
        name="name"
        required
      />
      <FieldError errors={state.fieldErrors?.name} id="name-error" />
    </div>

    <div className="field">
      <label htmlFor="description">
        Project description <span>(optional)</span>
      </label>
      <textarea
        defaultValue={state.values?.description}
        id="description"
        name="description"
        rows={4}
      />
    </div>
  </>
);

export const ProjectForm = () => {
  const [state, action] = useActionState(createProjectAction, initialFormState);
  return (
    <form action={action} className="form-card" noValidate>
      <CsrfField />
      <ProjectFormFields state={state} />
      <SubmitButton>Create project</SubmitButton>
    </form>
  );
};
