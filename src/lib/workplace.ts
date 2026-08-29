import { z } from "zod";
import type { PayPeriodType, DateOnly } from "@/lib/pay-period";

/**
 * The optional per-workplace tracked fields from PRD section 6.2.
 *
 * These keys MUST match the `optional_fields_known` check constraint in
 * supabase/migrations/0001_initial_schema.sql — workplace.test.ts asserts it.
 * Growing the list means a migration, which is deliberate: a fixed short list
 * beats a custom field-builder for v1.
 */
export const OPTIONAL_FIELDS = [
  { key: "total_sales", label: "Total sales", hint: "Not every job reports this" },
  { key: "tip_out", label: "Tip-out paid", hint: "What you paid out to support staff" },
  { key: "shift_type", label: "Event type", hint: "Concert, game, private event" },
  { key: "guest_count", label: "Number of guests", hint: "Covers served" },
  { key: "notes", label: "Notes", hint: "Anything worth remembering" },
] as const;

export type OptionalFieldKey = (typeof OPTIONAL_FIELDS)[number]["key"];

export const OPTIONAL_FIELD_KEYS: readonly OptionalFieldKey[] =
  OPTIONAL_FIELDS.map((f) => f.key);

export const PAY_PERIOD_TYPES = [
  { value: "weekly", label: "Weekly", needsAnchor: true },
  { value: "biweekly", label: "Every two weeks", needsAnchor: true },
  { value: "semi_monthly", label: "Twice a month (1st and 16th)", needsAnchor: false },
  { value: "monthly", label: "Monthly", needsAnchor: false },
] as const;

/** Human-readable name for a pay period type. */
export function payPeriodLabel(type: PayPeriodType): string {
  return PAY_PERIOD_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** Weekly and biweekly periods are measured from an anchor; the others aren't. */
export function needsAnchorDate(type: PayPeriodType): boolean {
  return type === "weekly" || type === "biweekly";
}

const money = z
  .number({ error: "Enter a number" })
  .min(0, { error: "Can't be negative" })
  .max(10_000, { error: "That looks too high — check the amount" });

/**
 * Mirrors every constraint the database enforces, so bad input is caught with a
 * useful message instead of a Postgres error. The DB remains the real backstop.
 */
export const workplaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "Give this workplace a name" })
      .max(100, { error: "That name is too long" }),
    hourly_wage: money,
    pay_period_type: z.enum(["weekly", "biweekly", "semi_monthly", "monthly"]),
    pay_period_anchor_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a date" })
      .nullable(),
    overtime_enabled: z.boolean(),
    overtime_multiplier: z
      .number()
      .min(1, { error: "Must be at least 1" })
      .max(5, { error: "That looks too high" })
      .nullable(),
    optional_fields: z.array(z.enum(OPTIONAL_FIELD_KEYS as [OptionalFieldKey, ...OptionalFieldKey[]])),
  })
  .refine((v) => !v.overtime_enabled || v.overtime_multiplier !== null, {
    error: "Enter the overtime rate (usually 1.5)",
    path: ["overtime_multiplier"],
  })
  .refine(
    (v) => !needsAnchorDate(v.pay_period_type) || v.pay_period_anchor_date !== null,
    {
      error: "Check a pay stub for the first day of a recent pay period",
      path: ["pay_period_anchor_date"],
    },
  );

export type WorkplaceInput = z.infer<typeof workplaceSchema>;

export type Workplace = WorkplaceInput & {
  id: string;
  pay_period_anchor_date: DateOnly | null;
};

/** Parses a form value that may be absent or blank into a number or null. */
export function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}
