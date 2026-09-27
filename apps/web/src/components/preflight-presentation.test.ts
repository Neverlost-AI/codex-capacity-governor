import { describe, expect, it } from "vitest";
import {
  percentageFromBasisPoints,
  readableValue,
} from "./preflight-presentation";
describe("exact presentation without policy arithmetic", () => {
  it.each([
    [7800, "78%"],
    [1170, "11.7%"],
    [5460, "54.6%"],
    [1500, "15%"],
    [1, "0.01%"],
    [10001, "100.01%"],
    [-1, "-0.01%"],
    [0, "0%"],
  ] as const)(
    "formats %i bp exactly as %s without clamping",
    (input, expected) =>
      expect(percentageFromBasisPoints(input)).toBe(expected),
  );
  it("does not fabricate unavailable values", () =>
    expect(percentageFromBasisPoints(null)).toBe("Unavailable"));
  it("explains known activity and explicit unknown evidence", () => {
    expect(readableValue("STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION")).toContain(
      "after this window's observation",
    );
    expect(readableValue("UNKNOWN")).toContain("explicitly unconfirmed");
  });
});
