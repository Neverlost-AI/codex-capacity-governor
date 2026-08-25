"use server";

import {
  DevelopmentRunNotFoundError,
  DuplicateInitialOutcomeError,
  PreflightDraftNotFoundError,
  ProjectNotFoundError,
  ProjectPreflightMismatchError,
  StaleOutcomeAmendmentError,
} from "@capacity-governor/application";
import {
  createDevelopmentRunInputSchema,
  type ActualCapacityConsumptionInput,
  type AmendRunOutcomeInput,
  type RecordRunOutcomeInput,
  type ReservePreference,
} from "@capacity-governor/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getApplicationService } from "../server/application";
import {
  amendRunOutcomeFormSchema,
  localResetToIso,
  preflightFormSchema,
  projectFormSchema,
  runOutcomeFormSchema,
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

const actualConsumptionFrom = (data: {
  implementationAmount?: number;
  implementationUnit?: string;
  correctionAmount?: number;
  correctionUnit?: string;
  validationAmount?: number;
  validationUnit?: string;
  otherAmount?: number;
  otherUnit?: string;
}): ActualCapacityConsumptionInput[] => {
  const entries: ActualCapacityConsumptionInput[] = [];
  const add = (
    category: ActualCapacityConsumptionInput["category"],
    amount: number | undefined,
    unit: string | undefined,
  ) => {
    if (amount !== undefined && unit) {
      entries.push({ category, amount, unit, source: "manual" });
    }
  };
  add("IMPLEMENTATION", data.implementationAmount, data.implementationUnit);
  add("CORRECTION", data.correctionAmount, data.correctionUnit);
  add("VALIDATION", data.validationAmount, data.validationUnit);
  add("OTHER", data.otherAmount, data.otherUnit);
  return entries;
};

const outcomeInputFrom = <T extends { runId: string }>(
  data: T & {
    runOutcome: RecordRunOutcomeInput["runOutcome"];
    validationResult: RecordRunOutcomeInput["validationResult"];
    implementationAmount?: number;
    implementationUnit?: string;
    correctionAmount?: number;
    correctionUnit?: string;
    validationAmount?: number;
    validationUnit?: string;
    otherAmount?: number;
    otherUnit?: string;
    remainingAmount?: number;
    remainingUnit?: string;
    remainingObservedAt?: string;
    unexpectedFailures: string;
    deferredWork: string;
    notes?: string;
  },
) => ({
  runId: data.runId,
  runOutcome: data.runOutcome,
  validationResult: data.validationResult,
  actualConsumption: actualConsumptionFrom(data),
  remainingCapacity:
    data.remainingAmount !== undefined &&
    data.remainingUnit &&
    data.remainingObservedAt
      ? {
          amount: data.remainingAmount,
          unit: data.remainingUnit,
          observedAt: data.remainingObservedAt,
          source: "manual" as const,
        }
      : undefined,
  unexpectedFailures: splitLines(data.unexpectedFailures),
  deferredWork: splitLines(data.deferredWork),
  notes: data.notes,
});

export const createDevelopmentRunAction = async (
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> => {
  const values = formValues(formData);
  const result = createDevelopmentRunInputSchema.safeParse(values);
  if (!result.success) return zodState(result.error, values);

  let runId: string;
  try {
    runId = (
      await (await getApplicationService()).createDevelopmentRun(result.data)
    ).id;
  } catch (error) {
    if (
      error instanceof ProjectNotFoundError ||
      error instanceof PreflightDraftNotFoundError ||
      error instanceof ProjectPreflightMismatchError
    ) {
      return {
        status: "error",
        message:
          "This project and preflight are no longer available as a matching pair.",
        values,
      };
    }
    console.error("Development run creation failed", error);
    return failureState(values);
  }

  revalidatePath(`/projects/${result.data.projectId}`);
  redirect(`/projects/${result.data.projectId}/runs/${runId}`);
};

export const recordRunOutcomeAction = async (
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> => {
  const values = formValues(formData);
  const result = runOutcomeFormSchema.safeParse(values);
  if (!result.success) return zodState(result.error, values);

  const data = result.data;
  try {
    await (
      await getApplicationService()
    ).recordRunOutcome(outcomeInputFrom(data));
  } catch (error) {
    if (error instanceof DevelopmentRunNotFoundError) {
      return { status: "error", message: "This run no longer exists.", values };
    }
    if (error instanceof DuplicateInitialOutcomeError) {
      return {
        status: "error",
        message:
          "This run already has an outcome. Reopen it and append an amendment instead.",
        values,
      };
    }
    console.error("Run outcome save failed", error);
    return failureState(values);
  }

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath(`/projects/${data.projectId}/runs/${data.runId}`);
  return {
    status: "success",
    message: "Run outcome recorded.",
    values,
  };
};

export const amendRunOutcomeAction = async (
  _previous: FormActionState,
  formData: FormData,
): Promise<FormActionState> => {
  const values = formValues(formData);
  const result = amendRunOutcomeFormSchema.safeParse(values);
  if (!result.success) return zodState(result.error, values);

  const data = result.data;
  const input: AmendRunOutcomeInput = {
    ...outcomeInputFrom(data),
    expectedCurrentObservationId: data.expectedCurrentObservationId,
    amendmentReason: data.amendmentReason,
  };
  try {
    await (await getApplicationService()).amendRunOutcome(input);
  } catch (error) {
    if (error instanceof DevelopmentRunNotFoundError) {
      return { status: "error", message: "This run no longer exists.", values };
    }
    if (error instanceof StaleOutcomeAmendmentError) {
      return {
        status: "error",
        message:
          "A newer amendment was recorded. Reopen this run before trying again.",
        values,
      };
    }
    console.error("Run outcome amendment failed", error);
    return failureState(values);
  }

  revalidatePath(`/projects/${data.projectId}`);
  revalidatePath(`/projects/${data.projectId}/runs/${data.runId}`);
  return {
    status: "success",
    message:
      "Amendment appended. Earlier evidence remains in the audit history.",
    values,
  };
};
