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
