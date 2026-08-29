/**
 * Pay-period bucketing and shift duration.
 *
 * Everything here works on plain `YYYY-MM-DD` strings and UTC-based Dates.
 * Date-only values parsed in local time drift by a day either side of
 * midnight depending on the runner's timezone, which would silently file a
 * shift into the wrong pay period — the one error this app exists to prevent.
 */

export type PayPeriodType = "weekly" | "biweekly" | "semi_monthly" | "monthly";

/** A calendar date with no time or zone, formatted `YYYY-MM-DD`. */
export type DateOnly = string;

export type PayPeriod = { start: DateOnly; end: DateOnly };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

function parse(date: DateOnly): Date {
  if (!DATE_RE.test(date)) {
    throw new Error(`Expected a YYYY-MM-DD date, got "${date}"`);
  }
  const [y, m, d] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  // Rejects impossible dates like 2026-02-30, which Date.UTC would roll over.
  if (
    parsed.getUTCFullYear() !== y ||
    parsed.getUTCMonth() !== m - 1 ||
    parsed.getUTCDate() !== d
  ) {
    throw new Error(`Not a real calendar date: "${date}"`);
  }
  return parsed;
}

function format(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * The pay period containing `date`.
 *
 * `anchor` is the FIRST DAY of any known pay period — not the pay date, which
 * usually falls after the period it pays for. Weekly and biweekly periods are
 * measured from the anchor and require one; semi-monthly and monthly are fixed
 * to the calendar, so the anchor is unused and may be null. This mirrors the
 * anchor_required_for_offset_periods constraint in migration 0002.
 */
export function payPeriodFor(
  date: DateOnly,
  type: PayPeriodType,
  anchor: DateOnly | null,
): PayPeriod {
  const d = parse(date);

  if (type === "weekly" || type === "biweekly") {
    if (anchor === null) {
      throw new Error(`A ${type} pay period needs an anchor date`);
    }
    const a = parse(anchor);
    const length = type === "weekly" ? 7 : 14;
    // Math.floor (not truncation) so dates before the anchor bucket correctly.
    const index = Math.floor((d.getTime() - a.getTime()) / MS_PER_DAY / length);
    const start = addDays(a, index * length);
    return { start: format(start), end: format(addDays(start, length - 1)) };
  }

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();

  if (type === "semi_monthly") {
    return d.getUTCDate() <= 15
      ? { start: format(new Date(Date.UTC(year, month, 1))), end: format(new Date(Date.UTC(year, month, 15))) }
      : {
          start: format(new Date(Date.UTC(year, month, 16))),
          end: format(new Date(Date.UTC(year, month, lastDayOfMonth(year, month)))),
        };
  }

  return {
    start: format(new Date(Date.UTC(year, month, 1))),
    end: format(new Date(Date.UTC(year, month, lastDayOfMonth(year, month)))),
  };
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Minutes worked between two `HH:MM` clock times, wrapping past midnight when
 * the out-time is earlier than the in-time. Mirrors the `minutes_worked`
 * generated column in 0001_initial_schema.sql — keep the two in step.
 */
export function shiftMinutes(clockIn: string, clockOut: string): number {
  const start = TIME_RE.exec(clockIn);
  const end = TIME_RE.exec(clockOut);
  if (!start || !end) {
    throw new Error(`Expected HH:MM times, got "${clockIn}" and "${clockOut}"`);
  }

  const startMin = Number(start[1]) * 60 + Number(start[2]);
  const endMin = Number(end[1]) * 60 + Number(end[2]);

  // Matches the DB's `case when clock_out < clock_in` exactly, including the
  // equal-times case (0, not 1440) that the shift_has_duration constraint rejects.
  return endMin < startMin ? endMin - startMin + 1440 : endMin - startMin;
}

/** Minutes as decimal hours, rounded to 2dp for display and pay math. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}
