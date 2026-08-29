import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OPTIONAL_FIELD_KEYS,
  PAY_PERIOD_TYPES,
  needsAnchorDate,
  optionalNumber,
  workplaceSchema,
} from "./workplace";

const migration = readFileSync(
  "supabase/migrations/0001_initial_schema.sql",
  "utf8",
);

/**
 * These two tests are the reason the TypeScript lists and the SQL schema can't
 * silently drift apart. Adding a field in one place without the other fails here.
 */
describe("schema agreement with the database", () => {
  it("optional field keys match the optional_fields_known constraint", () => {
    const match = migration.match(
      /constraint optional_fields_known\s+check \(optional_fields <@ array\[([^\]]+)\]/,
    );
    expect(match, "could not find the constraint in the migration").toBeTruthy();

    const sqlKeys = match![1]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .sort();

    expect(sqlKeys).toEqual([...OPTIONAL_FIELD_KEYS].sort());
  });

  it("pay period types match the pay_period_type enum", () => {
    const match = migration.match(
      /create type pay_period_type as enum \(([^)]+)\)/,
    );
    expect(match, "could not find the enum in the migration").toBeTruthy();

    const sqlValues = match![1]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""))
      .sort();

    expect(sqlValues).toEqual(PAY_PERIOD_TYPES.map((t) => t.value).sort());
  });

  it("needsAnchorDate agrees with the PAY_PERIOD_TYPES table", () => {
    for (const t of PAY_PERIOD_TYPES) {
      expect(needsAnchorDate(t.value)).toBe(t.needsAnchor);
    }
  });
});

const valid = {
  name: "Lumen Field",
  hourly_wage: 20.76,
  pay_period_type: "biweekly" as const,
  pay_period_anchor_date: "2026-08-14",
  overtime_enabled: false,
  overtime_multiplier: null,
  optional_fields: ["total_sales" as const],
};

describe("workplaceSchema", () => {
  it("accepts a well-formed workplace", () => {
    expect(workplaceSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name", () => {
    const r = workplaceSchema.safeParse({ ...valid, name: "   " });
    expect(r.success).toBe(false);
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

  it("requires an anchor date for weekly and biweekly", () => {
    const r = workplaceSchema.safeParse({
      ...valid,
      pay_period_type: "weekly",
      pay_period_anchor_date: null,
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["pay_period_anchor_date"]);
  });

  it("allows a null anchor date for calendar-based periods", () => {
    expect(
      workplaceSchema.safeParse({
        ...valid,
        pay_period_type: "monthly",
        pay_period_anchor_date: null,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown optional field keys", () => {
    expect(
      workplaceSchema.safeParse({ ...valid, optional_fields: ["bogus"] }).success,
    ).toBe(false);
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
