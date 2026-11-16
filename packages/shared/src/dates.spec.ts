import { describe, expect, it } from 'vitest';
import {
  addMonths,
  compareDates,
  DateError,
  financialYear,
  financialYearBounds,
  formatDateIn,
  formatDateTimeIn,
  istDate,
  parseDateIn,
} from './dates';

describe('istDate', () => {
  it('uses the Indian date, not the UTC date', () => {
    // 00:30 IST on 1 April is still 31 March in UTC.
    expect(istDate(new Date('2026-03-31T19:00:00Z'))).toBe('2026-04-01');
    expect(istDate(new Date('2026-03-31T18:29:59Z'))).toBe('2026-03-31');
    expect(istDate(new Date('2026-03-31T18:30:00Z'))).toBe('2026-04-01');
  });

  it('rejects an invalid Date', () => {
    expect(() => istDate(new Date('nope'))).toThrow(DateError);
  });
});

describe('formatting and parsing DD/MM/YYYY', () => {
  it('formats ISO dates for display', () => {
    expect(formatDateIn('2026-04-01')).toBe('01/04/2026');
  });

  it('formats a moment in IST with time', () => {
    expect(formatDateTimeIn(new Date('2026-03-31T19:00:00Z'))).toBe('01/04/2026, 00:30');
  });

  it('parses what a person types', () => {
    expect(parseDateIn('1/4/2026')).toBe('2026-04-01');
    expect(parseDateIn(' 29/02/2028 ')).toBe('2028-02-29');
  });

  it.each(['31/02/2026', '29/02/2027', '2026-04-01', '00/01/2026', '01/13/2026'])(
    'rejects "%s"',
    (input) => {
      expect(() => parseDateIn(input)).toThrow(DateError);
    },
  );
});

describe('financialYear', () => {
  it.each([
    ['2026-04-01', '2026-27'],
    ['2027-03-31', '2026-27'],
    ['2026-03-31', '2025-26'],
    ['2099-12-31', '2099-00'],
  ])('%s is in FY %s', (date, fy) => {
    expect(financialYear(date)).toBe(fy);
  });

  it('a bill at 00:30 IST on 1 April belongs to the new financial year', () => {
    expect(financialYear(istDate(new Date('2026-03-31T19:00:00Z')))).toBe('2026-27');
  });

  it('gives the bounds of a financial year', () => {
    expect(financialYearBounds('2026-27')).toEqual({ start: '2026-04-01', end: '2027-03-31' });
    expect(() => financialYearBounds('2026-28')).toThrow(DateError);
  });
});

describe('addMonths (warranty end)', () => {
  it.each([
    ['2026-01-15', 12, '2027-01-15'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2027-11-30', 3, '2028-02-29'], // leap year
    ['2028-02-29', 12, '2029-02-28'], // from a leap day
    ['2026-12-31', 1, '2027-01-31'],
    ['2026-05-15', 0, '2026-05-15'],
    ['2026-03-31', -1, '2026-02-28'],
  ])('%s + %i months = %s', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });

  it('rejects non-integer months and bad dates', () => {
    expect(() => addMonths('2026-01-01', 1.5)).toThrow(DateError);
    expect(() => addMonths('2026-02-30', 1)).toThrow(DateError);
  });
});

describe('compareDates', () => {
  it('orders ISO dates', () => {
    expect(compareDates('2026-01-01', '2026-01-02')).toBeLessThan(0);
    expect(compareDates('2026-01-02', '2026-01-02')).toBe(0);
    expect(compareDates('2027-01-01', '2026-12-31')).toBeGreaterThan(0);
  });
});
