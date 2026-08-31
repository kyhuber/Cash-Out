import { z } from "zod";
import { isDateOnly, shiftMinutes, type DateOnly } from "@/lib/pay-period";
import { OPTIONAL_FIELD_KEYS, type OptionalFieldKey } from "@/lib/workplace";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * What the parser is allowed to return.
 *
 * Every field is nullable on purpose. Anything the user didn't actually say
 * comes back null and shows as an empty box on the confirmation card — this app
 * exists to catch numbers that are wrong, so it can't invent one. The one
 * exception is the date, which the card defaults to today because a wrong date
 * is visible at a glance in a way a wrong dollar figure is not.
 */
export const parsedShiftSchema = z.object({
  workplace_id: z.string().nullable(),
  shift_date: z.string().nullable(),
  clock_in: z.string().nullable(),
  clock_out: z.string().nullable(),
  tips_cash: z.number().nullable(),
  tips_card: z.number().nullable(),
  /**
   * A tips figure given without saying how it split — "220 in tips". Splitting
   * it would be a guess, so it rides here and the card asks. Never stored.
   */
  tips_total_unsplit: z.number().nullable(),
  tip_out: z.number().nullable(),
  total_sales: z.number().nullable(),
  shift_type: z.string().nullable(),
  guest_count: z.number().nullable(),
  notes: z.string().nullable(),
});

export type ParsedShift = z.infer<typeof parsedShiftSchema>;

export const EMPTY_PARSED_SHIFT: ParsedShift = {
  workplace_id: null,
  shift_date: null,
  clock_in: null,
  clock_out: null,
  tips_cash: null,
  tips_card: null,
  tips_total_unsplit: null,
  tip_out: null,
  total_sales: null,
  shift_type: null,
  guest_count: null,
  notes: null,
};

const money = z
  .number({ error: "Enter a number" })
  .min(0, { error: "Can't be negative" })
  .max(100_000, { error: "That looks too high — check the amount" });

const time = (missing: string) =>
  z
    .string()
    .min(1, { error: missing })
    .regex(TIME_RE, { error: "Use a 24-hour time like 17:30" });

/**
 * What the confirmation card is allowed to save. Mirrors the constraints on the
 * shifts table so bad input gets a readable message instead of a Postgres error.
 *
 * Note what is NOT here: hourly_wage_at_time and overtime_multiplier_at_time.
 * Those are snapshotted server-side from the workplace, never accepted from the
 * form — a client that could set its own wage could rewrite what a shift was
 * worth.
 */
export const shiftSchema = z
  .object({
    workplace_id: z.uuid({ error: "Pick which job this was" }),
    shift_date: z
      .string()
      .min(1, { error: "Pick the date" })
      .refine(isDateOnly, { error: "That isn't a real date" }),
    clock_in: time("When did you clock in?"),
    clock_out: time("When did you clock out?"),
    tips_cash: money,
    tips_card: money,
    tip_out: money,
    optional_field_values: z.record(z.string(), z.union([z.string(), z.number()])),
    raw_input_text: z.string().nullable(),
  })
  .refine((v) => v.clock_in !== v.clock_out, {
    // Matches the shift_has_duration constraint. Without this a 0-minute shift
    // gets rejected by Postgres with a message nobody can act on.
    error: "Clock-in and clock-out can't be the same time",
    path: ["clock_out"],
  });

export type ShiftInput = z.infer<typeof shiftSchema>;

/**
 * Optional fields that have their own column on `shifts` rather than living in
 * the optional_field_values JSON. Tip-out is one because the pay-period summary
 * subtracts it to show take-home, so it has to be queryable.
 */
export const COLUMN_BACKED_FIELDS: readonly OptionalFieldKey[] = ["tip_out"];

/** Optional fields that do live in optional_field_values. */
export const JSON_FIELD_KEYS: readonly OptionalFieldKey[] =
  OPTIONAL_FIELD_KEYS.filter((k) => !COLUMN_BACKED_FIELDS.includes(k));

/**
 * Drops any optional value whose field the workplace doesn't actually track,
 * any that came through blank, and any that belongs in its own column. Keeps
 * optional_field_values honest: a key present in the JSON should mean the user
 * really reported it.
 */
export function pickTrackedFields(
  values: Record<string, string | number | null | undefined>,
  enabled: readonly OptionalFieldKey[],
): Record<string, string | number> {
  const tracked = new Set<string>(
    enabled.filter((k) => JSON_FIELD_KEYS.includes(k)),
  );

  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!tracked.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = typeof value === "string" ? value.trim() : value;
  }
  return out;
}

/** Hours worked, for the confirmation card's summary line. */
export function shiftHours(clockIn: string, clockOut: string): number | null {
  if (!TIME_RE.test(clockIn) || !TIME_RE.test(clockOut)) return null;
  return Math.round((shiftMinutes(clockIn, clockOut) / 60) * 100) / 100;
}

/** Today in the viewer's own timezone, formatted `YYYY-MM-DD`. */
export function localToday(now: Date = new Date()): DateOnly {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
