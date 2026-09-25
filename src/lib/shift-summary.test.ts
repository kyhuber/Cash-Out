import { describe, expect, it } from "vitest";
import {
  isFirstPayDateOfMonth,
  nextPaycheck,
  shiftsInPeriod,
  summarisePeriod,
  type ShiftRow,
  type SummaryWorkplace,
} from "./shift-summary";

const shift = (over: Partial<ShiftRow>): ShiftRow => ({
  id: "s1",
  workplace_id: "w1",
  shift_date: "2026-09-02",
  clock_in: "16:00",
  clock_out: "22:00",
  minutes_worked: 360,
  tips_cash: 0,
  tips_card: 0,
  tip_out: 0,
  service_charge: 0,
  hourly_wage_at_time: 20,
  overtime_multiplier_at_time: null,
  overtime_threshold_at_time: null,
  station: null,
  ...over,
});

// Anchored on Monday 31 Aug 2026, so every period runs Mon-Sun and is paid the
// Friday after it ends: Aug 31-Sep 13 pays Sep 18, Sep 14-27 pays Oct 2.
const biweekly: SummaryWorkplace = {
  id: "w1",
  pay_period_type: "biweekly",
  pay_period_anchor_date: "2026-08-31",
};

describe("shiftsInPeriod", () => {
  it("includes both boundary days", () => {
    const rows = [
      shift({ id: "before", shift_date: "2026-08-30" }),
      shift({ id: "first", shift_date: "2026-08-31" }),
      shift({ id: "last", shift_date: "2026-09-13" }),
      shift({ id: "after", shift_date: "2026-09-14" }),
    ];
    const ids = shiftsInPeriod(rows, {
      start: "2026-08-31",
      end: "2026-09-13",
    }).map((s) => s.id);
    expect(ids).toEqual(["first", "last"]);
  });
});

const period = { start: "2026-08-31", end: "2026-09-13" };

describe("summarisePeriod", () => {
  it("totals hours, tips and what lands on the check", () => {
    const s = summarisePeriod(
      [
        shift({ id: "a", minutes_worked: 360, tips_card: 180, tips_cash: 40 }),
        shift({ id: "b", shift_date: "2026-09-05", minutes_worked: 300, tips_card: 100 }),
      ],
      "w1",
      period,
    );
    expect(s.shifts).toBe(2);
    expect(s.hours).toBe(11);
    expect(s.wages).toBe(220);
    expect(s.tipsCard).toBe(280);
    expect(s.tipsCash).toBe(40);
    // 11 hrs x $20 = $220 wages, + $280 card tips. The $40 cash was taken
    // home on the night and is not on the check.
    expect(s.gross).toBe(500);
  });

  it("counts a service charge as pay on the check", () => {
    const s = summarisePeriod(
      [shift({ minutes_worked: 600, service_charge: 300 })],
      "w1",
      period,
    );
    expect(s.serviceCharge).toBe(300);
    expect(s.gross).toBe(200 + 300);
  });

  it("applies daily overtime from the terms stored on each shift", () => {
    const s = summarisePeriod(
      [
        shift({
          id: "long",
          minutes_worked: 600,
          overtime_multiplier_at_time: 1.5,
          overtime_threshold_at_time: 8,
        }),
        shift({
          id: "no-ot-then",
          shift_date: "2026-09-03",
          minutes_worked: 600,
        }),
      ],
      "w1",
      period,
    );
    expect(s.overtimeHours).toBe(2);
    expect(s.wages).toBe(8 * 20 + 10 * 20);
    expect(s.overtime).toBe(2 * 30);
    expect(s.gross).toBe(360 + 60);
  });

  it("never lets tip-out reduce what the employer owes", () => {
    // Gross is the number checked against a pay stub; tipping out happens
    // afterwards, out of pocket, and never appears on the paycheck.
    const s = summarisePeriod(
      [shift({ minutes_worked: 600, tips_card: 300, tip_out: 50 })],
      "w1",
      period,
    );
    expect(s.gross).toBe(500);
  });

  it("values each shift at the wage it was worked at, not the current one", () => {
    // A raise part-way through a period must not inflate the shifts before it.
    const s = summarisePeriod(
      [
        shift({ id: "before", minutes_worked: 600, hourly_wage_at_time: 20 }),
        shift({
          id: "after",
          shift_date: "2026-09-06",
          minutes_worked: 600,
          hourly_wage_at_time: 25,
        }),
      ],
      "w1",
      period,
    );
    expect(s.gross).toBe(10 * 20 + 10 * 25);
  });

  it("ignores other workplaces and other periods", () => {
    const s = summarisePeriod(
      [
        shift({ id: "mine" }),
        shift({ id: "theirs", workplace_id: "w2", minutes_worked: 999 }),
        shift({ id: "last period", shift_date: "2026-08-20" }),
      ],
      "w1",
      period,
    );
    expect(s.shifts).toBe(1);
  });

  it("reports an empty period rather than failing", () => {
    expect(summarisePeriod([], "w1", period)).toMatchObject({
      shifts: 0,
      hours: 0,
      tipsCard: 0,
      tipsCash: 0,
      gross: 0,
    });
  });
});

describe("nextPaycheck", () => {
  it("pays a period on the Friday after it ends", () => {
    const p = nextPaycheck([], biweekly, "2026-09-07");
    expect(p.period).toEqual({ start: "2026-08-31", end: "2026-09-13" });
    expect(p.payDate).toBe("2026-09-18");
  });

  it("marks a period still running as open", () => {
    const p = nextPaycheck([], biweekly, "2026-09-07");
    expect(p.periodClosed).toBe(false);
  });

  /**
   * The case this whole feature exists for. On Sep 15 the period containing
   * today is Sep 14-27, which has barely started — but the money actually
   * arriving next is Sep 18, for the period that closed on Sep 13. Showing
   * "the current period" here answers a question nobody asked.
   */
  it("pays a period that has already closed before the one containing today", () => {
    const p = nextPaycheck([], biweekly, "2026-09-15");
    expect(p.period).toEqual({ start: "2026-08-31", end: "2026-09-13" });
    expect(p.payDate).toBe("2026-09-18");
    expect(p.periodClosed).toBe(true);
  });

  it("still counts the cheque arriving today as the next one", () => {
    const p = nextPaycheck([], biweekly, "2026-09-18");
    expect(p.payDate).toBe("2026-09-18");
  });

  it("moves on the day after a pay date passes", () => {
    const p = nextPaycheck([], biweekly, "2026-09-19");
    expect(p.period).toEqual({ start: "2026-09-14", end: "2026-09-27" });
    expect(p.payDate).toBe("2026-10-02");
  });

  it("sums only the shifts belonging to that period", () => {
    const shifts = [
      shift({ id: "in", shift_date: "2026-09-02", minutes_worked: 360, tips_card: 300 }),
      shift({ id: "out", shift_date: "2026-09-20", minutes_worked: 360, tips_card: 999 }),
    ];
    const p = nextPaycheck(shifts, biweekly, "2026-09-15");
    expect(p.summary.shifts).toBe(1);
    expect(p.summary.gross).toBe(6 * 20 + 300);
  });

  it("handles a twice-monthly schedule, whose lag is not a fixed number of days", () => {
    // Sep 16-30 ends on a Wednesday and is paid Oct 2; Oct 1-15 ends on a
    // Thursday and is paid Oct 16. A constant day-lag would get one of them
    // wrong, which is why the rule is "the next Friday", not "+N days".
    const semi: SummaryWorkplace = {
      id: "w1",
      pay_period_type: "semi_monthly",
      pay_period_anchor_date: null,
    };
    const p = nextPaycheck([], semi, "2026-10-01");
    expect(p.period).toEqual({ start: "2026-09-16", end: "2026-09-30" });
    expect(p.payDate).toBe("2026-10-02");
    expect(p.periodClosed).toBe(true);

    const later = nextPaycheck([], semi, "2026-10-05");
    expect(later.period).toEqual({ start: "2026-10-01", end: "2026-10-15" });
    expect(later.payDate).toBe("2026-10-16");
  });

  it("never returns a pay date in the past, across a year of days", () => {
    let today = "2026-01-01";
    for (let i = 0; i < 365; i++) {
      const p = nextPaycheck([], biweekly, today);
      expect(p.payDate >= today, `${today} -> ${p.payDate}`).toBe(true);
      // and the period it pays for must have ended before it is paid
      expect(p.period.end < p.payDate, `${today}`).toBe(true);
      const [y, m, d] = today.split("-").map(Number);
      today = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    }
  });

  it("flags a stub pay date that isn't the Friday after its period", () => {
    const odd: SummaryWorkplace = {
      ...biweekly,
      pay_period_end_date: "2026-09-13",
      pay_date: "2026-09-21", // a Monday, not the Friday after
    };
    expect(nextPaycheck([], odd, "2026-09-07").stubPayDateMismatch).toEqual({
      recorded: "2026-09-21",
      expected: "2026-09-18",
    });
  });

  it("says nothing when the stub agrees with the rule", () => {
    const ok: SummaryWorkplace = {
      ...biweekly,
      pay_period_end_date: "2026-09-13",
      pay_date: "2026-09-18",
    };
    expect(nextPaycheck([], ok, "2026-09-07").stubPayDateMismatch).toBeUndefined();
  });

  it("says nothing when the workplace predates the stored pay date", () => {
    expect(nextPaycheck([], biweekly, "2026-09-07").stubPayDateMismatch).toBeUndefined();
  });
});

describe("nextPaycheck take-home", () => {
  it("estimates net from the workplace's W-4 settings", () => {
    const p = nextPaycheck(
      [shift({ minutes_worked: 600, tips_card: 300 })],
      { ...biweekly, w4_filing_status: "single", w4_two_jobs: true },
      "2026-09-07",
    );
    expect(p.summary.gross).toBe(500);
    expect(p.takeHome).not.toBeNull();
    expect(p.takeHome!.net).toBeLessThan(500);
    expect(p.takeHome!.deductions.map((d) => d.key)).toEqual([
      "federal",
      "social_security",
      "medicare",
      "wa_paid_leave",
      "wa_cares",
    ]);
  });

  it("says nothing about net for a year it has no tables for", () => {
    const p = nextPaycheck([], biweekly, "2027-03-01");
    expect(p.takeHome).toBeNull();
  });

  /**
   * Off the Lumen stubs: the period paid Sep 11 carried $33 of dues, the one
   * paid Sep 25 did not. Dues come off the first check of the month.
   */
  it("takes union dues off the first check of the month only", () => {
    // Anchored on Sat 22 Aug 2026: Aug 22-Sep 4 pays Sep 11, Sep 5-18 pays Sep 25.
    const lumen: SummaryWorkplace = {
      id: "w1",
      pay_period_type: "biweekly",
      pay_period_anchor_date: "2026-08-22",
      union_dues_monthly: 33,
    };
    const first = nextPaycheck([shift({ shift_date: "2026-08-25" })], lumen, "2026-09-06");
    expect(first.payDate).toBe("2026-09-11");
    expect(first.takeHome!.deductions.find((d) => d.key === "union_dues")?.amount).toBe(33);

    const second = nextPaycheck([shift({ shift_date: "2026-09-10" })], lumen, "2026-09-20");
    expect(second.payDate).toBe("2026-09-25");
    expect(second.takeHome!.deductions.some((d) => d.key === "union_dues")).toBe(false);
  });
});

describe("isFirstPayDateOfMonth", () => {
  it("looks at when the period before was paid", () => {
    // Weekly, Mon-Sun, paid the Friday after: Aug 31-Sep 6 pays Sep 11 and the
    // one before it paid Sep 4, so Sep 11 is not the first check of September.
    const weekly: SummaryWorkplace = {
      id: "w1",
      pay_period_type: "weekly",
      pay_period_anchor_date: "2026-08-31",
    };
    expect(
      isFirstPayDateOfMonth({ start: "2026-08-31", end: "2026-09-06" }, "2026-09-11", weekly),
    ).toBe(false);
    expect(
      isFirstPayDateOfMonth({ start: "2026-08-24", end: "2026-08-30" }, "2026-09-04", weekly),
    ).toBe(true);
  });
});
