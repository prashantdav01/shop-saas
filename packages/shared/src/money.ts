/**
 * Money is always an integer number of paise (1 rupee = 100 paise).
 * Never use floating point for money. JSON-safe `number`, checked to be a safe integer
 * (Postgres bigint columns arrive as strings; convert with toPaise()).
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
    throw new MoneyError(`${label} must be a whole number of paise, got ${value}`);
  }
}

/** Converts a database bigint (string), number or bigint into Paise. */
export function toPaise(value: string | number | bigint): Paise {
  if (typeof value === 'bigint') {
    if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
      throw new MoneyError(`amount out of range: ${value}`);
    }
    return Number(value);
  }
  if (typeof value === 'string') {
    if (!/^-?\d+$/.test(value)) throw new MoneyError(`not a whole number of paise: "${value}"`);
    return toPaise(BigInt(value));
  }
  assertPaise(value);
  return value;
}

/** Groups digits the Indian way: 1234567 -> "12,34,567". */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
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

/**
 * Parses what a person types into paise. Accepts "1234", "1,23,456.5", "₹ 99.99".
 * Rejects more than 2 decimal places, letters, and empty input.
 */
export function parseInr(input: string): Paise {
  const cleaned = input.replace(/[₹,\s]/g, '');
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) throw new MoneyError(`not a valid amount: "${input}"`);
  const [, sign, rupees, fraction = ''] = match;
  const paise = BigInt(rupees!) * 100n + BigInt(fraction.padEnd(2, '0'));
  return toPaise(sign === '-' ? -paise : paise);
}

/**
 * Integer division rounding half away from zero: divRound(5, 2) = 3, divRound(-5, 2) = -3.
 * Used for every percentage and pro-rata calculation so results are exact and repeatable.
 */
export function divRound(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new MoneyError('divRound needs safe integers and a non-zero denominator');
  }
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  const sign = n < 0n !== d < 0n ? -1n : 1n;
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (ad * 2n);
  return Number(sign * q);
}

/** A rate in basis points of an amount: applyBp(10000, 1800) = 1800 (18% of ₹100). */
export function applyBp(paise: Paise, basisPoints: number): Paise {
  assertPaise(paise);
  if (!Number.isSafeInteger(basisPoints)) throw new MoneyError('basis points must be an integer');
  return divRound(paise * basisPoints, 10_000);
}

/**
 * Rounds a bill total to the nearest rupee and returns the round-off line.
 * 50 paise rounds up. UNVERIFIED convention: a CA confirms before real bills.
 */
export function roundToRupee(paise: Paise): { total: Paise; roundOff: Paise } {
  assertPaise(paise);
  const total = divRound(paise, 100) * 100;
  return { total, roundOff: total - paise };
}
