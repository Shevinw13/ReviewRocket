/**
 * Date comparison utilities and month boundary calculations.
 */

const HOURS_MS = 1000 * 60 * 60;

/**
 * Returns the first day of the month at midnight UTC for the given date.
 * Defaults to the current date if none is provided.
 */
export function getMonthStart(date?: Date): Date {
  const d = date ?? new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Returns the start and end of the previous calendar month in UTC.
 * The end date is the last millisecond of the previous month (start of current month minus 1ms).
 */
export function getPreviousMonthRange(date?: Date): { start: Date; end: Date } {
  const d = date ?? new Date();
  const currentMonthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

  // End of previous month is 1ms before start of current month
  const end = new Date(currentMonthStart.getTime() - 1);

  // Start of previous month
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  return { start, end };
}

/**
 * Checks if a date is within 24 hours of a reference date.
 * Defaults to the current time if no reference date is provided.
 */
export function isWithin24Hours(date: Date, referenceDate?: Date): boolean {
  const reference = referenceDate ?? new Date();
  const diffMs = Math.abs(reference.getTime() - date.getTime());
  return diffMs <= 24 * HOURS_MS;
}

/**
 * Checks if the reply timestamp is within 72 hours of the sent timestamp.
 */
export function isWithin72Hours(sentAt: Date, replyAt: Date): boolean {
  const diffMs = replyAt.getTime() - sentAt.getTime();
  return diffMs >= 0 && diffMs <= 72 * HOURS_MS;
}

/**
 * Returns the number of hours elapsed between two dates.
 * Always returns a non-negative value.
 */
export function getHoursElapsed(from: Date, to: Date): number {
  return Math.abs(to.getTime() - from.getTime()) / HOURS_MS;
}
