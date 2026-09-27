"use client";
import { CsrfField } from "./local-session";

import { useActionState } from "react";
import { createDevelopmentRunAction } from "../app/actions";
import { initialFormState } from "../app/form-state";
import { SubmitButton } from "./form-controls";

export const CreateRunForm = ({
  preflightDraftId,
  projectId,
}: {
  preflightDraftId: string;
  projectId: string;
}) => {
  const [state, action] = useActionState(
    createDevelopmentRunAction,
    initialFormState,
  );

  return (
    <form action={action} className="create-run-card">
      <CsrfField />
      <input name="projectId" type="hidden" value={projectId} />
      <input name="preflightDraftId" type="hidden" value={preflightDraftId} />
      <div>
        <h2>Create an unguided development run</h2>
        <p>
          This run will be recorded as <strong>UNGUIDED</strong>. No Governor
          plan, forecast, recommendation, or policy decision exists for it.
        </p>
      </div>
      {state.message ? (
        <p className="notice error" role="alert">
          {state.message}
        </p>
      ) : null}
      <SubmitButton>Create unguided run</SubmitButton>
    </form>
  );
};
