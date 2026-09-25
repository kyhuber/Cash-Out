import { minutesToHours } from "@/lib/pay-period";

/** Everything the pay for one shift depends on — all of it stored ON the shift. */
export type ShiftPayInput = {
  minutes_worked: number;
  hourly_wage_at_time: number;
  overtime_multiplier_at_time: number | null;
  overtime_threshold_at_time: number | null;
  tips_cash: number;
  tips_card: number;
  service_charge: number;
};

export type ShiftPay = {
  /** Total hours, 2dp. */
  hours: number;
  regularHours: number;
  overtimeHours: number;
  /** The overtime hourly rate, rounded to cents the way the employer does. */
  overtimeRate: number | null;
  /** Regular hours x wage. */
  wages: number;
  /** Overtime hours x overtime rate. */
  overtime: number;
  serviceCharge: number;
  tipsCard: number;
  tipsCash: number;
  /**
   * What lands on the paycheck for this shift: wages + overtime + service
   * charge + card tips. Cash tips are NOT here — neither employer puts them on
   * the check, and the check is what this figure is held against.
   */
  onCheck: number;
  /** Everything the shift earned, cash tips included. */
  earned: number;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pay for one shift, from what was stored on it.
 *
 * Overtime is DAILY: hours past the threshold in this one shift are paid at
 * the multiplier. Both were snapshotted when the shift was saved, so a later
 * change of terms cannot reach backwards. Weekly 40-hour overtime is not
 * modelled — at two employers it would not combine anyway.
 *
 * Rounding follows the stubs, because matching the employer's arithmetic is
 * the point. Hours are rounded to hundredths BEFORE multiplying (55 minutes
 * is paid as 0.92 hours), and the overtime rate is rounded to cents before
 * multiplying (27.85 x 1.5 is paid as 41.78/hr, so 2 hours of it is 83.56,
 * not 83.55). It also means the money shown is exactly the hours shown times
 * the rate shown, which anyone can check with a calculator.
 */
export function shiftPay(s: ShiftPayInput): ShiftPay {
  const hours = minutesToHours(s.minutes_worked);

  const paysOvertime =
    s.overtime_multiplier_at_time !== null &&
    s.overtime_threshold_at_time !== null;

  const overtimeHours = paysOvertime
    ? round2(Math.max(0, hours - s.overtime_threshold_at_time!))
    : 0;
  const regularHours = round2(hours - overtimeHours);

  const overtimeRate = paysOvertime
    ? round2(s.hourly_wage_at_time * s.overtime_multiplier_at_time!)
    : null;

  const wages = round2(regularHours * s.hourly_wage_at_time);
  const overtime = overtimeRate === null ? 0 : round2(overtimeHours * overtimeRate);
  const serviceCharge = round2(s.service_charge);
  const tipsCard = round2(s.tips_card);
  const tipsCash = round2(s.tips_cash);
  const onCheck = round2(wages + overtime + serviceCharge + tipsCard);

  return {
    hours,
    regularHours,
    overtimeHours,
    overtimeRate,
    wages,
    overtime,
    serviceCharge,
    tipsCard,
    tipsCash,
    onCheck,
    earned: round2(onCheck + tipsCash),
  };
}
