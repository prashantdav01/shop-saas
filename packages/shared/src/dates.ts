/**
 * Business dates are Indian dates. Timestamps are stored in UTC; the date a bill
 * belongs to is its date in IST (UTC+05:30, no daylight saving).
 * A business date is an ISO string 'YYYY-MM-DD' (no time, no zone).
 */
export type IsoDate = string;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export class DateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateError';
  }
}

function parts(date: IsoDate): { y: number; m: number; d: number } {
  const match = ISO_DATE.exec(date);
  if (!match) throw new DateError(`not a YYYY-MM-DD date: "${date}"`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    throw new DateError(`no such date: "${date}"`);
  }
  return { y, m, d };
}

function pad(n: number, width = 2): string {
  return n.toString().padStart(width, '0');
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

/** The IST calendar date of a moment: 2026-03-31T19:00Z -> '2026-04-01'. */
export function istDate(moment: Date): IsoDate {
  if (Number.isNaN(moment.getTime())) throw new DateError('invalid Date');
  const ist = new Date(moment.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** '2026-04-01' -> '01/04/2026'. */
export function formatDateIn(date: IsoDate): string {
  const { y, m, d } = parts(date);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** A moment shown in IST: '01/04/2026, 00:30'. */
export function formatDateTimeIn(moment: Date): string {
  const ist = new Date(moment.getTime() + IST_OFFSET_MS);
  return `${formatDateIn(istDate(moment))}, ${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

/** Parses 'DD/MM/YYYY' as typed by a person. */
export function parseDateIn(input: string): IsoDate {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!match) throw new DateError(`not a DD/MM/YYYY date: "${input}"`);
  const iso = `${match[3]}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
  parts(iso);
  return iso;
}

/** Indian financial year (1 April to 31 March): '2027-03-31' -> '2026-27'. */
export function financialYear(date: IsoDate): string {
  const { y, m } = parts(date);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${pad((start + 1) % 100)}`;
}

/** First and last day of a financial year: '2026-27' -> 2026-04-01 .. 2027-03-31. */
export function financialYearBounds(fy: string): { start: IsoDate; end: IsoDate } {
  const match = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!match || (Number(match[1]) + 1) % 100 !== Number(match[2])) {
    throw new DateError(`not a financial year like "2026-27": "${fy}"`);
  }
  const start = Number(match[1]);
  return { start: `${start}-04-01`, end: `${start + 1}-03-31` };
}

/**
 * Adds calendar months, clamping to the month's last day:
 * 2026-01-31 + 1 month = 2026-02-28; 2027-11-30 + 3 = 2028-02-29.
 * Used for warranty end = invoice date + warranty months.
 * UNVERIFIED: whether the warranty's last valid day is this date or the day
 * before is brand or shop policy; confirm in shop visits.
 */
export function addMonths(date: IsoDate, months: number): IsoDate {
  if (!Number.isSafeInteger(months)) throw new DateError('months must be an integer');
  const { y, m, d } = parts(date);
  const index = y * 12 + (m - 1) + months;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  return `${pad(ny, 4)}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}

/** Compares two ISO dates: negative, zero or positive. */
export function compareDates(a: IsoDate, b: IsoDate): number {
  parts(a);
  parts(b);
  return a < b ? -1 : a > b ? 1 : 0;
}
