import { describe, expect, it } from "vitest";
import {
  estimateTakeHome,
  federalWithholding,
  hasTaxTables,
} from "./paycheck-taxes";

/**
 * The four stubs this was built from. Gross, the W-4 settings inferred from
 * them, and every deduction line as printed.
 */
const stubs = [
  {
    name: "Lumen Field, paid 2026-09-25",
    gross: 1181.58,
    periodsPerYear: 26,
    twoJobs: true,
    federal: 99.87,
    socialSecurity: 73.25,
    medicare: 17.13,
    waPaidLeave: 9.53, // family 6.41 + medical 3.12
    waCares: 6.85,
    net: 974.95,
    unionDues: 0,
  },
  {
    name: "Lumen Field, paid 2026-09-11",
    gross: 638.23,
    periodsPerYear: 26,
    twoJobs: true,
    federal: 34.66,
    socialSecurity: 39.57,
    medicare: 9.26,
    waPaidLeave: 5.15,
    waCares: 3.7,
    net: 512.89,
    unionDues: 33,
  },
  {
    name: "Climate Pledge Arena, paid 2026-09-18",
    gross: 568.95,
    periodsPerYear: 52,
    twoJobs: false,
    federal: 26.35,
    socialSecurity: 35.27,
    medicare: 8.25,
    waPaidLeave: 4.59,
    waCares: 3.3,
    net: 491.19,
    unionDues: 0,
  },
  {
    name: "Climate Pledge Arena, paid 2026-09-11",
    gross: 240.51,
    periodsPerYear: 52,
    twoJobs: false,
    federal: 0,
    socialSecurity: 14.92,
    medicare: 3.49,
    waPaidLeave: 1.94,
    waCares: 1.39,
    net: 218.77,
    unionDues: 0,
  },
];

describe("federalWithholding", () => {
  for (const s of stubs) {
    it(`matches the ${s.name} stub to the cent`, () => {
      expect(
        federalWithholding(s.gross, s.periodsPerYear, "single", s.twoJobs, 2026),
      ).toBe(s.federal);
    });
  }

  it("withholds nothing below the standard deduction", () => {
    expect(federalWithholding(300, 52, "single", false, 2026)).toBe(0);
    expect(federalWithholding(600, 52, "married_jointly", false, 2026)).toBe(0);
  });

  it("withholds more with the two-jobs box ticked, on the same pay", () => {
    const plain = federalWithholding(800, 26, "single", false, 2026)!;
    const twoJobs = federalWithholding(800, 26, "single", true, 2026)!;
    expect(twoJobs).toBeGreaterThan(plain);
  });

  it("never withholds more of an extra dollar than the top rate", () => {
    let prev = federalWithholding(0, 26, "head_of_household", false, 2026)!;
    for (let gross = 100; gross <= 30_000; gross += 100) {
      const next = federalWithholding(gross, 26, "head_of_household", false, 2026)!;
      expect(next).toBeGreaterThanOrEqual(prev);
      expect(next - prev).toBeLessThanOrEqual(100 * 0.37 + 0.01);
      prev = next;
    }
  });

  it("refuses a year it has no table for, rather than reusing another", () => {
    expect(federalWithholding(1000, 26, "single", false, 2027)).toBeNull();
    expect(hasTaxTables(2027)).toBe(false);
    expect(hasTaxTables(2026)).toBe(true);
  });
});

describe("estimateTakeHome", () => {
  for (const s of stubs) {
    it(`reproduces the ${s.name} stub`, () => {
      const t = estimateTakeHome({
        gross: s.gross,
        year: 2026,
        periodsPerYear: s.periodsPerYear,
        filingStatus: "single",
        twoJobs: s.twoJobs,
        unionDues: s.unionDues,
      })!;
      const by = Object.fromEntries(t.deductions.map((d) => [d.key, d.amount]));

      expect(by.federal).toBe(s.federal);
      // The flat-rate lines land within a cent. Employers compute these
      // cumulatively on year-to-date pay, so the last cent depends on history
      // no single check carries.
      expect(by.social_security).toBeCloseTo(s.socialSecurity, 1);
      expect(by.medicare).toBeCloseTo(s.medicare, 1);
      expect(by.wa_paid_leave).toBeCloseTo(s.waPaidLeave, 1);
      expect(by.wa_cares).toBeCloseTo(s.waCares, 1);
      expect(Math.abs(t.net - s.net)).toBeLessThanOrEqual(0.02);
    });
  }

  it("lists union dues only when some come off this check", () => {
    const base = {
      gross: 500,
      year: 2026,
      periodsPerYear: 26,
      filingStatus: "single" as const,
      twoJobs: false,
    };
    const without = estimateTakeHome({ ...base, unionDues: 0 })!;
    const withDues = estimateTakeHome({ ...base, unionDues: 33 })!;
    expect(without.deductions.some((d) => d.key === "union_dues")).toBe(false);
    expect(withDues.deductions.find((d) => d.key === "union_dues")?.amount).toBe(33);
    expect(without.net - withDues.net).toBeCloseTo(33, 2);
  });

  it("returns null for a year with no tables", () => {
    expect(
      estimateTakeHome({
        gross: 500,
        year: 2027,
        periodsPerYear: 26,
        filingStatus: "single",
        twoJobs: false,
        unionDues: 0,
      }),
    ).toBeNull();
  });
});
