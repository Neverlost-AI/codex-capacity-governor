import { describe, expect, it } from "vitest";
import {
  governedOutcomeInputSchema,
  governedUsageInputSchema,
} from "../src/governed";

const usage = () => ({
  bucketId: "short",
  providerId: "codex",
  capacityWindowId: "5h",
  resetCycleId: "r1",
  bucketProfileVersion: "gate-b-bucket-profile-v1",
  category: "IMPLEMENTATION" as const,
  rawValue: "0",
  rawUnit: "PERCENT" as const,
  sourceReference: "manual observation",
  observedAt: "2026-09-27T12:00:00Z",
  reviewed: true as const,
  exactCycleOnly: "YES" as const,
});
const outcome = () => ({
  runOutcome: "COMPLETED",
  validationResult: "PASSED",
  adherence: "UNKNOWN",
  unexpectedFailures: [],
  deferredWork: [],
  usage: [] as ReturnType<typeof usage>[],
});

describe("T006 governed factual contract", () => {
  it("keeps omitted usage unknown and explicit reviewed zero", () => {
    expect(governedOutcomeInputSchema.parse(outcome()).usage).toEqual([]);
    expect(
      governedOutcomeInputSchema.parse({ ...outcome(), usage: [usage()] })
        .usage[0].rawValue,
    ).toBe("0");
  });
  it.each(["FOLLOWED", "PARTIALLY_FOLLOWED", "NOT_FOLLOWED", "UNKNOWN"])(
    "requires explicit %s adherence",
    (value) => {
      const input = {
        ...outcome(),
        adherence: value,
        ...(value === "PARTIALLY_FOLLOWED"
          ? { adherenceExplanation: "Changed scope" }
          : {}),
      };
      expect(governedOutcomeInputSchema.safeParse(input).success).toBe(true);
    },
  );
  it("rejects omitted and unexplained partial adherence", () => {
    expect(
      governedOutcomeInputSchema.safeParse({
        ...outcome(),
        adherence: undefined,
      }).success,
    ).toBe(false);
    expect(
      governedOutcomeInputSchema.safeParse({
        ...outcome(),
        adherence: "PARTIALLY_FOLLOWED",
      }).success,
    ).toBe(false);
  });
  it.each(["-1", "1e3", "NaN", "Infinity", " 1", "1.", ".5"])(
    "rejects invalid decimal %s",
    (rawValue) => {
      expect(
        governedUsageInputSchema.safeParse({ ...usage(), rawValue }).success,
      ).toBe(false);
    },
  );
  it("rejects arbitrary credit units, absent source/review and duplicate bucket/category", () => {
    expect(
      governedUsageInputSchema.safeParse({ ...usage(), rawUnit: "CREDITS" })
        .success,
    ).toBe(false);
    expect(
      governedUsageInputSchema.safeParse({ ...usage(), sourceReference: " " })
        .success,
    ).toBe(false);
    expect(
      governedUsageInputSchema.safeParse({ ...usage(), reviewed: false })
        .success,
    ).toBe(false);
    expect(
      governedOutcomeInputSchema.safeParse({
        ...outcome(),
        usage: [usage(), { ...usage(), resetCycleId: "r2" }],
      }).success,
    ).toBe(false);
  });
});
