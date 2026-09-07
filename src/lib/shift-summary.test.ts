import { describe, expect, it } from "vitest";
import { byStation, periodSummary, shiftsInPeriod, type ShiftRow } from "./shift-summary";

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
  hourly_wage_at_time: 20,
  station: null,
  ...over,
});

const biweekly = {
  id: "w1",
  pay_period_type: "biweekly" as const,
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

describe("periodSummary", () => {
  it("totals hours, tips and employer-owed gross", () => {
    const s = periodSummary(
      [
        shift({ id: "a", minutes_worked: 360, tips_card: 180, tips_cash: 40 }),
        shift({ id: "b", shift_date: "2026-09-05", minutes_worked: 300, tips_card: 100 }),
      ],
      biweekly,
      "2026-09-07",
    );
    expect(s.shifts).toBe(2);
    expect(s.hours).toBe(11);
    expect(s.tips).toBe(320);
    // 11 hrs x $20 = $220 wages, + $320 tips
    expect(s.gross).toBe(540);
  });

  it("subtracts tip-out for take-home but never from gross", () => {
    // Gross is what the employer owes and is the number checked against a pay
    // stub; tipping out happens after and must not reduce it.
    const s = periodSummary(
      [shift({ minutes_worked: 600, tips_card: 300, tip_out: 50 })],
      biweekly,
      "2026-09-07",
    );
    expect(s.gross).toBe(500);
    expect(s.takeHome).toBe(450);
    expect(s.tipOut).toBe(50);
  });

  it("values each shift at the wage it was worked at, not the current one", () => {
    // A raise part-way through a period must not inflate the shifts before it.
    const s = periodSummary(
      [
        shift({ id: "before", minutes_worked: 600, hourly_wage_at_time: 20 }),
        shift({
          id: "after",
          shift_date: "2026-09-06",
          minutes_worked: 600,
          hourly_wage_at_time: 25,
        }),
      ],
      biweekly,
      "2026-09-07",
    );
    expect(s.gross).toBe(10 * 20 + 10 * 25);
  });

  it("ignores other workplaces and other periods", () => {
    const s = periodSummary(
      [
        shift({ id: "mine" }),
        shift({ id: "theirs", workplace_id: "w2", minutes_worked: 999 }),
        shift({ id: "last period", shift_date: "2026-08-20" }),
      ],
      biweekly,
      "2026-09-07",
    );
    expect(s.shifts).toBe(1);
  });

  it("reports an empty period rather than failing", () => {
    const s = periodSummary([], biweekly, "2026-09-07");
    expect(s).toMatchObject({ shifts: 0, hours: 0, tips: 0, gross: 0 });
    expect(s.period).toEqual({ start: "2026-08-31", end: "2026-09-13" });
  });

  it("works for a calendar-based period with no anchor", () => {
    const s = periodSummary(
      [shift({ shift_date: "2026-09-20", minutes_worked: 60, tips_card: 10 })],
      { id: "w1", pay_period_type: "semi_monthly", pay_period_anchor_date: null },
      "2026-09-25",
    );
    expect(s.period).toEqual({ start: "2026-09-16", end: "2026-09-30" });
    expect(s.gross).toBe(30);
  });
});

describe("byStation", () => {
  it("ranks bars by tips per hour, not by total", () => {
    // A long slow shift and a short busy one are not comparable on totals.
    const ranked = byStation([
      shift({ id: "a", station: "Bar 309", minutes_worked: 600, tips_card: 300 }),
      shift({ id: "b", station: "Moët Lounge", minutes_worked: 180, tips_card: 240 }),
    ]);
    expect(ranked.map((r) => r.station)).toEqual(["Moët Lounge", "Bar 309"]);
    expect(ranked[0].tipsPerHour).toBe(80);
    expect(ranked[1].tipsPerHour).toBe(30);
  });

  it("groups repeat visits to one bar", () => {
    const ranked = byStation([
      shift({ id: "a", station: "Bar 309", minutes_worked: 300, tips_card: 100 }),
      shift({ id: "b", station: "Bar 309", minutes_worked: 300, tips_card: 200 }),
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ shifts: 2, hours: 10, tips: 300 });
  });

  it("skips shifts with no station", () => {
    expect(byStation([shift({ station: null })])).toEqual([]);
  });
});
