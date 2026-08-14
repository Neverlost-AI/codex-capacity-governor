import { describe, expect, it } from "vitest";
import {
  localResetToIso,
  preflightFormSchema,
  splitLines,
} from "./form-schema";

const validForm = {
  projectId: "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2",
  title: "Manual preflight",
  brief: "Bounded work",
  explicitExclusions: "Forecasting",
  acceptanceCriteria: "Draft reopens",
  budgetAmount: "120",
  budgetUnit: "manual units",
  resetAtLocal: "2026-08-15T09:00",
  resetTimezone: "America/Denver",
  resetNotes: "",
  correctionMinimumAmount: "10",
  correctionMinimumUnit: "manual units",
  correctionTargetShare: "0.1",
  validationMinimumAmount: "",
  validationMinimumUnit: "",
  validationTargetShare: "",
  assumptions: "One\n\nTwo",
  openQuestions: "",
};

describe("preflight form boundary", () => {
  it("parses structural manual inputs without policy interpretation", () => {
    const result = preflightFormSchema.parse(validForm);
    expect(result.budgetAmount).toBe(120);
    expect(result.correctionTargetShare).toBe(0.1);
    expect(result.validationMinimumAmount).toBeUndefined();
  });

  it.each([
    ["negative budget", { budgetAmount: "-1" }],
    ["malformed budget", { budgetAmount: "one hundred" }],
    ["invalid timezone", { resetTimezone: "Mountain time" }],
    ["invalid reset", { resetAtLocal: "not-a-date" }],
    ["share over one", { correctionTargetShare: "1.2" }],
    ["minimum without unit", { correctionMinimumUnit: "" }],
  ])("rejects %s", (_label, patch) => {
    expect(
      preflightFormSchema.safeParse({ ...validForm, ...patch }).success,
    ).toBe(false);
  });

  it("normalizes a local reset using the entered timezone", () => {
    expect(localResetToIso("2026-08-15T09:00", "America/Denver")).toBe(
      "2026-08-15T15:00:00.000Z",
    );
  });

  it("splits line-oriented fields without empty records", () => {
    expect(splitLines(" One \n\n Two ")).toEqual(["One", "Two"]);
  });
});
