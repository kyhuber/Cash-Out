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
  /** Card tips as earned, before tip-out. */
  tipsCard: number;
  /** Taken home on the night; never on the check. Reported, not added in. */
  tipsCash: number;
  /** Paid out to support staff, which the employer takes off the card tips. */
  tipOut: number;
  /**
   * What the employer owes ON THE CHECK: wages + overtime + service charge +
   * card tips - tip-out. This is the number to hold against a pay stub, which
   * is the whole point of the app.
   *
   * Cash tips are not in it. Neither of Kyle's employers puts them on the
   * check, so a figure that included them would never match a stub. Tip-out
   * IS subtracted: Lumen pays card tips net of it, so the stub's gratuity line
   * is already the smaller figure.
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
    tipOut: 0,
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
    totals.tipOut += p.tipOut;
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
    tipOut: round2(totals.tipOut),
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
 * Whether a pay date read off the user's stub disagrees with the Friday rule.
 *
 * Either the rule doesn't hold for this job or a date was mistyped, and both
 * are worth saying rather than quietly deriving from a rule that doesn't apply
 * here. Undefined when they agree, or when the workplace has no stub dates.
 */
export function stubPayDateMismatch(
  workplace: SummaryWorkplace,
): { recorded: DateOnly; expected: DateOnly } | undefined {
  if (!workplace.pay_date || !workplace.pay_period_end_date) return undefined;
  const expected = nextFridayAfter(workplace.pay_period_end_date);
  return workplace.pay_date === expected
    ? undefined
    : { recorded: workplace.pay_date, expected };
}

/** The check that pays `period`, and what has been logged toward it. */
function paycheckFor(
  shifts: ShiftRow[],
  workplace: SummaryWorkplace,
  period: PayPeriod,
  today: DateOnly,
): Paycheck {
  const payDate = nextFridayAfter(period.end);
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
  };
}

/**
 * Every check a workplace has yet to pay whose period has already started,
 * soonest first. The first is the NEXT paycheck, and it is the headline.
 *
 * This is NOT the pay period containing today, and the difference is the whole
 * point. A period is paid after it closes, so in the stretch between a period
 * ending and its Friday, the money arriving next belongs to the period that has
 * already finished — while the period containing today, where a shift worked
 * tonight lands, is paid on the check after that. In that stretch there are
 * two; the rest of the time there is one, because a check for a period that
 * hasn't started could only ever read $0.
 *
 * Nothing here is forecast. It sums shifts already logged; a period still open
 * is reported as open rather than extrapolated.
 */
export function upcomingPaychecks(
  shifts: ShiftRow[],
  workplace: SummaryWorkplace,
  today: DateOnly,
): Paycheck[] {
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

  // Pay dates not yet passed, for periods already begun, soonest first. Never
  // empty: the period containing today qualifies, since it is paid after it ends.
  return candidates
    .filter(
      (period) =>
        period.start <= today && nextFridayAfter(period.end) >= today,
    )
    .sort((a, b) => a.end.localeCompare(b.end))
    .map((period) => paycheckFor(shifts, workplace, period, today));
}

/** The check a workplace pays next. See `upcomingPaychecks`. */
export function nextPaycheck(
  shifts: ShiftRow[],
  workplace: SummaryWorkplace,
  today: DateOnly,
): Paycheck {
  return upcomingPaychecks(shifts, workplace, today)[0];
}

/** How far back the past-paychecks page reaches, by pay date. */
export const PAST_PAYCHECK_MONTHS = 6;

/** The date `months` calendar months before `date`, clamped to month end. */
export function monthsBefore(date: DateOnly, months: number): DateOnly {
  const [y, m, d] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 - months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 - months, Math.min(d, lastDay)))
    .toISOString()
    .slice(0, 10);
}

/**
 * Checks already paid in the last `PAST_PAYCHECK_MONTHS` months, newest first —
 * what to hold a stub against once it has arrived.
 *
 * Periods with nothing logged are kept, as $0 checks: a gap in the middle is
 * worth seeing, since it may be a shift that was never logged. They start from
 * the first period with a shift in it, though, so a job added last month
 * doesn't open on five months of empty checks from before it was used.
 */
export function pastPaychecks(
  shifts: ShiftRow[],
  workplace: SummaryWorkplace,
  today: DateOnly,
): Paycheck[] {
  const mine = shifts.filter((s) => s.workplace_id === workplace.id);
  if (mine.length === 0) return [];
  const firstShift = mine.reduce(
    (min, s) => (s.shift_date < min ? s.shift_date : min),
    mine[0].shift_date,
  );
  const since = monthsBefore(today, PAST_PAYCHECK_MONTHS);

  const checks: Paycheck[] = [];
  let period = payPeriodFor(
    today,
    workplace.pay_period_type,
    workplace.pay_period_anchor_date,
  );
  while (period.end >= firstShift) {
    const payDate = nextFridayAfter(period.end);
    if (payDate < since) break;
    if (payDate < today) {
      checks.push(paycheckFor(shifts, workplace, period, today));
    }
    period = payPeriodFor(
      addDaysTo(period.start, -1),
      workplace.pay_period_type,
      workplace.pay_period_anchor_date,
    );
  }
  return checks;
}
