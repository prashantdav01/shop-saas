/** Longest text any parser accepts. Longer input is rejected before any work. */
export const MAX_INPUT_LENGTH = 32;

/**
 * Safe echo of user input in an error message: at most 32 characters, quoted,
 * control characters escaped (no log injection, no log flooding).
 */
export function show(input: unknown): string {
  const text = String(input);
  return JSON.stringify(
    text.length > MAX_INPUT_LENGTH ? `${text.slice(0, MAX_INPUT_LENGTH)}…` : text,
  );
}

/** Integer division of BigInts, rounding half away from zero. */
export function bigDivRound(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = (n * 2n + d) / (d * 2n);
  return negative ? -q : q;
}
