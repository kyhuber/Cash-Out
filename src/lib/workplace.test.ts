import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OPTIONAL_FIELD_KEYS,
  PAY_PERIOD_TYPES,
  optionalNumber,
  periodPrefill,
  toWorkplaceRow,
  workplaceSchema,
  type Workplace,
} from "./workplace";

/**
 * Every migration, in order, concatenated.
 *
 * Matching against the whole run rather than 0001 alone is what keeps these
 * tests honest: a constraint dropped and redefined by a later migration would
 * otherwise still be checked in its original form, and the assertion would
 * quietly be testing history instead of the live schema.
 */
const migrations = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"));

/** The LAST definition of a constraint wins, as it does in the database. */
function effectiveConstraint(pattern: RegExp): string {
  let found: string | null = null;
  for (const sql of migrations) {
    for (const m of sql.matchAll(pattern)) found = m[1];
  }
  expect(found, `no migration defines ${pattern}`).toBeTruthy();
  return found!;
}

/**
 * These tests are the reason the TypeScript lists and the SQL schema can't
 * silently drift apart. Adding a field in one place without the other fails here.
 */
describe("schema agreement with the database", () => {
  it("optional field keys match the optional_fields_known constraint", () => {
    const sqlKeys = effectiveConstraint(
      /constraint optional_fields_known\s+check \(optional_fields <@ array\[([^\]]+)\]/g,
    )
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .sort();

    expect(sqlKeys).toEqual([...OPTIONAL_FIELD_KEYS].sort());
  });

  it("pay period types match the pay_period_type enum", () => {
    const sqlValues = effectiveConstraint(
      /create type pay_period_type as enum \(([^)]+)\)/g,
    )
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .sort();

    expect(sqlValues).toEqual(PAY_PERIOD_TYPES.map((t) => t.value).sort());
  });
});

const valid = {
  name: "Lumen Field",
  hourly_wage: 20.76,
  // A real biweekly period and the date it was paid.
  period_start: "2026-08-03",
  period_end: "2026-08-16",
  pay_date: "2026-08-21",
  pay_period_type: null,
  overtime_enabled: false,
  overtime_multiplier: null,
  optional_fields: ["total_sales" as const],
};

describe("workplaceSchema", () => {
  it("accepts a well-formed workplace", () => {
    expect(workplaceSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name", () => {
    expect(workplaceSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a negative wage", () => {
    expect(
      workplaceSchema.safeParse({ ...valid, hourly_wage: -1 }).success,
    ).toBe(false);
  });

  it("requires a multiplier when overtime is enabled", () => {
    const r = workplaceSchema.safeParse({
      ...valid,
      overtime_enabled: true,
      overtime_multiplier: null,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["overtime_multiplier"]);
  });

  it("rejects an end date before the start", () => {
    const r = workplaceSchema.safeParse({
      ...valid,
      period_start: "2026-08-16",
      period_end: "2026-08-03",
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "period_end")).toBe(true);
  });

  it("rejects a period that matches no pay cadence", () => {
    const r = workplaceSchema.safeParse({
      ...valid,
      period_start: "2026-08-03",
      period_end: "2026-08-12", // 10 days
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "period_end")).toBe(true);
  });

  /**
   * The misreading the three-date form exists to catch: a pay date typed where
   * a period date belongs. Without this it saves fine and every later summary
   * is silently shifted.
   */
  it("rejects a pay date that falls before the period started", () => {
    const r = workplaceSchema.safeParse({ ...valid, pay_date: "2026-08-01" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === "pay_date")).toBe(true);
  });

  it("accepts a pay date on the last day of the period", () => {
    expect(
      workplaceSchema.safeParse({ ...valid, pay_date: "2026-08-16" }).success,
    ).toBe(true);
  });

  it("rejects a date that isn't real", () => {
    expect(
      workplaceSchema.safeParse({ ...valid, period_start: "2026-02-30" })
        .success,
    ).toBe(false);
  });

  it("requires a tiebreak only when two cadences fit", () => {
    // Feb 16-29 in a leap year is both 14 days and the back half of a month.
    const ambiguous = {
      ...valid,
      period_start: "2028-02-16",
      period_end: "2028-02-29",
      pay_date: "2028-03-03",
    };
    expect(workplaceSchema.safeParse(ambiguous).success).toBe(false);
    expect(
      workplaceSchema.safeParse({
        ...ambiguous,
        pay_period_type: "semi_monthly" as const,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown optional field keys", () => {
    expect(
      workplaceSchema.safeParse({ ...valid, optional_fields: ["bogus"] })
        .success,
    ).toBe(false);
  });
});

describe("toWorkplaceRow", () => {
  it("derives the cadence and keeps the start date as the anchor", () => {
    const row = toWorkplaceRow(workplaceSchema.parse(valid));
    expect(row.pay_period_type).toBe("biweekly");
    expect(row.pay_period_anchor_date).toBe("2026-08-03");
    expect(row.pay_period_end_date).toBe("2026-08-16");
    expect(row.pay_date).toBe("2026-08-21");
  });

  it("derives each cadence from its period shape", () => {
    const shapes = [
      ["2026-08-03", "2026-08-09", "weekly"],
      ["2026-08-03", "2026-08-16", "biweekly"],
      ["2026-08-01", "2026-08-15", "semi_monthly"],
      ["2026-08-16", "2026-08-31", "semi_monthly"],
      ["2026-08-01", "2026-08-31", "monthly"],
    ] as const;

    for (const [start, end, expected] of shapes) {
      const row = toWorkplaceRow(
        workplaceSchema.parse({
          ...valid,
          period_start: start,
          period_end: end,
          pay_date: "2026-09-04",
        }),
      );
      expect(row.pay_period_type, `${start}..${end}`).toBe(expected);
    }
  });

  it("uses the tiebreak when the dates are ambiguous", () => {
    const row = toWorkplaceRow(
      workplaceSchema.parse({
        ...valid,
        period_start: "2028-02-16",
        period_end: "2028-02-29",
        pay_date: "2028-03-03",
        pay_period_type: "semi_monthly" as const,
      }),
    );
    expect(row.pay_period_type).toBe("semi_monthly");
  });

  it("drops the overtime multiplier when overtime is off", () => {
    const row = toWorkplaceRow(
      workplaceSchema.parse({
        ...valid,
        overtime_enabled: false,
        overtime_multiplier: 1.5,
      }),
    );
    expect(row.overtime_multiplier).toBeNull();
  });
});

describe("periodPrefill", () => {
  const base: Workplace = {
    id: "w1",
    name: "Lumen Field",
    hourly_wage: 20.76,
    pay_period_type: "biweekly",
    pay_period_anchor_date: "2026-08-03",
    pay_period_end_date: "2026-08-16",
    pay_date: "2026-08-21",
    overtime_enabled: false,
    overtime_multiplier: null,
    optional_fields: [],
  };

  it("round-trips what was stored", () => {
    expect(periodPrefill(base, "2026-08-31")).toEqual({
      period_start: "2026-08-03",
      period_end: "2026-08-16",
      pay_date: "2026-08-21",
    });
  });

  /** Rows created before migration 0003 have neither an end nor a pay date. */
  it("fills in an end date a pre-0003 row never stored", () => {
    const legacy = { ...base, pay_period_end_date: null, pay_date: null };
    expect(periodPrefill(legacy, "2026-08-31")).toEqual({
      period_start: "2026-08-03",
      period_end: "2026-08-16",
      pay_date: "",
    });
  });

  it("falls back to the current period when there is no anchor at all", () => {
    const calendar: Workplace = {
      ...base,
      pay_period_type: "semi_monthly",
      pay_period_anchor_date: null,
      pay_period_end_date: null,
      pay_date: null,
    };
    expect(periodPrefill(calendar, "2026-08-31")).toEqual({
      period_start: "2026-08-16",
      period_end: "2026-08-31",
      pay_date: "",
    });
  });
});

describe("optionalNumber", () => {
  it("treats blank and missing as null", () => {
    expect(optionalNumber("")).toBeNull();
    expect(optionalNumber("   ")).toBeNull();
    expect(optionalNumber(null)).toBeNull();
  });

  it("parses numbers", () => {
    expect(optionalNumber("1.5")).toBe(1.5);
    expect(optionalNumber("20.76")).toBe(20.76);
  });

  it("returns NaN for junk so validation can reject it", () => {
    expect(optionalNumber("abc")).toBeNaN();
  });
});
