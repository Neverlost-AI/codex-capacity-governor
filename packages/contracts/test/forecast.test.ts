import { describe, expect, it } from "vitest";
import {
  forecastBucketSchema,
  forecastConfidenceSchema,
  forecastEvaluationInputSchema,
  forecastEvaluationOutcomeSchema,
  forecastWorkCategorySchema,
  forecastWorkItemSchema,
  gateBV1ConfigurationSchema,
  policyTimestampSchema,
} from "../src/index";
import {
  candidate,
  forecastInput,
  reviewedItem,
} from "../../forecast-engine/test/fixtures";

describe("Gate B reviewed runtime contracts", () => {
  it.each([
    "DOCUMENTATION_CONFIG",
    "TESTING_ONLY",
    "FRONTEND_UI",
    "APPLICATION_LOGIC",
    "DATA_PERSISTENCE",
    "INTEGRATION",
    "REFACTOR_ARCHITECTURE",
  ])("accepts category %s", (value) =>
    expect(forecastWorkCategorySchema.safeParse(value).success).toBe(true),
  );
  it.each(["HIGH", "MEDIUM", "LOW"])("accepts confidence %s", (value) => {
    expect(forecastConfidenceSchema.safeParse(value).success).toBe(true);
  });
  it("accepts explicit UNKNOWN for every approved factor, not missing or invented values", () => {
    for (const field of [
      "complexity",
      "contextLoad",
      "repositoryCondition",
      "dependencyChange",
      "validationBurden",
      "novelty",
      "correctionExposure",
    ]) {
      expect(
        forecastWorkItemSchema.safeParse({
          ...reviewedItem,
          [field]: "UNKNOWN",
        }).success,
      ).toBe(true);
      expect(
        forecastWorkItemSchema.safeParse({
          ...reviewedItem,
          [field]: "unknown",
        }).success,
      ).toBe(false);
      const missing = { ...reviewedItem } as Record<string, unknown>;
      delete missing[field];
      expect(forecastWorkItemSchema.safeParse(missing).success).toBe(false);
    }
    expect(forecastWorkCategorySchema.safeParse("UNKNOWN").success).toBe(false);
    expect(
      forecastWorkCategorySchema.safeParse("application_logic").success,
    ).toBe(false);
  });
  it("validates exact injected V1 versions, values, and profile", () => {
    const input = forecastInput();
    expect(
      gateBV1ConfigurationSchema.safeParse(input.configuration).success,
    ).toBe(true);
    expect(
      gateBV1ConfigurationSchema.safeParse({
        ...input.configuration,
        basisPointsPerWorkPoint: 101,
      }).success,
    ).toBe(false);
    expect(
      gateBV1ConfigurationSchema.safeParse({
        ...input.configuration,
        methodVersion: "gate-b-v2",
      }).success,
    ).toBe(false);
    expect(
      forecastBucketSchema.safeParse({
        ...input.requiredBuckets[0],
        bucketProfileVersion: "unreviewed",
      }).success,
    ).toBe(false);
  });
  it("accepts multi-item/bucket/history evidence without erasing provenance", () => {
    const input = forecastInput();
    input.workItems.push({ ...reviewedItem, workItemId: "item-b" });
    input.calibrationCandidates.push(candidate("c1", "1200"));
    expect(forecastEvaluationInputSchema.parse(input)).toEqual(input);
  });
  it("rejects duplicate identities and mismatched required-bucket authority", () => {
    const input = forecastInput();
    input.workItems.push(input.workItems[0]);
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
    input.workItems.pop();
    input.requiredBuckets.push(input.requiredBuckets[0]);
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
    input.requiredBuckets.pop();
    input.requiredBucketAuthority.requiredBucketIds = ["five-hour"];
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
  });
  it("binds reviewed characterization and bucket authority to the evaluated context", () => {
    const input = forecastInput();
    input.requiredBucketAuthority.projectId = "another-project";
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
    input.requiredBucketAuthority.projectId = input.projectId;
    input.workItems[0].reviewedCharacterization.scopeTrancheId =
      "another-tranche";
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
  });
  it("rejects non-offset, excessive precision and future-dated review authority", () => {
    const input = forecastInput();
    expect(policyTimestampSchema.safeParse("2026-09-23T12:00:00").success).toBe(
      false,
    );
    expect(
      policyTimestampSchema.safeParse("2026-09-23T12:00:00.0001Z").success,
    ).toBe(false);
    input.requiredBucketAuthority.recordedAt = "2026-09-24T12:00:00Z";
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
  });
  it("outcome union forbids fabricated authorization", () => {
    expect(
      forecastEvaluationOutcomeSchema.safeParse({
        kind: "INPUT_REJECTION",
        authorizesWork: true,
        issues: [],
      }).success,
    ).toBe(false);
  });
});
