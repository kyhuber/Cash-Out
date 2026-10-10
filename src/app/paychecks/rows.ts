import type { ShiftRow, SummaryWorkplace } from "@/lib/shift-summary";
import type { DateOnly, PayPeriodType } from "@/lib/pay-period";
import type { FilingStatus } from "@/lib/paycheck-taxes";

/**
 * The query columns and row coercion every paycheck view shares, so the home
 * page and the past-paychecks page can never value a shift differently.
 */

export const SHIFT_COLUMNS =
  "id, workplace_id, station, shift_date, clock_in, clock_out, minutes_worked, tips_cash, tips_card, tip_out, service_charge, hourly_wage_at_time, overtime_multiplier_at_time, overtime_threshold_at_time";

export const PAYCHECK_WORKPLACE_COLUMNS =
  "id, name, pay_period_type, pay_period_anchor_date, pay_period_end_date, pay_date, w4_filing_status, w4_two_jobs, union_dues_monthly";

export type PaycheckWorkplace = SummaryWorkplace & { name: string };

const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/**
 * Postgres numerics arrive as strings over PostgREST; coerce once, here, so
 * nothing downstream has to remember to.
 */
export function toShiftRow(s: Record<keyof ShiftRow, unknown>): ShiftRow {
  return {
    id: String(s.id),
    workplace_id: String(s.workplace_id),
    station: s.station === null ? null : String(s.station),
    shift_date: String(s.shift_date) as DateOnly,
    clock_in: String(s.clock_in).slice(0, 5),
    clock_out: String(s.clock_out).slice(0, 5),
    minutes_worked: Number(s.minutes_worked),
    tips_cash: Number(s.tips_cash),
    tips_card: Number(s.tips_card),
    tip_out: Number(s.tip_out),
    service_charge: Number(s.service_charge),
    hourly_wage_at_time: Number(s.hourly_wage_at_time),
    overtime_multiplier_at_time: numOrNull(s.overtime_multiplier_at_time),
    overtime_threshold_at_time: numOrNull(s.overtime_threshold_at_time),
  };
}

export function toPaycheckWorkplace(
  w: Record<keyof PaycheckWorkplace, unknown>,
): PaycheckWorkplace {
  return {
    id: String(w.id),
    name: String(w.name),
    pay_period_type: w.pay_period_type as PayPeriodType,
    pay_period_anchor_date: (w.pay_period_anchor_date ?? null) as DateOnly | null,
    pay_period_end_date: (w.pay_period_end_date ?? null) as DateOnly | null,
    pay_date: (w.pay_date ?? null) as DateOnly | null,
    w4_filing_status: w.w4_filing_status as FilingStatus,
    w4_two_jobs: Boolean(w.w4_two_jobs),
    union_dues_monthly: Number(w.union_dues_monthly ?? 0),
  };
}
