import {
  minutesToHours,
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

/**
 * Totals for the pay period containing `today` at one workplace.
 *
 * Each shift is valued at the wage stored ON THAT SHIFT, not the workplace's
 * current wage, so a raise part-way through a period doesn't retroactively
 * inflate the shifts worked before it.
 */
export function periodSummary(
  shifts: ShiftRow[],
  workplace: {
    id: string;
    pay_period_type: PayPeriodType;
    pay_period_anchor_date: DateOnly | null;
  },
  today: DateOnly,
): PeriodSummary {
  const period = payPeriodFor(
    today,
    workplace.pay_period_type,
    workplace.pay_period_anchor_date,
  );

  const mine = shiftsInPeriod(
    shifts.filter((s) => s.workplace_id === workplace.id),
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
