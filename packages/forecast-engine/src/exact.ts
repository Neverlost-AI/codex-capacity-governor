import type { ForecastExactFraction } from "@capacity-governor/contracts";

export interface Fraction {
  numerator: bigint;
  denominator: bigint;
}

const gcd = (left: bigint, right: bigint): bigint => {
  let a = left;
  let b = right;
  while (b !== 0n) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
};

export const fraction = (
  numerator: bigint,
  denominator: bigint = 1n,
): Fraction => {
  if (numerator < 0n || denominator <= 0n)
    throw new ExactArithmeticError("INVALID_FRACTION");
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
};

export class ExactArithmeticError extends Error {
  constructor(readonly id: "INVALID_FRACTION" | "UNSAFE_RESULT") {
    super(id);
  }
}

export const parseDecimal = (value: string): Fraction => {
  const [whole, decimal = ""] = value.split(".");
  return fraction(BigInt(`${whole}${decimal}`), 10n ** BigInt(decimal.length));
};

export const multiply = (left: Fraction, right: Fraction): Fraction =>
  fraction(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );

export const add = (left: Fraction, right: Fraction): Fraction =>
  fraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );

export const divide = (left: Fraction, right: Fraction): Fraction => {
  if (right.numerator === 0n)
    throw new ExactArithmeticError("INVALID_FRACTION");
  return fraction(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
};

export const compare = (left: Fraction, right: Fraction): number => {
  const difference =
    left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};

export const roundToPrecision = (
  value: Fraction,
  precision: number,
  direction: "DOWN" | "UP",
): number => {
  const quantum = BigInt(precision);
  const divisor = value.denominator * quantum;
  const quotient = value.numerator / divisor;
  const units =
    quotient +
    (direction === "UP" && value.numerator % divisor !== 0n ? 1n : 0n);
  const result =
    value.numerator > 0n && units === 0n ? quantum : units * quantum;
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new ExactArithmeticError("UNSAFE_RESULT");
  return Number(result);
};

export const safeInteger = (value: bigint): number => {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new ExactArithmeticError("UNSAFE_RESULT");
  return Number(value);
};

export const evidence = (value: Fraction): ForecastExactFraction => ({
  numerator: value.numerator.toString(),
  denominator: value.denominator.toString(),
});

export const codeUnitCompare = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;
