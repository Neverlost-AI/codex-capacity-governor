"use server";

import { ProjectNotFoundError } from "@capacity-governor/application";
import type { ReservePreference } from "@capacity-governor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getApplicationService } from "../server/application";
import {
  localResetToIso,
  preflightFormSchema,
  projectFormSchema,
  splitLines,
} from "./form-schema";
import type { FormActionState } from "./form-state";

const formValues = (formData: FormData): Record<string, string> =>
  Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [
      key,
      typeof value === "string" ? value : "",
    ]),
  );

const zodState = (
  error: ZodError,
  values: Record<string, string>,
): FormActionState => ({
  status: "error",
  message: "Check the highlighted fields and try again.",
  fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  values,
});

const failureState = (values: Record<string, string>): FormActionState => ({
  status: "error",
  message:
    "We could not save your changes. Check the database connection and try again.",
  values,
});

const reserveFrom = (
  amount: number | undefined,
  unit: string | undefined,
  targetShare: number | undefined,
): ReservePreference | undefined => {
  if (amount === undefined && targetShare === undefined) {
    return undefined;
  }
  return {
    minimum:
      amount === undefined || !unit
        ? undefined
        : { amount, unit, source: "manual" as const },
    targetShare,
  };
};

export const createProjectAction = async (
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> => {
  const values = formValues(formData);
  const result = projectFormSchema.safeParse(values);
  if (!result.success) {
    return zodState(result.error, values);
  }

  let projectId: string;
  try {
    const service = await getApplicationService();
    projectId = (await service.createProject(result.data)).id;
  } catch (error) {
    console.error("Project creation failed", error);
    return failureState(values);
  }

  revalidatePath("/");
  redirect(`/projects/${projectId}`);
};

export const savePreflightAction = async (
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> => {
  const values = formValues(formData);
  const result = preflightFormSchema.safeParse(values);
  if (!result.success) {
    return zodState(result.error, values);
  }

  const data = result.data;
  try {
    const service = await getApplicationService();
    await service.savePreflightDraft({
      projectId: data.projectId,
      tranche: {
        title: data.title,
        brief: data.brief,
        explicitExclusions: splitLines(data.explicitExclusions),
        acceptanceCriteria: splitLines(data.acceptanceCriteria),
      },
      availableBudget: {
        amount: data.budgetAmount,
        unit: data.budgetUnit,
        source: "manual",
      },
      reset: {
        resetsAt: localResetToIso(data.resetAtLocal, data.resetTimezone),
        timezone: data.resetTimezone,
        notes: data.resetNotes,
      },
      correctionReserve: reserveFrom(
        data.correctionMinimumAmount,
        data.correctionMinimumUnit,
        data.correctionTargetShare,
      ),
      validationReserve: reserveFrom(
        data.validationMinimumAmount,
        data.validationMinimumUnit,
        data.validationTargetShare,
      ),
      assumptions: splitLines(data.assumptions),
      openQuestions: splitLines(data.openQuestions),
    });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return {
        status: "error",
        message: "This project no longer exists.",
        values,
      };
    }
    console.error("Preflight draft save failed", error);
    return failureState(values);
  }

  revalidatePath("/");
  revalidatePath(`/projects/${data.projectId}`);
  return {
    status: "success",
    message: "Manual preflight draft saved.",
    values,
  };
};
