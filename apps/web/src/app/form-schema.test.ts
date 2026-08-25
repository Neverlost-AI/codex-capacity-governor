import { describe, expect, it } from "vitest";
import {
  amendRunOutcomeFormSchema,
  localResetToIso,
  preflightFormSchema,
  runOutcomeFormSchema,
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

const validOutcomeForm = {
  projectId: "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2",
  runId: "04877823-b6d4-4b1d-bde2-91bd4f18f3dc",
  runOutcome: "PARTIAL",
  validationResult: "INCONCLUSIVE",
  implementationAmount: "12.5",
  implementationUnit: "manual units",
  correctionAmount: "",
  correctionUnit: "",
  validationAmount: "2",
  validationUnit: "manual units",
  otherAmount: "",
  otherUnit: "",
  remainingAmount: "48",
  remainingUnit: "observed units",
  remainingObservedAt: "2026-08-24T12:00:00-06:00",
  unexpectedFailures: "Network interruption",
  deferredWork: "Nonessential polish",
  notes: "Manually observed evidence",
};

describe("run outcome form boundary", () => {
  it("parses independent factual statuses and manual capacity evidence", () => {
    const result = runOutcomeFormSchema.parse(validOutcomeForm);

    expect(result.runOutcome).toBe("PARTIAL");
    expect(result.validationResult).toBe("INCONCLUSIVE");
    expect(result.implementationAmount).toBe(12.5);
    expect(result.correctionAmount).toBeUndefined();
    expect(result.remainingAmount).toBe(48);
  });

  it.each([
    ["invalid outcome", { runOutcome: "DEFER" }],
    ["invalid validation result", { validationResult: "UNKNOWN" }],
    ["negative consumption", { implementationAmount: "-1" }],
    ["amount without unit", { implementationUnit: "" }],
    ["unit without amount", { correctionUnit: "manual units" }],
    ["partial remaining snapshot", { remainingObservedAt: "" }],
    [
      "observation without offset",
      { remainingObservedAt: "2026-08-24T12:00:00" },
    ],
  ])("rejects %s", (_label, patch) => {
    expect(
      runOutcomeFormSchema.safeParse({ ...validOutcomeForm, ...patch }).success,
    ).toBe(false);
  });

  it("requires a reason for an append-only amendment", () => {
    expect(
      amendRunOutcomeFormSchema.safeParse({
        ...validOutcomeForm,
        expectedCurrentObservationId: "9fa31c3a-e5cb-48d5-9cd8-ff7247281bc1",
        amendmentReason: "",
      }).success,
    ).toBe(false);
  });
});
