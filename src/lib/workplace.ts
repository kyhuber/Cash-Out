import { z } from "zod";
import {
  isDateOnly,
  payPeriodEndFor,
  payPeriodFor,
  payPeriodTypesMatching,
  type PayPeriodType,
  type DateOnly,
} from "@/lib/pay-period";

/**
 * The optional per-workplace tracked fields from PRD section 6.2.
 *
 * These keys MUST match the `optional_fields_known` check constraint, as last
 * defined across supabase/migrations — workplace.test.ts asserts it. Growing
 * the list means a migration, which is deliberate: a fixed short list beats a
 * custom field-builder for v1.
 */
export const OPTIONAL_FIELDS = [
  {
    key: "station",
    label: "Bar or lounge",
    hint: "Which bar inside the venue — same wage, different tips",
  },
  { key: "total_sales", label: "Total sales", hint: "Not every job reports this" },
  { key: "tip_out", label: "Tip-out paid", hint: "What you paid out to support staff" },
  { key: "shift_type", label: "Event type", hint: "Concert, game, private event" },
  { key: "guest_count", label: "Number of guests", hint: "Covers served" },
  { key: "notes", label: "Notes", hint: "Anything worth remembering" },
] as const;

export type OptionalFieldKey = (typeof OPTIONAL_FIELDS)[number]["key"];

export const OPTIONAL_FIELD_KEYS: readonly OptionalFieldKey[] =
  OPTIONAL_FIELDS.map((f) => f.key);

/**
 * The pay cadences the app understands. Users are never asked to pick one —
 * it's derived from two dates off a pay stub — so these labels exist to show
 * back what was derived. The paycheck count is the detail that makes the
 * derivation checkable: "every two weeks" and "twice a month" sound identical
 * and differ by two paychecks a year.
 */
export const PAY_PERIOD_TYPES = [
  { value: "weekly", label: "Weekly", paychecksPerYear: 52 },
  { value: "biweekly", label: "Every two weeks", paychecksPerYear: 26 },
  { value: "semi_monthly", label: "Twice a month", paychecksPerYear: 24 },
  { value: "monthly", label: "Monthly", paychecksPerYear: 12 },
] as const;

/** Human-readable name for a pay period type. */
export function payPeriodLabel(type: PayPeriodType): string {
  return PAY_PERIOD_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** e.g. "Every two weeks — 26 paychecks a year". */
export function payPeriodDescription(type: PayPeriodType): string {
  const found = PAY_PERIOD_TYPES.find((t) => t.value === type);
  if (!found) return type;
  return `${found.label} — ${found.paychecksPerYear} paychecks a year`;
}

const money = z
  .number({ error: "Enter a number" })
  .min(0, { error: "Can't be negative" })
  .max(10_000, { error: "That looks too high — check the amount" });

const dateField = (missing: string) =>
  z
    .string()
    .min(1, { error: missing })
    .refine(isDateOnly, { error: "That isn't a real date" });

/** Never throws, so a malformed date can't crash a refinement. */
function typesMatching(start: string, end: string): PayPeriodType[] {
  try {
    return payPeriodTypesMatching(start, end);
  } catch {
    return [];
  }
}

/**
 * Onboarding asks for three dates read straight off a pay stub instead of
 * asking the user to name their pay cadence. The cadence is derived from the
 * period's shape — see payPeriodTypesMatching — which removes the question
 * people most often answer wrong.
 *
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
    period_start: dateField("Pick the first day of the pay period"),
    period_end: dateField("Pick the last day of the pay period"),
    pay_date: dateField("Pick the date that period was paid"),
    // Only consulted when the two period dates fit more than one cadence.
    pay_period_type: z
      .enum(["weekly", "biweekly", "semi_monthly", "monthly"])
      .nullable(),
    overtime_enabled: z.boolean(),
    overtime_multiplier: z
      .number()
      .min(1, { error: "Must be at least 1" })
      .max(5, { error: "That looks too high" })
      .nullable(),
    optional_fields: z.array(
      z.enum(OPTIONAL_FIELD_KEYS as [OptionalFieldKey, ...OptionalFieldKey[]]),
    ),
  })
  .refine((v) => !v.overtime_enabled || v.overtime_multiplier !== null, {
    error: "Enter the overtime rate (usually 1.5)",
    path: ["overtime_multiplier"],
  })
  .refine((v) => !isDateOnly(v.period_end) || v.period_end > v.period_start, {
    error: "The last day has to come after the first day",
    path: ["period_end"],
  })
  .refine((v) => !isDateOnly(v.pay_date) || v.pay_date >= v.period_start, {
    // The exact misreading this form is shaped to prevent: a pay date entered
    // where a period date belongs. A period is always paid on or after it starts.
    error:
      "That's before the pay period began. Check you're reading the pay date, " +
      "not the period dates.",
    path: ["pay_date"],
  })
  .refine((v) => typesMatching(v.period_start, v.period_end).length > 0, {
    error:
      "That period isn't a week, two weeks, half a month, or a month. " +
      "Double-check both dates against your pay stub.",
    path: ["period_end"],
  })
  .refine(
    (v) => {
      const matches = typesMatching(v.period_start, v.period_end);
      return (
        matches.length !== 2 ||
        (v.pay_period_type !== null && matches.includes(v.pay_period_type))
      );
    },
    {
      // Only reachable for Feb 16-29 in a leap year, which is both a 14-day
      // period and a twice-monthly one. Guessing would silently mis-bucket
      // every future shift, so the form asks instead.
      error: "These dates fit two different schedules — pick which one it is",
      path: ["pay_period_type"],
    },
  );

export type WorkplaceInput = z.infer<typeof workplaceSchema>;

/** A workplace row as stored. */
export type Workplace = {
  id: string;
  name: string;
  hourly_wage: number;
  pay_period_type: PayPeriodType;
  pay_period_anchor_date: DateOnly | null;
  pay_period_end_date: DateOnly | null;
  pay_date: DateOnly | null;
  overtime_enabled: boolean;
  overtime_multiplier: number | null;
  optional_fields: OptionalFieldKey[];
};

export type WorkplaceRow = Omit<Workplace, "id">;

/**
 * Turns validated form input into the row the database stores.
 *
 * pay_period_anchor_date keeps its original meaning — the FIRST DAY of a known
 * pay period — so all the existing bucketing math is untouched by the move to
 * three dates.
 */
export function toWorkplaceRow(input: WorkplaceInput): WorkplaceRow {
  const matches = typesMatching(input.period_start, input.period_end);
  const type = matches.length === 1 ? matches[0] : input.pay_period_type;

  if (!type) {
    // Unreachable through the schema, which rejects both cases above.
    throw new Error(
      `Can't tell the pay cadence from ${input.period_start} to ${input.period_end}`,
    );
  }

  return {
    name: input.name,
    hourly_wage: input.hourly_wage,
    pay_period_type: type,
    pay_period_anchor_date: input.period_start,
    pay_period_end_date: input.period_end,
    pay_date: input.pay_date,
    overtime_enabled: input.overtime_enabled,
    overtime_multiplier: input.overtime_enabled
      ? input.overtime_multiplier
      : null,
    optional_fields: input.optional_fields,
  };
}

/**
 * Date values to prefill the edit form with.
 *
 * Workplaces created before migration 0003 have no end or pay date, and
 * calendar-based ones may have no anchor either, so those are filled in from
 * the cadence already stored rather than left blank.
 */
export function periodPrefill(
  workplace: Workplace,
  today: DateOnly,
): { period_start: DateOnly; period_end: DateOnly; pay_date: DateOnly | "" } {
  const start =
    workplace.pay_period_anchor_date ??
    payPeriodFor(today, workplace.pay_period_type, null).start;

  return {
    period_start: start,
    period_end:
      workplace.pay_period_end_date ??
      payPeriodEndFor(start, workplace.pay_period_type),
    pay_date: workplace.pay_date ?? "",
  };
}

/** Parses a form value that may be absent or blank into a number or null. */
export function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}
