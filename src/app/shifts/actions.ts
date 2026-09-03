"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDateOnly } from "@/lib/pay-period";
import { parseShiftText, type ParserWorkplace } from "@/lib/parse-shift";
import {
  EMPTY_PARSED_SHIFT,
  JSON_FIELD_KEYS,
  pickTrackedFields,
  shiftSchema,
  type ParsedShift,
} from "@/lib/shift";
import { optionalNumber, type OptionalFieldKey } from "@/lib/workplace";

export type ParseState = {
  draft?: ParsedShift;
  rawText?: string;
  error?: string;
};

export type SaveState = {
  errors?: Record<string, string>;
  formError?: string;
  saved?: {
    workplaceName: string;
    station: string | null;
    shift_date: string;
    clock_in: string;
    clock_out: string;
    tips_total: number;
  };
};

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * The signed-in user's workplaces, or a redirect if there is no session.
 *
 * Returns a load error rather than throwing one. Callers can't wrap this in a
 * try/catch to handle that, because redirect() signals by throwing and would be
 * swallowed along with it.
 */
async function currentUserWorkplaces() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS already scopes this to the user; the select is explicit anyway.
  const { data, error } = await supabase
    .from("workplaces")
    .select("id, name, hourly_wage, overtime_enabled, overtime_multiplier, optional_fields")
    .order("created_at", { ascending: true });

  return {
    supabase,
    user,
    workplaces: data ?? [],
    loadError: error?.message ?? null,
  };
}

/**
 * Bars and lounges already recorded, grouped by workplace.
 *
 * Feeding these back to the parser is what keeps one bar under one name.
 * Bounded rather than distinct-in-SQL because PostgREST has no DISTINCT and the
 * row count here is small; the newest shifts are the ones worth matching anyway.
 */
export async function knownStations(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Record<string, string[]>> {
  const { data } = await supabase
    .from("shifts")
    .select("workplace_id, station")
    .not("station", "is", null)
    .order("shift_date", { ascending: false })
    .limit(500);

  const byWorkplace: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!row.station) continue;
    const list = (byWorkplace[row.workplace_id] ??= []);
    if (!list.some((s) => s.toLowerCase() === row.station!.toLowerCase())) {
      list.push(row.station);
    }
  }
  return byWorkplace;
}

/**
 * Step one: freeform text in, a draft out. Saves nothing.
 *
 * The confirmation card between this and createShift is non-negotiable — the
 * app exists to catch numbers that are wrong, so it can't trust its own reading
 * of one either.
 */
export async function parseShift(
  _prev: ParseState,
  formData: FormData,
): Promise<ParseState> {
  const rawText = String(formData.get("raw_text") ?? "").trim();
  if (!rawText) return { error: "Say what you worked first." };

  // Today comes from the browser, not the server. Vercel runs in UTC, and an
  // evening shift logged on the US west coast is already tomorrow there — which
  // would resolve "last night" to the wrong day and file the shift into the
  // wrong pay period.
  const clientToday = String(formData.get("today") ?? "");

  const { supabase, workplaces, loadError } = await currentUserWorkplaces();
  if (loadError) return { error: `Couldn't load your workplaces: ${loadError}` };
  if (workplaces.length === 0) {
    return { error: "Add a workplace first — a shift needs a job to belong to." };
  }

  const today = isDateOnly(clientToday)
    ? clientToday
    : new Date().toISOString().slice(0, 10);

  const stations = await knownStations(supabase);

  const forParser: ParserWorkplace[] = workplaces.map((w) => ({
    id: w.id,
    name: w.name,
    optional_fields: (w.optional_fields ?? []) as OptionalFieldKey[],
    stations: stations[w.id] ?? [],
  }));

  try {
    const draft = await parseShiftText(rawText, forParser, today);
    return { draft, rawText };
  } catch (e) {
    // The card still opens, empty, so a parser outage never blocks logging a
    // shift by hand.
    return {
      draft: { ...EMPTY_PARSED_SHIFT },
      rawText,
      error: e instanceof Error ? e.message : "Couldn't read that.",
    };
  }
}

/** Step two: save what the user confirmed on the card. */
export async function createShift(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const { supabase, user, workplaces, loadError } = await currentUserWorkplaces();
  if (loadError) return { formError: `Couldn't load your workplaces: ${loadError}` };

  const workplaceId = String(formData.get("workplace_id") ?? "");
  const workplace = workplaces.find((w) => w.id === workplaceId);
  if (!workplace) {
    return { errors: { workplace_id: "Pick which job this was" } };
  }

  const enabled = (workplace.optional_fields ?? []) as OptionalFieldKey[];

  const jsonValues: Record<string, string | number | null> = {};
  for (const key of JSON_FIELD_KEYS) {
    const raw = formData.get(`of_${key}`);
    if (raw === null) continue;
    // guest_count and total_sales are numeric; the rest are free text.
    jsonValues[key] =
      key === "guest_count" || key === "total_sales"
        ? optionalNumber(raw)
        : String(raw);
  }

  const parsed = shiftSchema.safeParse({
    workplace_id: workplaceId,
    station: enabled.includes("station")
      ? String(formData.get("station") ?? "")
      : null,
    shift_date: String(formData.get("shift_date") ?? ""),
    clock_in: String(formData.get("clock_in") ?? ""),
    clock_out: String(formData.get("clock_out") ?? ""),
    tips_cash: optionalNumber(formData.get("tips_cash")) ?? 0,
    tips_card: optionalNumber(formData.get("tips_card")) ?? 0,
    tip_out: enabled.includes("tip_out")
      ? (optionalNumber(formData.get("tip_out")) ?? 0)
      : 0,
    optional_field_values: pickTrackedFields(jsonValues, enabled),
    raw_input_text: String(formData.get("raw_input_text") ?? "") || null,
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  const { error } = await supabase.from("shifts").insert({
    ...parsed.data,
    user_id: user.id,
    // Snapshotted from the workplace, never from the form. A later raise must
    // not rewrite what this shift was worth, and a client must not be able to
    // claim a wage it didn't earn.
    hourly_wage_at_time: workplace.hourly_wage,
    overtime_multiplier_at_time: workplace.overtime_enabled
      ? workplace.overtime_multiplier
      : null,
  });

  if (error) return { formError: error.message };

  revalidatePath("/");

  return {
    saved: {
      workplaceName: workplace.name,
      station: parsed.data.station,
      shift_date: parsed.data.shift_date,
      clock_in: parsed.data.clock_in,
      clock_out: parsed.data.clock_out,
      tips_total: parsed.data.tips_cash + parsed.data.tips_card,
    },
  };
}
