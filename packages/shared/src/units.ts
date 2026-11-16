import { show } from './internal.js';
import { type Milli, QuantityError, assertMilli, mulQty } from './quantity.js';

/**
 * Purchase unit -> base unit conversion, e.g. 1 coil = 90.000 metres.
 * `factor` is base units per purchase unit, in thousandths (90 m = 90000).
 * Rounds half away from zero at 3 decimals when the product has more
 * (0.333 coil × 90.125 m = 30.012 m); whole purchase units are always exact.
 */
export function toBaseUnits(purchaseQty: Milli, factor: Milli): Milli {
  assertPositiveFactor(factor);
  return mulQty(purchaseQty, factor);
}

/**
 * Splits a base quantity into whole purchase units plus loose base units:
 * 185 m with 90 m coils -> { whole: 2, loose: 5000 } (2 coils + 5 m).
 */
export function splitIntoPurchaseUnits(
  baseQty: Milli,
  factor: Milli,
): { whole: number; loose: Milli } {
  assertMilli(baseQty);
  assertPositiveFactor(factor);
  if (baseQty < 0) throw new QuantityError('cannot split a negative quantity');
  const whole = Math.floor(baseQty / factor);
  return { whole, loose: baseQty - whole * factor };
}

function assertPositiveFactor(factor: Milli): void {
  assertMilli(factor, 'conversion factor');
  if (factor <= 0) throw new QuantityError('conversion factor must be greater than zero');
}

export interface CoilStock {
  id: string;
  remaining: Milli;
  isOpen: boolean;
}

export interface CoilDraw {
  coilId: string;
  qty: Milli;
}

/**
 * Plans which coils a sale draws from: the open coil first, then the others in
 * the order given (callers pass oldest first). A coil never goes below zero.
 *
 * Pure planning only. The API must load `coils` from the database inside the
 * sale transaction with the rows locked (SELECT ... FOR UPDATE), never from the
 * request, and apply the plan with stock movements in that same transaction.
 * The database CHECK (remaining_qty >= 0) and one-open-coil index are the backstop.
 *
 * Example: 2.5 m from [open 2 m, 90 m] -> [2 m from the open coil, 0.5 m from the next].
 */
export function planCoilDraw(qty: Milli, coils: CoilStock[]): CoilDraw[] {
  assertMilli(qty);
  if (qty <= 0) throw new QuantityError('sale quantity must be greater than zero');

  // Validate every coil up front, not only the ones the loop reaches.
  const seen = new Set<string>();
  for (const coil of coils) {
    if (seen.has(coil.id)) throw new QuantityError(`coil listed twice: ${show(coil.id)}`);
    seen.add(coil.id);
    assertMilli(coil.remaining, 'coil remaining');
    if (coil.remaining < 0) throw new QuantityError(`coil is below zero: ${show(coil.id)}`);
  }
  const open = coils.filter((c) => c.isOpen);
  if (open.length > 1) throw new QuantityError('more than one open coil');
  const ordered = [...open, ...coils.filter((c) => !c.isOpen)];

  const draws: CoilDraw[] = [];
  let left = qty;
  for (const coil of ordered) {
    if (left === 0) break;
    const take = Math.min(left, coil.remaining);
    if (take > 0) {
      draws.push({ coilId: coil.id, qty: take });
      left -= take;
    }
  }
  if (left > 0) {
    const available = ordered.reduce((sum, c) => sum + c.remaining, 0);
    throw new QuantityError(`not enough stock: need ${qty}, coils hold ${available} (thousandths)`);
  }
  return draws;
}
