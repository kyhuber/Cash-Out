import { describe, expect, it } from "vitest";
import { shiftPay, type ShiftPayInput } from "./shift-pay";

const lumen = (over: Partial<ShiftPayInput>): ShiftPayInput => ({
  minutes_worked: 600,
  hourly_wage_at_time: 27.85,
  overtime_multiplier_at_time: 1.5,
  overtime_threshold_at_time: 8,
  tips_cash: 0,
  tips_card: 0,
  service_charge: 0,
  ...over,
});

describe("shiftPay", () => {
  /**
   * Straight off the Sep 25 2026 Lumen Field stub: 10.00 hours worked, paid as
   * 8.00 at 27.85 and 2.00 daily overtime at 41.78.
   */
  it("pays hours past the threshold at the rounded overtime rate", () => {
    const p = shiftPay(lumen({ minutes_worked: 600, tips_card: 861.29 }));
    expect(p.regularHours).toBe(8);
    expect(p.overtimeHours).toBe(2);
    expect(p.overtimeRate).toBe(41.78);
    expect(p.wages).toBe(222.8);
    // 2 x 41.78, not 2 x 41.775 — the employer rounds the rate first.
    expect(p.overtime).toBe(83.56);
    expect(p.onCheck).toBe(1167.65);
  });

  /** The Sep 11 stub: 8.92 hours, 0.92 of them overtime, paid 38.44. */
  it("handles a fractional overtime hour, rounding hours before multiplying", () => {
    const p = shiftPay(lumen({ minutes_worked: 535 })); // 8h55m = 8.92 hrs
    expect(p.overtimeHours).toBe(0.92);
    // 0.92 x 41.78. Multiplying the exact 0.9167 hours would give 38.30, and
    // the stub says 38.44, so the employer rounds the hours first.
    expect(p.overtime).toBe(38.44);
    expect(p.wages).toBe(222.8);
  });

  it("pays no overtime at exactly the threshold", () => {
    const p = shiftPay(lumen({ minutes_worked: 480 }));
    expect(p.overtimeHours).toBe(0);
    expect(p.overtime).toBe(0);
    expect(p.wages).toBe(222.8);
  });

  it("pays no overtime when the job did not pay it at the time", () => {
    const p = shiftPay(
      lumen({
        minutes_worked: 600,
        overtime_multiplier_at_time: null,
        overtime_threshold_at_time: null,
      }),
    );
    expect(p.overtimeRate).toBeNull();
    expect(p.overtimeHours).toBe(0);
    expect(p.wages).toBe(278.5);
  });

  it("needs both the multiplier and the threshold to apply overtime", () => {
    // A row backfilled with one but not the other must not half-apply it.
    const p = shiftPay(lumen({ overtime_threshold_at_time: null }));
    expect(p.overtime).toBe(0);
    expect(p.regularHours).toBe(10);
  });

  it("counts a service charge and card tips on the check, but not cash tips", () => {
    const p = shiftPay(
      lumen({
        minutes_worked: 480,
        service_charge: 300,
        tips_card: 110.72,
        tips_cash: 40,
      }),
    );
    expect(p.onCheck).toBe(222.8 + 300 + 110.72);
    expect(p.earned).toBe(222.8 + 300 + 110.72 + 40);
  });

  it("reports total hours to two places", () => {
    expect(shiftPay(lumen({ minutes_worked: 370 })).hours).toBe(6.17);
  });
});
