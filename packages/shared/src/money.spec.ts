import { describe, expect, it } from 'vitest';
import {
  applyBp,
  divRound,
  formatInr,
  groupIndian,
  MoneyError,
  parseInr,
  roundToRupee,
  toPaise,
} from './money';

describe('groupIndian', () => {
  it.each([
    ['0', '0'],
    ['999', '999'],
    ['1000', '1,000'],
    ['100000', '1,00,000'],
    ['1234567', '12,34,567'],
    ['123456789', '12,34,56,789'],
  ])('%s -> %s', (input, expected) => {
    expect(groupIndian(input)).toBe(expected);
  });
});

describe('formatInr', () => {
  it('formats with ₹, lakh/crore grouping and paise', () => {
    expect(formatInr(123456789)).toBe('₹12,34,567.89');
    expect(formatInr(1_00_00_000_00)).toBe('₹1,00,00,000.00');
    expect(formatInr(5)).toBe('₹0.05');
    expect(formatInr(0)).toBe('₹0.00');
  });

  it('puts the minus sign before ₹', () => {
    expect(formatInr(-5000)).toBe('-₹50.00');
  });

  it('can drop the symbol or zero paise', () => {
    expect(formatInr(150000, { symbol: false })).toBe('1,500.00');
    expect(formatInr(150000, { trimZeroPaise: true })).toBe('₹1,500');
    expect(formatInr(150050, { trimZeroPaise: true })).toBe('₹1,500.50');
  });

  it('refuses fractions of a paisa', () => {
    expect(() => formatInr(10.5)).toThrow(MoneyError);
  });
});

describe('parseInr', () => {
  it.each([
    ['1234', 123400],
    ['1,23,456.5', 12345650],
    ['12,34,56,789', 12345678900],
    ['1,000', 100000],
    ['₹ 99.99', 9999],
    ['₹99', 9900],
    ['0.05', 5],
    ['.5', 50],
    ['5.', 500],
  ])('%s -> %i paise', (input, expected) => {
    expect(parseInr(input)).toBe(expected);
  });

  it.each([
    '',
    'abc',
    '1.234',
    '1.2.3',
    '₹',
    '12a',
    '12,34.5,6', // commas in the wrong place
    '1 2 3', // spaces inside the number
    '1,2,3,4',
    '123,456', // western grouping; Indian is 1,23,456
    '1,234,567', // western grouping; Indian is 12,34,567
    '--5',
    '-₹-5',
    '+5',
  ])('rejects "%s"', (input) => {
    expect(() => parseInr(input)).toThrow(MoneyError);
  });

  it('rejects negative amounts unless allowed', () => {
    expect(() => parseInr('-10')).toThrow(/negative/);
    expect(parseInr('-10', { allowNegative: true })).toBe(-1000);
  });

  it('rejects very long input before parsing it', () => {
    expect(() => parseInr('1'.repeat(100_000))).toThrow(/too long/);
  });

  it('never echoes more than 32 characters or raw control characters', () => {
    try {
      parseInr('x\nFAKE LOG LINE 0123456789012345');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('\n');
      expect(message.length).toBeLessThan(80);
    }
  });

  it('round-trips with formatInr', () => {
    for (const p of [0, 1, 99, 100, 123456789]) {
      expect(parseInr(formatInr(p))).toBe(p);
    }
    expect(parseInr(formatInr(-42), { allowNegative: true })).toBe(-42);
  });
});

describe('toPaise', () => {
  it('accepts database bigint strings', () => {
    expect(toPaise('123456')).toBe(123456);
    expect(toPaise(-5n)).toBe(-5);
  });

  it('rejects decimals and values beyond safe integers', () => {
    expect(() => toPaise('12.5')).toThrow(MoneyError);
    expect(() => toPaise('9007199254740993')).toThrow(MoneyError);
  });
});

describe('divRound', () => {
  it('rounds half away from zero', () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(-5, 2)).toBe(-3);
    expect(divRound(4, 3)).toBe(1);
    expect(divRound(5, 3)).toBe(2);
    expect(divRound(10, 5)).toBe(2);
  });

  it('refuses division by zero', () => {
    expect(() => divRound(1, 0)).toThrow(MoneyError);
  });
});

describe('applyBp', () => {
  it('computes a percentage in basis points without floating point', () => {
    expect(applyBp(10000, 1800)).toBe(1800); // 18% of ₹100
    expect(applyBp(999, 1800)).toBe(180); // 179.82 -> 180
    expect(applyBp(333, 900)).toBe(30); // 29.97 -> 30
    expect(applyBp(10000, 0)).toBe(0);
  });

  it('is exact for amounts far beyond any real bill', () => {
    // ₹6,000 crore at 18%: the plain Number product would pass MAX_SAFE_INTEGER.
    expect(applyBp(6_000_000_000_000, 1800)).toBe(1_080_000_000_000);
    expect(applyBp(Number.MAX_SAFE_INTEGER, 10_000)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('only accepts rates from 0% to 100%', () => {
    expect(() => applyBp(10000, -1800)).toThrow(MoneyError);
    expect(() => applyBp(10000, 10_001)).toThrow(MoneyError);
    expect(() => applyBp(10000, 18.5)).toThrow(MoneyError);
  });
});

describe('groupIndian input', () => {
  it('accepts digits only', () => {
    expect(() => groupIndian('12a')).toThrow(MoneyError);
    expect(() => groupIndian('1'.repeat(100))).toThrow(MoneyError);
  });
});

describe('roundToRupee', () => {
  it('rounds to the nearest rupee and returns the round-off line', () => {
    expect(roundToRupee(12349)).toEqual({ total: 12300, roundOff: -49 });
    expect(roundToRupee(12350)).toEqual({ total: 12400, roundOff: 50 });
    expect(roundToRupee(12300)).toEqual({ total: 12300, roundOff: 0 });
  });

  it('rounds exactly 50 paise away from zero, for credit notes too', () => {
    expect(roundToRupee(-12350)).toEqual({ total: -12400, roundOff: -50 });
    expect(roundToRupee(-12349)).toEqual({ total: -12300, roundOff: 49 });
  });

  it('keeps round-off between -50 and +50 paise', () => {
    for (let p = 0; p < 1000; p++) {
      const { total, roundOff } = roundToRupee(p);
      expect(total % 100).toBe(0);
      expect(Math.abs(roundOff)).toBeLessThanOrEqual(50);
      expect(total - roundOff).toBe(p);
    }
  });
});
