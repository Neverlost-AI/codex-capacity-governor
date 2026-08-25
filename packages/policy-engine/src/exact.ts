import type {
  PolicyRawQuantity,
  PolicyRoundingEvidence,
} from "@capacity-governor/contracts";

interface ExactFraction {
  numerator: bigint;
  denominator: bigint;
}

export interface NormalizedQuantity {
  basisPoints: number;
  evidence: PolicyRoundingEvidence;
  claimMatches: boolean;
}

export class PolicyNormalizationError extends Error {
  constructor(
    readonly operation: string,
    readonly reason: "OUT_OF_RANGE" | "UNSAFE_RESULT",
  ) {
    super(`${operation}: ${reason}`);
  }
}

const parseExactDecimal = (value: string): ExactFraction => {
  const [whole, fraction = ""] = value.split(".");
  const denominator = 10n ** BigInt(fraction.length);
  return {
    numerator: BigInt(`${whole}${fraction}`),
    denominator,
  };
};

const divide = (
  numerator: bigint,
  denominator: bigint,
  direction: "DOWN" | "UP",
): bigint => {
  const quotient = numerator / denominator;
  if (direction === "DOWN" || numerator % denominator === 0n) {
    return quotient;
  }
  return quotient + 1n;
};

const toSafeNumber = (value: bigint, operation: string): number => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n) {
    throw new PolicyNormalizationError(operation, "UNSAFE_RESULT");
  }
  return Number(value);
};

export const normalizeQuantity = (
  quantity: PolicyRawQuantity,
  direction: "DOWN" | "UP",
  operation: string,
  maximumBasisPoints: number,
): NormalizedQuantity => {
  const raw = parseExactDecimal(quantity.amount);
  const multiplier =
    quantity.unit === "BASIS_POINTS"
      ? 1n
      : quantity.unit === "PERCENT"
        ? 100n
        : 10_000n;
  const numerator = raw.numerator * multiplier;
  const rounded = divide(numerator, raw.denominator, direction);
  const basisPoints = toSafeNumber(rounded, operation);

  if (basisPoints > maximumBasisPoints) {
    throw new PolicyNormalizationError(operation, "OUT_OF_RANGE");
  }

  return {
    basisPoints,
    claimMatches:
      quantity.claimedNormalizedBasisPoints === undefined ||
      quantity.claimedNormalizedBasisPoints === basisPoints,
    evidence: {
      operation,
      direction: numerator % raw.denominator === 0n ? "EXACT" : direction,
      numerator: numerator.toString(),
      denominator: raw.denominator.toString(),
      resultBasisPoints: basisPoints,
    },
  };
};

export const ceilRatio = (
  value: number,
  numeratorMultiplier: number,
  denominator: number,
  operation: string,
): { result: number; evidence: PolicyRoundingEvidence } => {
  const numerator = BigInt(value) * BigInt(numeratorMultiplier);
  const divisor = BigInt(denominator);
  const rounded = divide(numerator, divisor, "UP");
  const result = toSafeNumber(rounded, operation);
  return {
    result,
    evidence: {
      operation,
      direction: numerator % divisor === 0n ? "EXACT" : "UP",
      numerator: numerator.toString(),
      denominator: divisor.toString(),
      resultBasisPoints: result,
    },
  };
};
