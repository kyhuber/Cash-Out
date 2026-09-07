"use client";

import { useActionState, useState } from "react";
import { localToday, shiftHours, type ParsedShift } from "@/lib/shift";
import {
  ShiftFields,
  field,
  hint,
  label,
  primary,
  type FieldsWorkplace,
} from "./shift-fields";
import { createShift, parseShift, type SaveState } from "./actions";

export type LoggerWorkplace = FieldsWorkplace;

/** "Sun Aug 30" — enough to catch a wrong date at a glance. */
function readableDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ShiftLogger({ workplaces }: { workplaces: LoggerWorkplace[] }) {
  // Remounting is what clears both action states after a save.
  const [round, setRound] = useState(0);
  return (
    <LogOneShift
      key={round}
      workplaces={workplaces}
      onLogAnother={() => setRound((n) => n + 1)}
    />
  );
}

function LogOneShift({
  workplaces,
  onLogAnother,
}: {
  workplaces: LoggerWorkplace[];
  onLogAnother: () => void;
}) {
  const [parseState, parseAction, parsing] = useActionState(parseShift, {});
  const [saveState, saveAction, saving] = useActionState<SaveState, FormData>(
    createShift,
    {},
  );

  // Today is read in the browser at submit time, never rendered into the HTML:
  // the server runs in UTC, so an evening shift on the west coast is already
  // tomorrow there, and "last night" would resolve to the wrong day.
  const submitForParse = (formData: FormData) => {
    formData.set("today", localToday());
    return parseAction(formData);
  };

  if (saveState.saved) {
    const s = saveState.saved;
    const hours = shiftHours(s.clock_in, s.clock_out);
    return (
      <section className="rounded-xl border border-black/10 dark:border-white/15 p-5">
        <h2 className="text-base font-medium">Saved</h2>
        <p className="mt-2 text-sm opacity-80">
          {s.workplaceName}
          {s.station ? ` · ${s.station}` : ""} · {readableDate(s.shift_date)}
          <br />
          {s.clock_in}–{s.clock_out}
          {hours === null ? "" : ` · ${hours} hrs`} · $
          {s.tips_total.toFixed(2)} tips
        </p>
        <button
          type="button"
          onClick={onLogAnother}
          className={`${primary} mt-5`}
        >
          Log another shift
        </button>
      </section>
    );
  }

  if (parseState.draft) {
    return (
      <ConfirmationCard
        workplaces={workplaces}
        draft={parseState.draft}
        rawText={parseState.rawText ?? ""}
        parseError={parseState.error}
        action={saveAction}
        state={saveState}
        saving={saving}
        onStartOver={onLogAnother}
      />
    );
  }

  return (
    <form action={submitForParse} className="flex flex-col gap-3">
      <label className={label} htmlFor="raw_text">
        What did you work?
      </label>
      <textarea
        id="raw_text"
        name="raw_text"
        rows={3}
        required
        autoCapitalize="sentences"
        placeholder="Lumen, four til close, 180 on cards and like 40 cash"
        className={`${field} resize-none`}
      />
      <p className={`${hint} mt-0`}>
        Say it however you&apos;d say it. Tap the mic on your keyboard to talk
        instead. Nothing saves until you check it.
      </p>
      <button type="submit" disabled={parsing} className={primary}>
        {parsing ? "Reading…" : "Read it"}
      </button>
      {parseState.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {parseState.error}
        </p>
      ) : null}
    </form>
  );
}

function ConfirmationCard({
  workplaces,
  draft,
  rawText,
  parseError,
  action,
  state,
  saving,
  onStartOver,
}: {
  workplaces: LoggerWorkplace[];
  draft: ParsedShift;
  rawText: string;
  parseError?: string;
  action: (formData: FormData) => void;
  state: SaveState;
  saving: boolean;
  onStartOver: () => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-medium">Check this before it saves</h2>
        {rawText ? (
          <p className="mt-1 text-sm opacity-60 italic">&ldquo;{rawText}&rdquo;</p>
        ) : null}
        {parseError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {parseError} Fill it in below.
          </p>
        ) : null}
      </div>

      <input type="hidden" name="raw_input_text" value={rawText} />

      <ShiftFields
        workplaces={workplaces}
        values={draft}
        errors={state.errors ?? {}}
        unsplitTips={draft.tips_total_unsplit}
      />

      {state.formError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.formError}
        </p>
      ) : null}

      <button type="submit" disabled={saving} className={primary}>
        {saving ? "Saving…" : "Save this shift"}
      </button>
      <button
        type="button"
        onClick={onStartOver}
        className="text-sm underline opacity-70 py-2"
      >
        Start over
      </button>
    </form>
  );
}
