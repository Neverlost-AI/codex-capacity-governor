/** Presentation only: never normalizes user input or calculates policy evidence. */
export function percentageFromBasisPoints(value: number | null): string {
  if (value === null) return "Unavailable";
  const integer = BigInt(value);
  const sign = integer < 0n ? "-" : "";
  const absolute = integer < 0n ? -integer : integer;
  const fraction = (absolute % 100n)
    .toString()
    .padStart(2, "0")
    .replace(/0+$/, "");
  return `${sign}${absolute / 100n}${fraction ? `.${fraction}` : ""}%`;
}

const descriptions: Record<string, string> = {
  DOCUMENTATION_CONFIG: "Documentation and configuration",
  TESTING_ONLY: "Testing only",
  FRONTEND_UI: "Frontend interface",
  APPLICATION_LOGIC: "Application logic",
  DATA_PERSISTENCE: "Data persistence",
  INTEGRATION: "Integration",
  REFACTOR_ARCHITECTURE: "Refactoring and architecture",
  ACCEPTED_INCOMPLETE: "Incomplete evidence (accepted, lower confidence)",
  COMPLETE: "Complete evidence",
  BASIS_POINTS: "Basis points (100 bp = 1%)",
  PERCENT: "Percentage of this window",
  NORMALIZED_FRACTION: "Fraction of this window (1 = 100%)",
  UNKNOWN: "Unknown (explicitly unconfirmed)",
  NONE: "None",
  CONFIRMED: "Confirmed",
  UNCERTAIN: "Uncertain",
  ROLLING: "Rolling",
  STOP_EXTERNAL_MANDATORY_CONDITION:
    "An active repository or work-scope stop condition prevents implementation.",
  STOP_NORMALIZATION_CLAIM_MISMATCH:
    "Capacity normalization evidence does not match the supplied observation.",
  STOP_STALE_OBSERVATION_AGE:
    "The capacity observation is older than the permitted freshness interval.",
  STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION:
    "Known capacity-consuming activity occurred after this window's observation.",
  STOP_RESET_PASSED_WITHOUT_FRESH_OBSERVATION:
    "The reset has passed without a fresh capacity observation.",
  STOP_INVALID_RESET_EVIDENCE: "Reset evidence is invalid or inconsistent.",
  STOP_UNKNOWN_OR_INVALID_UNCERTAINTY:
    "Required characterization or profile evidence leaves uncertainty unknown or invalid.",
  STOP_RESERVES_EXHAUST_CAPACITY:
    "Protected reserves leave no safe implementation capacity.",
  STOP_VALIDATION_RESERVE_UNPROTECTED:
    "Required validation capacity cannot be fully protected.",
  STOP_CRITICAL_MODE:
    "Available capacity is critically low for new implementation.",
  STOP_POLICY_INVARIANT: "A required policy safety invariant failed.",
};

export function readableValue(value: string): string {
  if (value.startsWith("UNKNOWN_FACTOR:")) {
    const [, item, factor] = value.split(":");
    return `Work item ${item}: ${factor.replace(/([A-Z])/g, " $1").toLowerCase()} is explicitly unknown.`;
  }
  return (
    descriptions[value] ??
    value
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^./, (char) => char.toUpperCase())
  );
}
