import { bigDivRound, MAX_INPUT_LENGTH, show } from './internal.js';

/**
 * Quantities match Postgres NUMERIC(14,3): up to 3 decimal places.
 * In code they are integers of thousandths ("milli"): 2.5 metres = 2500.
 * Never use floating point for quantities. The database sends NUMERIC as a
 * string ("2.500"); convert with parseQty(..., { allowNegative: true }).
 *
 * The API must still enforce business rules: quantity > 0 on sale and purchase
 * lines (negatives only in returns and adjustments), a minimum step per unit
 * (whole pieces, wire in steps the shop sells), and a cap on lines per bill.
 */
export type Milli = number;

/** NUMERIC(14,3) allows 11 digits before the point. */
export const MAX_MILLI: Milli = 99_999_999_999_999;

export class QuantityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuantityError';
  }
}

export function assertMilli(value: number, label = 'quantity'): asserts value is Milli {
  if (!Number.isSafeInteger(value) || Math.abs(value) > MAX_MILLI) {
    throw new QuantityError(
      `${label} must be whole thousandths within NUMERIC(14,3), got ${show(value)}`,
    );
  }
}

export interface ParseQtyOptions {
  /** Accept a leading minus. Default false: sale and purchase quantities are positive. */
  allowNegative?: boolean;
}

const QTY = /^(-?)(\d{1,11})(?:\.(\d{1,3}))?$/;

/**
 * "2.5" -> 2500, "90" -> 90000, "2.500" -> 2500.
 * Rejected: more than 3 decimals or 11 whole digits, ".5" (type "0.5"), "+5",
 * commas, input over 32 characters, and a minus sign unless allowNegative is set.
 */
export function parseQty(input: string, options: ParseQtyOptions = {}): Milli {
  if (input.length > MAX_INPUT_LENGTH) throw new QuantityError(`quantity too long: ${show(input)}`);
  const match = QTY.exec(input.trim());
  if (!match) throw new QuantityError(`not a valid quantity: ${show(input)}`);
  const [, sign, whole, fraction = ''] = match;
  if (sign === '-' && !options.allowNegative) {
    throw new QuantityError(`negative quantity not allowed: ${show(input)}`);
  }
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  const value = sign === '-' && milli !== 0 ? -milli : milli; // never -0
  assertMilli(value);
  return value;
}

/** 2500 -> "2.5"; with fixed: true -> "2.500" (the database format). */
export function formatQty(milli: Milli, options: { fixed?: boolean } = {}): string {
  assertMilli(milli);
  const negative = milli < 0;
  const abs = Math.abs(milli);
  const whole = Math.floor(abs / 1000);
  let fraction = (abs % 1000).toString().padStart(3, '0');
  if (!options.fixed) fraction = fraction.replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function addQty(a: Milli, b: Milli): Milli {
  assertMilli(a);
  assertMilli(b);
  const sum = a + b;
  assertMilli(sum, 'sum');
  return sum;
}

/** Multiplies two quantities, rounding half away from zero at 3 decimals. */
export function mulQty(a: Milli, b: Milli): Milli {
  assertMilli(a);
  assertMilli(b);
  const result = Number(bigDivRound(BigInt(a) * BigInt(b), 1000n));
  assertMilli(result, 'product');
  return result;
}

/**
 * Line amount in paise for qty × unit price: 2.5 m × ₹40.00/m = 10000 paise.
 * Refuses a line that would round to ₹0 although quantity and price are both
 * non-zero (0.001 m at 4 paise), so goods can never be billed for free by
 * splitting them into tiny lines.
 */
export function lineAmountPaise(qty: Milli, unitPricePaise: number): number {
  assertMilli(qty);
  if (!Number.isSafeInteger(unitPricePaise)) throw new QuantityError('price must be whole paise');
  const result = bigDivRound(BigInt(qty) * BigInt(unitPricePaise), 1000n);
  if (result === 0n && qty !== 0 && unitPricePaise !== 0) {
    throw new QuantityError('line amount rounds to zero; quantity is too small for this price');
  }
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new QuantityError('line amount out of range');
  }
  return Number(result);
}
