import { bigDivRound, MAX_INPUT_LENGTH, show } from './internal.js';

/**
 * Money is always an integer number of paise (1 rupee = 100 paise).
 * Never use floating point for money. JSON-safe `number`, checked to be a safe integer
 * (Postgres bigint columns arrive as strings; convert with toPaise()).
 *
 * These helpers check values, not business rules. The API must still enforce
 * limits such as "price >= 0 on a sale line" and "discount within the role's limit",
 * and turn MoneyError into a 400 response.
 */
export type Paise = number;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function assertPaise(value: number, label = 'amount'): asserts value is Paise {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`${label} must be a whole number of paise, got ${show(value)}`);
  }
}

function fromBig(value: bigint, label = 'amount'): Paise {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyError(`${label} out of range`);
  }
  return Number(value);
}

/** Converts a database bigint (string), number or bigint into Paise. */
export function toPaise(value: string | number | bigint): Paise {
  if (typeof value === 'bigint') return fromBig(value);
  if (typeof value === 'string') {
    if (!/^-?\d{1,19}$/.test(value)) {
      throw new MoneyError(`not a whole number of paise: ${show(value)}`);
    }
    return fromBig(BigInt(value));
  }
  assertPaise(value);
  return value;
}

/** Groups digits the Indian way: 1234567 -> "12,34,567". Digits only. */
export function groupIndian(digits: string): string {
  if (!/^\d{1,20}$/.test(digits)) throw new MoneyError(`not a digit string: ${show(digits)}`);
  if (digits.length <= 3) return digits;
  const groups = [digits.slice(-3)];
  let rest = digits.slice(0, -3);
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  groups.unshift(rest);
  return groups.join(',');
}

export interface FormatInrOptions {
  /** Show the ₹ sign. Default true. */
  symbol?: boolean;
  /** Hide ".00" for whole rupees. Default false (bills always show paise). */
  trimZeroPaise?: boolean;
}

/** 123456789 paise -> "₹12,34,567.89"; -5000 -> "-₹50.00". */
export function formatInr(paise: Paise, options: FormatInrOptions = {}): string {
  assertPaise(paise);
  const { symbol = true, trimZeroPaise = false } = options;
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100).toString();
  const fraction = (abs % 100).toString().padStart(2, '0');
  const body =
    trimZeroPaise && fraction === '00' ? groupIndian(rupees) : `${groupIndian(rupees)}.${fraction}`;
  return `${negative ? '-' : ''}${symbol ? '₹' : ''}${body}`;
}

export interface ParseInrOptions {
  /** Accept a leading minus. Default false: prices, payments and discounts are never negative. */
  allowNegative?: boolean;
}

// Rupees: plain digits ("123456") or correct Indian grouping ("1,23,456").
const RUPEES = String.raw`(\d{1,14}|\d{1,2}(?:,\d{2}){0,5},\d{3})`;
const AMOUNT = new RegExp(String.raw`^(?:${RUPEES}(?:\.(\d{0,2}))?|\.(\d{1,2}))$`);

/**
 * Parses what a person types into paise.
 * Accepted: "1234", "1,23,456.5", "₹ 99.99", "₹99", ".5", "5.", "5.05".
 * Rejected: commas in the wrong places ("12,34.5,6"), spaces inside the number
 * ("1 2 3"), more than 2 decimals, letters, empty input, input over 32 characters,
 * and a minus sign unless allowNegative is set.
 */
export function parseInr(input: string, options: ParseInrOptions = {}): Paise {
  if (input.length > MAX_INPUT_LENGTH) throw new MoneyError(`amount too long: ${show(input)}`);
  // Sign first, then an optional ₹: "-₹50.00" (as formatInr writes it) or "-50".
  let rest = input.trim();
  const negative = rest.startsWith('-');
  if (negative) rest = rest.slice(1);
  rest = rest.replace(/^₹\s*/, '');
  const match = AMOUNT.exec(rest);
  if (!match) throw new MoneyError(`not a valid amount: ${show(input)}`);
  const [, rupees, fraction, onlyFraction] = match;
  const sign = negative ? '-' : '';
  if (negative && !options.allowNegative) {
    throw new MoneyError(`negative amount not allowed: ${show(input)}`);
  }
  const rupeeDigits = (rupees ?? '0').replace(/,/g, '');
  const paiseDigits = (fraction ?? onlyFraction ?? '').padEnd(2, '0');
  const paise = BigInt(rupeeDigits) * 100n + BigInt(paiseDigits);
  return fromBig(sign === '-' ? -paise : paise);
}

/**
 * Integer division rounding half away from zero: divRound(5, 2) = 3, divRound(-5, 2) = -3.
 * Used for every percentage and pro-rata calculation so results are exact and repeatable.
 */
export function divRound(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new MoneyError('divRound needs safe integers and a non-zero denominator');
  }
  return Number(bigDivRound(BigInt(numerator), BigInt(denominator)));
}

/**
 * A rate in basis points of an amount: applyBp(10000, 1800) = 1800 (18% of ₹100).
 * The rate must be 0..10000 (0% to 100%), which covers GST rates and discounts.
 * Multiplies in BigInt, so it is exact for every safe paise amount.
 */
export function applyBp(paise: Paise, basisPoints: number): Paise {
  assertPaise(paise);
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new MoneyError(`rate must be 0 to 10000 basis points, got ${show(basisPoints)}`);
  }
  return fromBig(bigDivRound(BigInt(paise) * BigInt(basisPoints), 10_000n));
}

/**
 * Rounds a bill total to the nearest rupee and returns the round-off line.
 * 50 paise rounds away from zero (₹123.50 -> ₹124; -₹123.50 -> -₹124).
 * UNVERIFIED convention: a CA confirms before real bills, including whether GST
 * is rounded per line or on the invoice total.
 */
export function roundToRupee(paise: Paise): { total: Paise; roundOff: Paise } {
  assertPaise(paise);
  const total = divRound(paise, 100) * 100;
  return { total, roundOff: total - paise };
}
