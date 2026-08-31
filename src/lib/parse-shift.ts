import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { isDateOnly, type DateOnly } from "@/lib/pay-period";
import {
  EMPTY_PARSED_SHIFT,
  parsedShiftSchema,
  type ParsedShift,
} from "@/lib/shift";
import { OPTIONAL_FIELDS, type OptionalFieldKey } from "@/lib/workplace";

/**
 * Server-side only. The Anthropic key must never reach the browser, so nothing
 * in here may be imported from a client component.
 */

export type ParserWorkplace = {
  id: string;
  name: string;
  optional_fields: OptionalFieldKey[];
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** The weekday name for a `YYYY-MM-DD` date, computed in UTC to avoid drift. */
function weekdayOf(date: DateOnly): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/**
 * The system prompt.
 *
 * Kept pure and exported so it can be tested and, more importantly, read. This
 * is the part of the app most likely to need tuning against how someone
 * actually talks, and it should be obvious what it currently promises.
 */
export function buildParsePrompt(
  workplaces: ParserWorkplace[],
  today: DateOnly,
): string {
  const jobs = workplaces
    .map((w) => {
      const tracked = w.optional_fields
        .map((k) => OPTIONAL_FIELDS.find((f) => f.key === k)?.key)
        .filter(Boolean);
      const also =
        tracked.length > 0
          ? ` — also tracks: ${tracked.join(", ")}`
          : " — tracks no extra fields";
      return `- id "${w.id}": ${w.name}${also}`;
    })
    .join("\n");

  return `You extract shift details from how a service worker describes a shift they just worked. They are tired, typing or dictating one-handed, and they will not be precise. Your output is shown to them on an editable card before anything is saved.

Today is ${today} (${weekdayOf(today)}).

Their workplaces:
${jobs}

Return null for anything they did not actually say. This is the most important rule. A wrong number that looks plausible is worse than an empty box, because they will not catch it — the whole reason this app exists is to catch numbers that are wrong. Never fill a field to be helpful.

WORKPLACE
- Match against the names above, including partial and casual references ("Lumen" for "Lumen Field", "the lounge" for a lounge, "CPA" for "Climate Pledge Arena").
- Return the id string exactly as written above.
- If they did not indicate a workplace, or you cannot tell which one they mean, return null. Do not pick the more likely one.

DATE
- Resolve relative references against today's date: "last night" and "yesterday" are the day before today, "tonight" and "today" are today, a bare weekday name is the most recent past occurrence of that weekday.
- A shift belongs to the date it STARTED. A shift described as "last night, 8 til 2" started the previous evening and ended at 2am today — the date is the previous day, not today.
- If they gave no time reference at all, return null. Do not assume today.

TIMES
- 24-hour "HH:MM". "four" for someone working an evening shift is 16:00; "til 2" after an evening start is 02:00.
- Times only. Do not encode the date here.
- If they said when they started but trailed off about the end ("til close", "til whenever"), return the start and null for the end. Do not guess a closing time.

MONEY
- tips_card: tips they said came through cards.
- tips_cash: tips they said were cash.
- tips_total_unsplit: a tips figure given WITHOUT saying how it split ("220 in tips", "made like 300"). Put the whole figure here and leave tips_card and tips_cash null. Do not split it yourself.
- If they split it, use tips_card and tips_cash and leave tips_total_unsplit null.
- tip_out: what they paid out to support staff ("tipped out 35", "35 tipout").
- Bare numbers, no currency symbols. "like 40" is 40. "a buck fifty" in tips is 150, not 1.50 — service tips are dollars.

EXTRA FIELDS
- Only fill a field the matched workplace actually tracks, per the list above. Otherwise null.
- total_sales: their sales total for the shift, not their tips.
- shift_type: the kind of event, in their own words ("concert", "Mariners game", "private event").
- guest_count: number of guests or covers.
- notes: only something worth remembering that has no other field. Not a restatement of what you already extracted.

CORRECTIONS
- If they correct themselves ("180, no wait, 190 on cards"), use the correction.
- If they are genuinely unsure ("maybe 40 cash?"), still extract it — the card is where they confirm.`;
}

/** Nulls anything the model returned that isn't actually usable. */
export function sanitizeParsed(
  parsed: ParsedShift,
  workplaces: ParserWorkplace[],
): ParsedShift {
  const known = new Set(workplaces.map((w) => w.id));

  const time = (v: string | null) => (v && TIME_RE.test(v) ? v : null);
  const money = (v: number | null) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  const text = (v: string | null) => {
    const trimmed = v?.trim();
    return trimmed ? trimmed : null;
  };

  // Which fields the matched workplace tracks — the model is told, but a
  // hallucinated value for an untracked field would otherwise reach the card.
  const workplaceId = parsed.workplace_id && known.has(parsed.workplace_id)
    ? parsed.workplace_id
    : null;
  const tracked = new Set<string>(
    workplaces.find((w) => w.id === workplaceId)?.optional_fields ?? [],
  );
  const ifTracked = <T>(key: OptionalFieldKey, value: T) =>
    tracked.has(key) ? value : null;

  return {
    workplace_id: workplaceId,
    shift_date:
      parsed.shift_date && isDateOnly(parsed.shift_date)
        ? parsed.shift_date
        : null,
    clock_in: time(parsed.clock_in),
    clock_out: time(parsed.clock_out),
    tips_cash: money(parsed.tips_cash),
    tips_card: money(parsed.tips_card),
    // A split and an unsplit total are mutually exclusive by construction; if
    // the model sends both, the split is the more specific answer.
    tips_total_unsplit:
      money(parsed.tips_cash) !== null || money(parsed.tips_card) !== null
        ? null
        : money(parsed.tips_total_unsplit),
    tip_out: ifTracked("tip_out", money(parsed.tip_out)),
    total_sales: ifTracked("total_sales", money(parsed.total_sales)),
    shift_type: ifTracked("shift_type", text(parsed.shift_type)),
    guest_count: ifTracked("guest_count", money(parsed.guest_count)),
    notes: ifTracked("notes", text(parsed.notes)),
  };
}

/**
 * Effort is deliberately `medium` rather than the default `high`. The user is
 * standing in a parking lot at 1am, and the editable confirmation card is the
 * real backstop against a bad parse — latency costs more here than the last
 * few points of accuracy. This is the first knob to turn if the parser starts
 * tripping on real phrasing.
 */
const EFFORT = "medium" as const;

export async function parseShiftText(
  text: string,
  workplaces: ParserWorkplace[],
  today: DateOnly,
): Promise<ParsedShift> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error(
      "ANTHROPIC_API_KEY isn't set. Add it in Vercel under Settings → " +
        "Environment Variables, then redeploy.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: EFFORT,
      format: zodOutputFormat(parsedShiftSchema),
    },
    system: buildParsePrompt(workplaces, today),
    messages: [{ role: "user", content: text }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      "The parser declined to read that. Try rewording it, or fill the card in by hand.",
    );
  }

  // parsed_output is null when the model produced nothing matching the schema.
  // An empty card the user fills in beats an error they can do nothing with.
  if (!response.parsed_output) return { ...EMPTY_PARSED_SHIFT };

  return sanitizeParsed(response.parsed_output, workplaces);
}
