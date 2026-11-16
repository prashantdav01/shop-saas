/**
 * Quantities match Postgres NUMERIC(14,3): up to 3 decimal places.
 * In code they are integers of thousandths ("milli"): 2.5 metres = 2500.
 * Never use floating point for quantities. The database sends NUMERIC as a
 * string ("2.500"); convert with parseQty().
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
      `${label} must be whole thousandths within NUMERIC(14,3), got ${value}`,
    );
  }
}

/** "2.5" -> 2500, "90" -> 90000, "-0.125" -> -125. Rejects more than 3 decimals. */
export function parseQty(input: string): Milli {
  const match = /^(-?)(\d+)(?:\.(\d{1,3}))?$/.exec(input.trim());
  if (!match) throw new QuantityError(`not a valid quantity: "${input}"`);
  const [, sign, whole, fraction = ''] = match;
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  const value = sign === '-' ? -milli : milli;
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
  const sum = a + b;
  assertMilli(sum, 'sum');
  return sum;
}

/** Rounds half away from zero when a product has more than 3 decimals. */
export function mulQty(a: Milli, b: Milli): Milli {
  assertMilli(a);
  assertMilli(b);
  const product = BigInt(a) * BigInt(b);
  const sign = product < 0n ? -1n : 1n;
  const abs = product < 0n ? -product : product;
  const result = Number(sign * ((abs * 2n + 1000n) / 2000n));
  assertMilli(result, 'product');
  return result;
}

/** Line amount in paise for qty × unit price: 2.5 m × ₹40.00/m = 10000 paise. */
export function lineAmountPaise(qty: Milli, unitPricePaise: number): number {
  assertMilli(qty);
  if (!Number.isSafeInteger(unitPricePaise)) throw new QuantityError('price must be whole paise');
  const product = BigInt(qty) * BigInt(unitPricePaise);
  const sign = product < 0n ? -1n : 1n;
  const abs = product < 0n ? -product : product;
  const result = Number(sign * ((abs * 2n + 1000n) / 2000n));
  if (!Number.isSafeInteger(result)) throw new QuantityError('line amount out of range');
  return result;
}
