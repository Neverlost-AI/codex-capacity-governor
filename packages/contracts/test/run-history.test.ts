import { describe, expect, it } from "vitest";
import {
  actualConsumptionCategorySchema,
  amendRunOutcomeInputSchema,
  createDevelopmentRunInputSchema,
  recordRunOutcomeInputSchema,
  runOutcomeObservationSchema,
  runOutcomeSchema,
  validationResultSchema,
} from "../src/index";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";
const preflightDraftId = "496ca42f-3e77-4332-ad25-d845b9b27125";
const runId = "fb50937a-c42f-467d-9dc4-b87bcb147581";
const observationId = "75f920b4-df73-48f0-93ee-658ed018f9fa";

const validOutcome = {
  runId,
  runOutcome: "PARTIAL" as const,
  validationResult: "FAILED" as const,
  actualConsumption: [
    {
      category: "IMPLEMENTATION" as const,
      amount: 12.5,
      unit: "displayed units",
      source: "manual" as const,
    },
    {
      category: "OTHER" as const,
      amount: 0,
      unit: "displayed units",
      source: "manual" as const,
    },
  ],
  remainingCapacity: {
    amount: 48,
    unit: "displayed units",
    observedAt: "2026-08-24T12:00:00-06:00",
    source: "manual" as const,
  },
  unexpectedFailures: ["Unexpected runner exit"],
  deferredWork: ["One follow-up check"],
  notes: "Factual evidence only",
};

describe("Tranche 002 run-history contracts", () => {
  it("accepts every approved exhaustive vocabulary value", () => {
    expect(runOutcomeSchema.options).toEqual([
      "COMPLETED",
      "PARTIAL",
      "FAILED",
    ]);
    expect(validationResultSchema.options).toEqual([
      "NOT_RUN",
      "PASSED",
      "PARTIAL",
      "FAILED",
      "INCONCLUSIVE",
    ]);
    expect(actualConsumptionCategorySchema.options).toEqual([
      "IMPLEMENTATION",
      "CORRECTION",
      "VALIDATION",
      "OTHER",
    ]);
    for (const value of runOutcomeSchema.options) {
      expect(runOutcomeSchema.parse(value)).toBe(value);
    }
    for (const value of validationResultSchema.options) {
      expect(validationResultSchema.parse(value)).toBe(value);
    }
    for (const value of actualConsumptionCategorySchema.options) {
      expect(actualConsumptionCategorySchema.parse(value)).toBe(value);
    }
    expect(runOutcomeSchema.safeParse("completed").success).toBe(false);
    expect(validationResultSchema.safeParse("not_run").success).toBe(false);
    expect(
      actualConsumptionCategorySchema.safeParse("implementation").success,
    ).toBe(false);
  });

  it("accepts matching project and preflight identifiers as recording input", () => {
    expect(
      createDevelopmentRunInputSchema.parse({ projectId, preflightDraftId }),
    ).toEqual({ projectId, preflightDraftId });
  });

  it("preserves independently selected outcome and validation values", () => {
    const parsed = recordRunOutcomeInputSchema.parse(validOutcome);
    expect(parsed.runOutcome).toBe("PARTIAL");
    expect(parsed.validationResult).toBe("FAILED");
  });

  it("rejects duplicate actual-consumption categories", () => {
    expect(
      recordRunOutcomeInputSchema.safeParse({
        ...validOutcome,
        actualConsumption: [
          validOutcome.actualConsumption[0],
          validOutcome.actualConsumption[0],
        ],
      }).success,
    ).toBe(false);
  });

  it.each([
    ["invalid run UUID", { runId: "not-a-uuid" }],
    ["unknown outcome", { runOutcome: "STOPPED" }],
    ["unknown validation", { validationResult: "UNKNOWN" }],
    [
      "negative consumption",
      {
        actualConsumption: [
          {
            category: "CORRECTION",
            amount: -1,
            unit: "units",
            source: "manual",
          },
        ],
      },
    ],
    [
      "infinite consumption",
      {
        actualConsumption: [
          {
            category: "CORRECTION",
            amount: Number.POSITIVE_INFINITY,
            unit: "units",
            source: "manual",
          },
        ],
      },
    ],
    [
      "NaN consumption",
      {
        actualConsumption: [
          {
            category: "VALIDATION",
            amount: Number.NaN,
            unit: "units",
            source: "manual",
          },
        ],
      },
    ],
    [
      "empty consumption unit",
      {
        actualConsumption: [
          {
            category: "OTHER",
            amount: 1,
            unit: " ",
            source: "manual",
          },
        ],
      },
    ],
    [
      "non-manual source",
      {
        actualConsumption: [
          {
            category: "VALIDATION",
            amount: 1,
            unit: "units",
            source: "platform_adapter",
          },
        ],
      },
    ],
    [
      "timestamp without offset",
      {
        remainingCapacity: {
          amount: 1,
          unit: "units",
          observedAt: "2026-08-24T12:00:00",
          source: "manual",
        },
      },
    ],
    [
      "partial remaining snapshot",
      {
        remainingCapacity: {
          amount: 1,
          unit: "units",
          source: "manual",
        },
      },
    ],
    [
      "non-manual remaining source",
      {
        remainingCapacity: {
          amount: 1,
          unit: "units",
          observedAt: "2026-08-24T12:00:00-06:00",
          source: "platform_adapter",
        },
      },
    ],
    ["empty failure entry", { unexpectedFailures: [" "] }],
  ])("rejects %s", (_label, patch) => {
    expect(
      recordRunOutcomeInputSchema.safeParse({ ...validOutcome, ...patch })
        .success,
    ).toBe(false);
  });

  it("requires a factual reason for an amendment", () => {
    expect(
      amendRunOutcomeInputSchema.safeParse({
        ...validOutcome,
        expectedCurrentObservationId: observationId,
        amendmentReason: " ",
      }).success,
    ).toBe(false);
  });

  it("requires predecessor and amendment reason together on stored observations", () => {
    const stored = {
      ...validOutcome,
      actualConsumption: undefined,
      id: observationId,
      recordedAt: "2026-08-24T18:00:00.000Z",
    };
    expect(runOutcomeObservationSchema.safeParse(stored).success).toBe(true);
    expect(
      runOutcomeObservationSchema.safeParse({
        ...stored,
        supersedesObservationId: projectId,
      }).success,
    ).toBe(false);
  });
});
