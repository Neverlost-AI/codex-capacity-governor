import { describe, expect, it } from "vitest";
import {
  createProjectInputSchema,
  preflightDraftSchema,
  savePreflightDraftInputSchema,
} from "../src/index";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";

const validInput = {
  projectId,
  tranche: {
    title: "Manual preflight",
    brief: "Create and reopen one bounded draft.",
    explicitExclusions: ["Forecasting"],
    acceptanceCriteria: ["Draft reopens"],
  },
  availableBudget: {
    amount: 120,
    unit: "manual units",
    source: "manual" as const,
  },
  reset: {
    resetsAt: "2026-08-15T15:00:00.000Z",
    timezone: "America/Denver",
  },
  correctionReserve: {
    minimum: { amount: 10, unit: "manual units", source: "manual" as const },
    targetShare: 0.1,
  },
  assumptions: ["Manual values are authoritative"],
  openQuestions: [],
};

describe("Tranche 001 contracts", () => {
  it("normalizes project text at the runtime boundary", () => {
    expect(
      createProjectInputSchema.parse({
        name: "  Governor  ",
        description: "  Demo  ",
      }),
    ).toEqual({
      name: "Governor",
      description: "Demo",
    });
  });

  it("rejects an empty project name", () => {
    expect(createProjectInputSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("accepts a complete manual preflight input", () => {
    expect(savePreflightDraftInputSchema.parse(validInput)).toEqual(validInput);
  });

  it.each([
    [
      "negative capacity",
      { availableBudget: { ...validInput.availableBudget, amount: -1 } },
    ],
    [
      "non-manual source",
      {
        availableBudget: {
          ...validInput.availableBudget,
          source: "platform_adapter",
        },
      },
    ],
    [
      "malformed reset",
      { reset: { ...validInput.reset, resetsAt: "tomorrow" } },
    ],
    [
      "unknown timezone",
      { reset: { ...validInput.reset, timezone: "Mars/Olympus" } },
    ],
    ["share above one", { correctionReserve: { targetShare: 1.01 } }],
  ])("rejects %s", (_label, patch) => {
    expect(
      savePreflightDraftInputSchema.safeParse({ ...validInput, ...patch })
        .success,
    ).toBe(false);
  });

  it("accepts the stored draft identity shape", () => {
    const stored = {
      ...validInput,
      id: "496ca42f-3e77-4332-ad25-d845b9b27125",
      tranche: {
        ...validInput.tranche,
        id: "42235782-83d5-48d8-9e72-3146e452d9dd",
        projectId,
      },
    };
    expect(preflightDraftSchema.parse(stored).projectId).toBe(projectId);
  });
});
