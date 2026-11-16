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
    ['₹ 99.99', 9999],
    ['0.05', 5],
    ['-10', -1000],
  ])('%s -> %i paise', (input, expected) => {
    expect(parseInr(input)).toBe(expected);
  });

  it.each(['', 'abc', '1.234', '1.2.3', '₹', '12a'])('rejects "%s"', (input) => {
    expect(() => parseInr(input)).toThrow(MoneyError);
  });

  it('round-trips with formatInr', () => {
    for (const p of [0, 1, 99, 100, 123456789, -42]) {
      expect(parseInr(formatInr(p))).toBe(p);
    }
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
});

describe('roundToRupee', () => {
  it('rounds to the nearest rupee and returns the round-off line', () => {
    expect(roundToRupee(12349)).toEqual({ total: 12300, roundOff: -49 });
    expect(roundToRupee(12350)).toEqual({ total: 12400, roundOff: 50 });
    expect(roundToRupee(12300)).toEqual({ total: 12300, roundOff: 0 });
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
