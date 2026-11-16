import { describe, expect, it } from 'vitest';
import {
  addQty,
  formatQty,
  lineAmountPaise,
  MAX_MILLI,
  mulQty,
  parseQty,
  QuantityError,
} from './quantity';
import { planCoilDraw, splitIntoPurchaseUnits, toBaseUnits } from './units';

describe('parseQty / formatQty', () => {
  it.each([
    ['2.5', 2500],
    ['90', 90000],
    ['0.001', 1],
    ['2.500', 2500],
  ])('%s -> %i', (input, milli) => {
    expect(parseQty(input)).toBe(milli);
  });

  it.each(['', '1.2345', 'abc', '1,000', '.5', '+5', '123456789012'])('rejects "%s"', (input) => {
    expect(() => parseQty(input)).toThrow(QuantityError);
  });

  it('rejects negative quantities unless allowed (returns, adjustments)', () => {
    expect(() => parseQty('-5')).toThrow(/negative/);
    expect(parseQty('-0.125', { allowNegative: true })).toBe(-125);
  });

  it('never returns -0', () => {
    expect(Object.is(parseQty('-0', { allowNegative: true }), 0)).toBe(true);
  });

  it('rejects very long input before parsing it', () => {
    expect(() => parseQty('1'.repeat(100_000))).toThrow(/too long/);
  });

  it('rejects values beyond NUMERIC(14,3)', () => {
    expect(() => parseQty('100000000000')).toThrow(QuantityError);
    expect(parseQty('99999999999.999')).toBe(MAX_MILLI);
  });

  it('formats short or in the database format', () => {
    expect(formatQty(2500)).toBe('2.5');
    expect(formatQty(90000)).toBe('90');
    expect(formatQty(2500, { fixed: true })).toBe('2.500');
    expect(formatQty(-125)).toBe('-0.125');
  });

  it('round-trips', () => {
    for (const s of ['0', '0.001', '2.5', '90', '12345.678']) {
      expect(formatQty(parseQty(s))).toBe(s);
    }
  });
});

describe('arithmetic without floating point', () => {
  it('adds exactly where floats would drift', () => {
    // 0.1 + 0.2 in floating point is 0.30000000000000004
    expect(addQty(parseQty('0.1'), parseQty('0.2'))).toBe(parseQty('0.3'));
  });

  it('refuses fractional or out-of-range inputs to addQty', () => {
    expect(() => addQty(0.5, 0.5)).toThrow(QuantityError);
    expect(() => addQty(1e20, -1e20)).toThrow(QuantityError);
  });

  it('multiplies and rounds half away from zero at 3 decimals', () => {
    expect(mulQty(1500, 90125)).toBe(135188); // 1.5 × 90.125 = 135.1875
    expect(mulQty(2000, 90000)).toBe(180000);
    expect(mulQty(-1500, 90125)).toBe(-135188);
  });

  it('computes a line amount in paise', () => {
    expect(lineAmountPaise(2500, 4000)).toBe(10000); // 2.5 m × ₹40.00
    expect(lineAmountPaise(333, 1000)).toBe(333); // 0.333 m × ₹10.00 = ₹3.33
    expect(lineAmountPaise(0, 4000)).toBe(0);
    expect(lineAmountPaise(2500, 0)).toBe(0); // free item, priced at zero on purpose
  });

  it('refuses a line that would round to ₹0 (goods for free)', () => {
    expect(() => lineAmountPaise(1, 499)).toThrow(/rounds to zero/); // 0.001 × 4.99 paise
    expect(lineAmountPaise(1, 500)).toBe(1); // 0.5 paise rounds up to 1
  });
});

describe('coil ↔ metre conversion', () => {
  it('converts purchase units to base units', () => {
    expect(toBaseUnits(2000, 90000)).toBe(180000); // 2 coils of 90 m
    expect(toBaseUnits(500, 90000)).toBe(45000); // half a coil
  });

  it('splits base units into whole coils and loose metres', () => {
    expect(splitIntoPurchaseUnits(185000, 90000)).toEqual({ whole: 2, loose: 5000 });
    expect(splitIntoPurchaseUnits(90000, 90000)).toEqual({ whole: 1, loose: 0 });
    expect(splitIntoPurchaseUnits(2500, 90000)).toEqual({ whole: 0, loose: 2500 });
  });

  it('round-trips coils to metres and back', () => {
    for (const coils of [0, 1000, 3000, 7000]) {
      const metres = toBaseUnits(coils, 90000);
      expect(splitIntoPurchaseUnits(metres, 90000)).toEqual({ whole: coils / 1000, loose: 0 });
    }
  });

  it('refuses a zero or negative factor', () => {
    expect(() => toBaseUnits(1000, 0)).toThrow(QuantityError);
    expect(() => splitIntoPurchaseUnits(1000, -1)).toThrow(QuantityError);
  });
});

describe('planCoilDraw', () => {
  const coils = [
    { id: 'new', remaining: 90000, isOpen: false },
    { id: 'open', remaining: 2000, isOpen: true },
  ];

  it('roadmap case: 2.5 m from coils holding 2 m (open) and 90 m', () => {
    expect(planCoilDraw(2500, coils)).toEqual([
      { coilId: 'open', qty: 2000 },
      { coilId: 'new', qty: 500 },
    ]);
  });

  it('uses only the open coil when it has enough', () => {
    expect(planCoilDraw(1500, coils)).toEqual([{ coilId: 'open', qty: 1500 }]);
  });

  it('skips empty coils', () => {
    const withEmpty = [{ id: 'empty', remaining: 0, isOpen: true }, ...coils.slice(0, 1)];
    expect(planCoilDraw(1000, withEmpty)).toEqual([{ coilId: 'new', qty: 1000 }]);
  });

  it('never takes a coil below zero and refuses when stock is short', () => {
    expect(() => planCoilDraw(92001, coils)).toThrow(/not enough stock/);
  });

  it('total drawn always equals the sale and no draw exceeds its coil', () => {
    for (let qty = 1; qty <= 92000; qty += 997) {
      const draws = planCoilDraw(qty, coils);
      expect(draws.reduce((s, d) => s + d.qty, 0)).toBe(qty);
      for (const d of draws) {
        expect(d.qty).toBeLessThanOrEqual(coils.find((c) => c.id === d.coilId)!.remaining);
      }
    }
  });

  it('refuses a coil listed twice (would take it below zero)', () => {
    expect(() =>
      planCoilDraw(4000, [
        { id: 'a', remaining: 2000, isOpen: false },
        { id: 'a', remaining: 2000, isOpen: false },
      ]),
    ).toThrow(/listed twice/);
  });

  it('validates every coil, even ones the sale would not reach', () => {
    expect(() =>
      planCoilDraw(100, [
        { id: 'ok', remaining: 1000, isOpen: true },
        { id: 'bad', remaining: -5, isOpen: false },
      ]),
    ).toThrow(/below zero/);
  });

  it('refuses zero or negative sales and two open coils', () => {
    expect(() => planCoilDraw(0, coils)).toThrow(QuantityError);
    expect(() =>
      planCoilDraw(100, [
        { id: 'a', remaining: 10, isOpen: true },
        { id: 'b', remaining: 10, isOpen: true },
      ]),
    ).toThrow(/more than one open coil/);
  });
});
