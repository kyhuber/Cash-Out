import {
  addDaysTo,
  minutesToHours,
  nextFridayAfter,
  payPeriodFor,
  type DateOnly,
  type PayPeriod,
  type PayPeriodType,
} from "@/lib/pay-period";

/** A stored shift, as much of it as any summary needs. */
export type ShiftRow = {
  id: string;
  workplace_id: string;
  shift_date: DateOnly;
  clock_in: string;
  clock_out: string;
  minutes_worked: number;
  tips_cash: number;
  tips_card: number;
  tip_out: number;
  hourly_wage_at_time: number;
  station: string | null;
};

export type PeriodSummary = {
  period: PayPeriod;
  shifts: number;
  hours: number;
  tips: number;
  /**
   * What the employer owes: hours x wage + tips. This is the number to hold
   * against a pay stub, which is the whole point of the app.
   *
   * Overtime is deliberately NOT applied. The multiplier is captured per
   * workplace but real weekly-threshold aggregation is out of scope, and a
   * half-implemented one would produce a number that looks authoritative and
   * isn't. Tax withholding is excluded for the same reason. Take-home after
   * tip-out is not computed here either: tip_out is stored per shift and
   * editable, but a paycheck does not show it, and this is the paycheck figure.
   */
  gross: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shifts belonging to `period`, by the date each shift STARTED. */
export function shiftsInPeriod(
  shifts: ShiftRow[],
  period: PayPeriod,
): ShiftRow[] {
  // Date-only ISO strings compare correctly as strings, so no parsing needed.
  return shifts.filter(
    (s) => s.shift_date >= period.start && s.shift_date <= period.end,
  );
}

export type SummaryWorkplace = {
  id: string;
  pay_period_type: PayPeriodType;
  pay_period_anchor_date: DateOnly | null;
  /** The one pay date read off a stub, used to check the Friday rule holds. */
  pay_date?: DateOnly | null;
  pay_period_end_date?: DateOnly | null;
};

/**
 * Totals for one pay period at one workplace.
 *
 * Each shift is valued at the wage stored ON THAT SHIFT, not the workplace's
 * current wage, so a raise part-way through a period doesn't retroactively
 * inflate the shifts worked before it.
 */
export function summarisePeriod(
  shifts: ShiftRow[],
  workplaceId: string,
  period: PayPeriod,
): PeriodSummary {
  const mine = shiftsInPeriod(
    shifts.filter((s) => s.workplace_id === workplaceId),
    period,
  );

  let minutes = 0;
  let tips = 0;
  let wages = 0;

  for (const s of mine) {
    minutes += s.minutes_worked;
    tips += s.tips_cash + s.tips_card;
    wages += (s.minutes_worked / 60) * s.hourly_wage_at_time;
  }

  return {
    period,
    shifts: mine.length,
    hours: minutesToHours(minutes),
    tips: round2(tips),
    gross: round2(wages + tips),
  };
}

export type Paycheck = {
  workplaceId: string;
  /** The Friday this period gets paid on. */
  payDate: DateOnly;
  period: PayPeriod;
  /**
   * True once the period has ended, so no further shift can be added to it and
   * the amount is final. While it is false the figure can only go up.
   */
  periodClosed: boolean;
  summary: PeriodSummary;
  /**
   * Set when the pay date read off the user's stub is not the Friday after that
   * period ended. Either the rule doesn't hold for this job or a date was
   * mistyped, and both are worth saying rather than quietly deriving from a
   * rule that doesn't apply here.
   */
  stubPayDateMismatch?: { recorded: DateOnly; expected: DateOnly };
};

/**
 * The next paycheck a workplace will pay, and what has been earned toward it.
 *
 * This is NOT the pay period containing today, and the difference is the whole
 * point. A period is paid after it closes, so in the stretch between a period
 * ending and its Friday, the money arriving next belongs to the period that has
 * already finished — while "the current period" has barely started. Showing the
 * current period there would answer a question nobody asked.
 *
 * Nothing here is forecast. It sums shifts already logged; a period still open
 * is reported as open rather than extrapolated.
 */
export function nextPaycheck(
  shifts: ShiftRow[],
  workplace: SummaryWorkplace,
  today: DateOnly,
): Paycheck {
  const periodFor = (date: DateOnly) =>
    payPeriodFor(
      date,
      workplace.pay_period_type,
      workplace.pay_period_anchor_date,
    );

  // Walk back far enough to catch a closed period still awaiting its Friday,
  // and forward one in case today falls after the last one was already paid.
  const candidates: PayPeriod[] = [];
  let cursor = periodFor(today);
  for (let i = 0; i < 3; i++) {
    candidates.unshift(cursor);
    cursor = periodFor(addDaysTo(cursor.start, -1));
  }
  candidates.push(periodFor(addDaysTo(candidates[candidates.length - 1].end, 1)));

  // The earliest pay date that has not already passed.
  const upcoming = candidates
    .map((period) => ({ period, payDate: nextFridayAfter(period.end) }))
    .filter((c) => c.payDate >= today)
    .sort((a, b) => a.payDate.localeCompare(b.payDate))[0];

  const { period, payDate } = upcoming;

  const mismatch =
    workplace.pay_date && workplace.pay_period_end_date
      ? (() => {
          const expected = nextFridayAfter(workplace.pay_period_end_date);
          return workplace.pay_date === expected
            ? undefined
            : { recorded: workplace.pay_date, expected };
        })()
      : undefined;

  return {
    workplaceId: workplace.id,
    payDate,
    period,
    periodClosed: period.end < today,
    summary: summarisePeriod(shifts, workplace.id, period),
    ...(mismatch ? { stubPayDateMismatch: mismatch } : {}),
  };
}
