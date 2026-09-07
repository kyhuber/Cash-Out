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
  tipOut: number;
  /**
   * What the employer owes: hours x wage + tips. This is the number to hold
   * against a pay stub, which is the whole point of the app, so it leads.
   *
   * Overtime is deliberately NOT applied. The multiplier is captured per
   * workplace but real weekly-threshold aggregation is a backlog item, and a
   * half-implemented one would produce a number that looks authoritative and
   * isn't. Tax withholding is a later phase for the same reason.
   */
  gross: number;
  /** What actually came home: gross less what was tipped out. */
  takeHome: number;
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
  let tipOut = 0;
  let wages = 0;

  for (const s of mine) {
    minutes += s.minutes_worked;
    tips += s.tips_cash + s.tips_card;
    tipOut += s.tip_out;
    wages += (s.minutes_worked / 60) * s.hourly_wage_at_time;
  }

  const gross = wages + tips;

  return {
    period,
    shifts: mine.length,
    hours: minutesToHours(minutes),
    tips: round2(tips),
    tipOut: round2(tipOut),
    gross: round2(gross),
    takeHome: round2(gross - tipOut),
  };
}

/** Totals per station, for comparing which bar actually tips better. */
export function byStation(
  shifts: ShiftRow[],
): { station: string; shifts: number; hours: number; tips: number; tipsPerHour: number }[] {
  const groups = new Map<string, ShiftRow[]>();
  for (const s of shifts) {
    if (!s.station) continue;
    const list = groups.get(s.station) ?? [];
    list.push(s);
    groups.set(s.station, list);
  }

  return [...groups.entries()]
    .map(([station, rows]) => {
      const minutes = rows.reduce((n, s) => n + s.minutes_worked, 0);
      const tips = rows.reduce((n, s) => n + s.tips_cash + s.tips_card, 0);
      const hours = minutesToHours(minutes);
      return {
        station,
        shifts: rows.length,
        hours,
        tips: round2(tips),
        // The comparison that matters: a long slow shift and a short busy one
        // aren't comparable on total tips alone.
        tipsPerHour: hours > 0 ? round2(tips / hours) : 0,
      };
    })
    .sort((a, b) => b.tipsPerHour - a.tipsPerHour);
}
