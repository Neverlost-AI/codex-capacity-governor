import { DateTime } from "luxon";
import { z } from "zod";

const requiredText = z.string().trim().min(1, "Required");
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined);

const requiredNonNegativeNumber = z
  .string()
  .trim()
  .min(1, "Required")
  .transform(Number)
  .refine(Number.isFinite, "Enter a valid number")
  .refine((value) => value >= 0, "Must be zero or greater");

const optionalNonNegativeNumber = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : Number(value)))
  .refine(
    (value) => value === undefined || Number.isFinite(value),
    "Enter a valid number",
  )
  .refine(
    (value) => value === undefined || value >= 0,
    "Must be zero or greater",
  );

const optionalShare = optionalNonNegativeNumber.refine(
  (value) => value === undefined || value <= 1,
  "Enter a value from 0 to 1",
);

const validTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const projectFormSchema = z.object({
  name: requiredText,
  description: optionalText,
});

export const preflightFormSchema = z
  .object({
    projectId: z.uuid("Invalid project identifier"),
    title: requiredText,
    brief: requiredText,
    explicitExclusions: z.string(),
    acceptanceCriteria: z.string(),
    budgetAmount: requiredNonNegativeNumber,
    budgetUnit: requiredText,
    resetAtLocal: z.string().trim(),
    resetTimezone: requiredText.refine(
      validTimezone,
      "Use a valid IANA timezone",
    ),
    resetNotes: optionalText,
    correctionMinimumAmount: optionalNonNegativeNumber,
    correctionMinimumUnit: optionalText,
    correctionTargetShare: optionalShare,
    validationMinimumAmount: optionalNonNegativeNumber,
    validationMinimumUnit: optionalText,
    validationTargetShare: optionalShare,
    assumptions: z.string(),
    openQuestions: z.string(),
  })
  .superRefine((value, context) => {
    const validatePair = (
      amount: number | undefined,
      unit: string | undefined,
      amountPath: string,
      unitPath: string,
    ) => {
      if (amount !== undefined && !unit) {
        context.addIssue({
          code: "custom",
          message: "Add a unit for this minimum",
          path: [unitPath],
        });
      }
      if (amount === undefined && unit) {
        context.addIssue({
          code: "custom",
          message: "Add an amount for this minimum",
          path: [amountPath],
        });
      }
    };

    validatePair(
      value.correctionMinimumAmount,
      value.correctionMinimumUnit,
      "correctionMinimumAmount",
      "correctionMinimumUnit",
    );
    validatePair(
      value.validationMinimumAmount,
      value.validationMinimumUnit,
      "validationMinimumAmount",
      "validationMinimumUnit",
    );

    if (
      value.resetAtLocal &&
      !DateTime.fromISO(value.resetAtLocal, { zone: value.resetTimezone })
        .isValid
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid reset date and time",
        path: ["resetAtLocal"],
      });
    }
  });

const runOutcomeFormFields = z.object({
  projectId: z.uuid("Invalid project identifier"),
  runId: z.uuid("Invalid run identifier"),
  runOutcome: z.enum(["COMPLETED", "PARTIAL", "FAILED"]),
  validationResult: z.enum([
    "NOT_RUN",
    "PASSED",
    "PARTIAL",
    "FAILED",
    "INCONCLUSIVE",
  ]),
  implementationAmount: optionalNonNegativeNumber,
  implementationUnit: optionalText,
  correctionAmount: optionalNonNegativeNumber,
  correctionUnit: optionalText,
  validationAmount: optionalNonNegativeNumber,
  validationUnit: optionalText,
  otherAmount: optionalNonNegativeNumber,
  otherUnit: optionalText,
  remainingAmount: optionalNonNegativeNumber,
  remainingUnit: optionalText,
  remainingObservedAt: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .refine(
      (value) =>
        value === undefined ||
        z.iso.datetime({ offset: true }).safeParse(value).success,
      "Use an ISO date and time with an explicit offset",
    ),
  unexpectedFailures: z.string(),
  deferredWork: z.string(),
  notes: optionalText,
});

type RunOutcomeFormFields = z.infer<typeof runOutcomeFormFields>;

const validateRunOutcomeFields = (
  value: RunOutcomeFormFields,
  context: z.RefinementCtx,
) => {
  const validatePair = (
    amount: number | undefined,
    unit: string | undefined,
    amountPath: keyof RunOutcomeFormFields,
    unitPath: keyof RunOutcomeFormFields,
  ) => {
    if (amount !== undefined && !unit) {
      context.addIssue({
        code: "custom",
        message: "Add a unit for this amount",
        path: [unitPath],
      });
    }
    if (amount === undefined && unit) {
      context.addIssue({
        code: "custom",
        message: "Add an amount for this unit",
        path: [amountPath],
      });
    }
  };

  validatePair(
    value.implementationAmount,
    value.implementationUnit,
    "implementationAmount",
    "implementationUnit",
  );
  validatePair(
    value.correctionAmount,
    value.correctionUnit,
    "correctionAmount",
    "correctionUnit",
  );
  validatePair(
    value.validationAmount,
    value.validationUnit,
    "validationAmount",
    "validationUnit",
  );
  validatePair(value.otherAmount, value.otherUnit, "otherAmount", "otherUnit");

  const remainingValues = [
    value.remainingAmount,
    value.remainingUnit,
    value.remainingObservedAt,
  ];
  const suppliedRemainingValues = remainingValues.filter(
    (entry) => entry !== undefined,
  ).length;
  if (suppliedRemainingValues > 0 && suppliedRemainingValues < 3) {
    if (value.remainingAmount === undefined) {
      context.addIssue({
        code: "custom",
        message: "Add the observed remaining amount",
        path: ["remainingAmount"],
      });
    }
    if (!value.remainingUnit) {
      context.addIssue({
        code: "custom",
        message: "Add the observed remaining unit",
        path: ["remainingUnit"],
      });
    }
    if (!value.remainingObservedAt) {
      context.addIssue({
        code: "custom",
        message: "Add the observation time",
        path: ["remainingObservedAt"],
      });
    }
  }
};

export const runOutcomeFormSchema = runOutcomeFormFields.superRefine(
  validateRunOutcomeFields,
);

export const amendRunOutcomeFormSchema = runOutcomeFormFields
  .extend({
    expectedCurrentObservationId: z.uuid(
      "Invalid current outcome observation identifier",
    ),
    amendmentReason: requiredText,
  })
  .superRefine(validateRunOutcomeFields);

export const splitLines = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export const localResetToIso = (
  localValue: string,
  timezone: string,
): string | undefined => {
  if (!localValue) {
    return undefined;
  }
  return (
    DateTime.fromISO(localValue, { zone: timezone }).toUTC().toISO() ??
    undefined
  );
};
