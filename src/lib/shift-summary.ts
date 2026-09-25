import {
  addDaysTo,
  nextFridayAfter,
  payPeriodFor,
  type DateOnly,
  type PayPeriod,
  type PayPeriodType,
} from "@/lib/pay-period";
import { round2, shiftPay } from "@/lib/shift-pay";
import {
  estimateTakeHome,
  type FilingStatus,
  type TakeHome,
} from "@/lib/paycheck-taxes";

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
  service_charge: number;
  hourly_wage_at_time: number;
  overtime_multiplier_at_time: number | null;
  overtime_threshold_at_time: number | null;
  station: string | null;
};

export type PeriodSummary = {
  period: PayPeriod;
  shifts: number;
  hours: number;
  overtimeHours: number;
  /** Regular hours x wage, summed per shift. */
  wages: number;
  /** Daily overtime pay, summed per shift. */
  overtime: number;
  serviceCharge: number;
  tipsCard: number;
  /** Taken home on the night; never on the check. Reported, not added in. */
  tipsCash: number;
  /**
   * What the employer owes ON THE CHECK: wages + overtime + service charge +
   * card tips. This is the number to hold against a pay stub, which is the
   * whole point of the app.
   *
   * Cash tips are not in it. Neither of Kyle's employers puts them on the
   * check, so a figure that included them would never match a stub. Tip-out
   * is not subtracted either: it happens afterwards, out of pocket, and no
   * paycheck shows it.
   */
  gross: number;
};

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
  /** W-4 settings on file with this employer. Default to a plain single W-4. */
  w4_filing_status?: FilingStatus;
  w4_two_jobs?: boolean;
  /** Flat dues taken from the first check of each month, or 0. */
  union_dues_monthly?: number;
};

/**
 * Totals for one pay period at one workplace.
 *
 * Each shift is valued at the wage and overtime terms stored ON THAT SHIFT,
 * not the workplace's current ones, so a raise part-way through a period
 * doesn't retroactively inflate the shifts worked before it. Per-shift
 * figures are rounded first and then summed, so the period total is exactly
 * the sum of the shift rows on screen.
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

  const totals = {
    hours: 0,
    overtimeHours: 0,
    wages: 0,
    overtime: 0,
    serviceCharge: 0,
    tipsCard: 0,
    tipsCash: 0,
    gross: 0,
  };

  for (const s of mine) {
    const p = shiftPay(s);
    totals.hours += p.hours;
    totals.overtimeHours += p.overtimeHours;
    totals.wages += p.wages;
    totals.overtime += p.overtime;
    totals.serviceCharge += p.serviceCharge;
    totals.tipsCard += p.tipsCard;
    totals.tipsCash += p.tipsCash;
    totals.gross += p.onCheck;
  }

  return {
    period,
    shifts: mine.length,
    hours: round2(totals.hours),
    overtimeHours: round2(totals.overtimeHours),
    wages: round2(totals.wages),
    overtime: round2(totals.overtime),
    serviceCharge: round2(totals.serviceCharge),
    tipsCard: round2(totals.tipsCard),
    tipsCash: round2(totals.tipsCash),
    gross: round2(totals.gross),
  };
}

const PERIODS_PER_YEAR: Record<PayPeriodType, number> = {
  weekly: 52,
  biweekly: 26,
  semi_monthly: 24,
  monthly: 12,
};

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
   * Gross to estimated net, line by line. Null when there are no tax tables
   * for the year this check is paid in — the card says so rather than
   * withholding against last year's numbers.
   */
  takeHome: TakeHome | null;
  /**
   * Set when the pay date read off the user's stub is not the Friday after that
   * period ended. Either the rule doesn't hold for this job or a date was
   * mistyped, and both are worth saying rather than quietly deriving from a
   * rule that doesn't apply here.
   */
  stubPayDateMismatch?: { recorded: DateOnly; expected: DateOnly };
};

/**
 * Whether `payDate` is the first pay date of its calendar month at this
 * workplace — the check union dues come off. Decided by looking at when the
 * period before was paid: if that was last month, this is the first.
 */
export function isFirstPayDateOfMonth(
  period: PayPeriod,
  payDate: DateOnly,
  workplace: SummaryWorkplace,
): boolean {
  const previous = payPeriodFor(
    addDaysTo(period.start, -1),
    workplace.pay_period_type,
    workplace.pay_period_anchor_date,
  );
  const previousPayDate = nextFridayAfter(previous.end);
  return previousPayDate.slice(0, 7) !== payDate.slice(0, 7);
}

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

  const summary = summarisePeriod(shifts, workplace.id, period);

  const dues = workplace.union_dues_monthly ?? 0;
  const takeHome = estimateTakeHome({
    gross: summary.gross,
    // Tax is withheld when paid, so the pay date's year picks the tables.
    year: Number(payDate.slice(0, 4)),
    periodsPerYear: PERIODS_PER_YEAR[workplace.pay_period_type],
    filingStatus: workplace.w4_filing_status ?? "single",
    twoJobs: workplace.w4_two_jobs ?? false,
    unionDues:
      dues > 0 && isFirstPayDateOfMonth(period, payDate, workplace) ? dues : 0,
  });

  return {
    workplaceId: workplace.id,
    payDate,
    period,
    periodClosed: period.end < today,
    summary,
    takeHome,
    ...(mismatch ? { stubPayDateMismatch: mismatch } : {}),
  };
}
