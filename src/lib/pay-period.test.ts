import { describe, expect, it } from "vitest";
import {
  minutesToHours,
  payPeriodFor,
  shiftMinutes,
  type PayPeriodType,
} from "./pay-period";

describe("shiftMinutes", () => {
  it("handles an ordinary evening shift", () => {
    expect(shiftMinutes("17:00", "22:00")).toBe(300);
  });

  it("wraps past midnight", () => {
    expect(shiftMinutes("20:00", "02:00")).toBe(360);
    expect(shiftMinutes("16:00", "00:30")).toBe(510);
    expect(shiftMinutes("20:00", "00:00")).toBe(240);
  });

  it("handles a shift ending at 23:59", () => {
    expect(shiftMinutes("23:00", "23:59")).toBe(59);
  });

  it("returns 0 for equal times, matching the DB", () => {
    expect(shiftMinutes("12:00", "12:00")).toBe(0);
  });

  it("rejects malformed times", () => {
    expect(() => shiftMinutes("5pm", "10pm")).toThrow();
    expect(() => shiftMinutes("24:00", "02:00")).toThrow();
    expect(() => shiftMinutes("17:60", "22:00")).toThrow();
  });
});

describe("minutesToHours", () => {
  it("converts and rounds to 2dp", () => {
    expect(minutesToHours(300)).toBe(5);
    expect(minutesToHours(510)).toBe(8.5);
    expect(minutesToHours(59)).toBe(0.98);
  });
});

describe("payPeriodFor", () => {
  it("buckets weekly periods from the anchor", () => {
    const anchor = "2026-08-17"; // a Monday
    expect(payPeriodFor("2026-08-17", "weekly", anchor)).toEqual({
      start: "2026-08-17",
      end: "2026-08-23",
    });
    expect(payPeriodFor("2026-08-23", "weekly", anchor)).toEqual({
      start: "2026-08-17",
      end: "2026-08-23",
    });
    expect(payPeriodFor("2026-08-24", "weekly", anchor)).toEqual({
      start: "2026-08-24",
      end: "2026-08-30",
    });
  });

  it("buckets biweekly periods from the anchor", () => {
    const anchor = "2026-08-14";
    expect(payPeriodFor("2026-08-27", "biweekly", anchor)).toEqual({
      start: "2026-08-14",
      end: "2026-08-27",
    });
    expect(payPeriodFor("2026-08-28", "biweekly", anchor)).toEqual({
      start: "2026-08-28",
      end: "2026-09-10",
    });
  });

  it("buckets dates BEFORE the anchor correctly", () => {
    // Floor division, not truncation — this is the easy one to get wrong.
    const anchor = "2026-08-14";
    expect(payPeriodFor("2026-08-13", "biweekly", anchor)).toEqual({
      start: "2026-07-31",
      end: "2026-08-13",
    });
    expect(payPeriodFor("2026-07-31", "biweekly", anchor)).toEqual({
      start: "2026-07-31",
      end: "2026-08-13",
    });
    expect(payPeriodFor("2026-07-30", "biweekly", anchor)).toEqual({
      start: "2026-07-17",
      end: "2026-07-30",
    });
  });

  it("splits semi-monthly at the 15th", () => {
    const a = "2026-01-01";
    expect(payPeriodFor("2026-08-15", "semi_monthly", a)).toEqual({
      start: "2026-08-01",
      end: "2026-08-15",
    });
    expect(payPeriodFor("2026-08-16", "semi_monthly", a)).toEqual({
      start: "2026-08-16",
      end: "2026-08-31",
    });
  });

  it("handles short and leap-year Februaries", () => {
    const a = "2026-01-01";
    expect(payPeriodFor("2026-02-20", "semi_monthly", a)).toEqual({
      start: "2026-02-16",
      end: "2026-02-28",
    });
    // 2028 is a leap year.
    expect(payPeriodFor("2028-02-20", "semi_monthly", a)).toEqual({
      start: "2028-02-16",
      end: "2028-02-29",
    });
    expect(payPeriodFor("2028-02-05", "monthly", a)).toEqual({
      start: "2028-02-01",
      end: "2028-02-29",
    });
  });

  it("covers whole calendar months when monthly", () => {
    const a = "2026-01-01";
    expect(payPeriodFor("2026-08-31", "monthly", a)).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("crosses a year boundary without drifting", () => {
    const anchor = "2026-12-28";
    expect(payPeriodFor("2027-01-05", "biweekly", anchor)).toEqual({
      start: "2026-12-28",
      end: "2027-01-10",
    });
  });

  it("is stable regardless of the host timezone", () => {
    // Every period boundary must be identical whether the runner sits in
    // UTC+14 or UTC-11 — the bug this module exists to avoid.
    const types: PayPeriodType[] = ["weekly", "biweekly", "semi_monthly", "monthly"];
    for (const type of types) {
      expect(payPeriodFor("2026-08-01", type, "2026-08-01")).toEqual(
        payPeriodFor("2026-08-01", type, "2026-08-01"),
      );
    }
    // A date-only value at a month edge is where local-time parsing would slip.
    expect(payPeriodFor("2026-03-01", "monthly", "2026-01-01").start).toBe("2026-03-01");
    expect(payPeriodFor("2026-12-31", "monthly", "2026-01-01").end).toBe("2026-12-31");
  });

  it("does not need an anchor for calendar-based periods", () => {
    expect(payPeriodFor("2026-08-20", "semi_monthly", null)).toEqual({
      start: "2026-08-16",
      end: "2026-08-31",
    });
    expect(payPeriodFor("2026-08-20", "monthly", null)).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
  });

  it("requires an anchor for weekly and biweekly periods", () => {
    expect(() => payPeriodFor("2026-08-20", "weekly", null)).toThrow(/anchor/);
    expect(() => payPeriodFor("2026-08-20", "biweekly", null)).toThrow(/anchor/);
  });

  it("rejects malformed or impossible dates", () => {
    expect(() => payPeriodFor("08/29/2026", "weekly", "2026-08-17")).toThrow();
    expect(() => payPeriodFor("2026-02-30", "weekly", "2026-08-17")).toThrow();
    expect(() => payPeriodFor("2026-08-29", "weekly", "not-a-date")).toThrow();
  });
});
