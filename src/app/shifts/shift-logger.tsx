"use client";

import { useActionState, useState } from "react";
import { OPTIONAL_FIELDS, type OptionalFieldKey } from "@/lib/workplace";
import { localToday, shiftHours, type ParsedShift } from "@/lib/shift";
import { createShift, parseShift, type SaveState } from "./actions";

export type LoggerWorkplace = {
  id: string;
  name: string;
  optional_fields: OptionalFieldKey[];
  /** Bars or lounges already recorded here, offered as suggestions. */
  stations: string[];
};

const label = "block text-sm font-medium mb-1.5";
const hint = "text-xs opacity-60 mt-1.5";
const field =
  "w-full rounded-xl border border-black/15 dark:border-white/20 bg-transparent " +
  "px-4 py-3.5 text-base outline-none focus:border-black/50 dark:focus:border-white/50";
const primary =
  "w-full rounded-xl bg-foreground text-background px-4 py-3.5 text-base " +
  "font-medium disabled:opacity-50";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 dark:text-red-400 mt-1.5">{message}</p>
  );
}

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
  const errors = state.errors ?? {};

  const [workplaceId, setWorkplaceId] = useState(
    draft.workplace_id ?? (workplaces.length === 1 ? workplaces[0].id : ""),
  );
  // Controlled so the "all card" shortcut can fill them.
  const [tipsCard, setTipsCard] = useState(
    draft.tips_card === null ? "" : String(draft.tips_card),
  );
  const [tipsCash, setTipsCash] = useState(
    draft.tips_cash === null ? "" : String(draft.tips_cash),
  );

  const selected = workplaces.find((w) => w.id === workplaceId);
  const tracks = (key: OptionalFieldKey) =>
    selected?.optional_fields.includes(key) ?? false;

  const optionalLabel = (key: OptionalFieldKey) =>
    OPTIONAL_FIELDS.find((f) => f.key === key)?.label ?? key;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <h2 className="text-base font-medium">Check this before it saves</h2>
        {rawText ? (
          <p className="mt-1 text-sm opacity-60 italic">“{rawText}”</p>
        ) : null}
        {parseError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {parseError} Fill it in below.
          </p>
        ) : null}
      </div>

      <input type="hidden" name="raw_input_text" value={rawText} />

      <div>
        <label className={label} htmlFor="workplace_id">
          Which job?
        </label>
        <select
          id="workplace_id"
          name="workplace_id"
          value={workplaceId}
          onChange={(e) => setWorkplaceId(e.target.value)}
          className={field}
        >
          <option value="">Pick one…</option>
          {workplaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.workplace_id} />
      </div>

      {tracks("station") ? (
        <div>
          <label className={label} htmlFor="station">
            {optionalLabel("station")}
          </label>
          <input
            id="station"
            name="station"
            type="text"
            list="known-stations"
            defaultValue={draft.station ?? ""}
            placeholder="Bar 309"
            className={field}
          />
          {/* Suggesting what has been used here keeps one bar under one
              spelling, which is the only thing that makes comparing them work. */}
          <datalist id="known-stations">
            {(selected?.stations ?? []).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <FieldError message={errors.station} />
        </div>
      ) : null}

      <div>
        <label className={label} htmlFor="shift_date">
          Date
        </label>
        <input
          id="shift_date"
          name="shift_date"
          type="date"
          defaultValue={draft.shift_date ?? localToday()}
          className={field}
        />
        <p className={hint}>
          The day the shift <em>started</em>. An overnight belongs to the
          evening it began.
        </p>
        <FieldError message={errors.shift_date} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="clock_in">
            Clocked in
          </label>
          <input
            id="clock_in"
            name="clock_in"
            type="time"
            defaultValue={draft.clock_in ?? ""}
            className={field}
          />
          <FieldError message={errors.clock_in} />
        </div>
        <div>
          <label className={label} htmlFor="clock_out">
            Clocked out
          </label>
          <input
            id="clock_out"
            name="clock_out"
            type="time"
            defaultValue={draft.clock_out ?? ""}
            className={field}
          />
          <FieldError message={errors.clock_out} />
        </div>
      </div>

      {draft.tips_total_unsplit !== null ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3">
          <p className="text-sm">
            You said <strong>${draft.tips_total_unsplit.toFixed(2)}</strong> in
            tips but not how it split. Splitting it for you would be a guess.
          </p>
          <button
            type="button"
            onClick={() => {
              setTipsCard(String(draft.tips_total_unsplit));
              setTipsCash("0");
            }}
            className="mt-2 text-sm underline"
          >
            It was all card
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="tips_card">
            Card tips
          </label>
          <input
            id="tips_card"
            name="tips_card"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={tipsCard}
            onChange={(e) => setTipsCard(e.target.value)}
            placeholder="0.00"
            className={field}
          />
          <FieldError message={errors.tips_card} />
        </div>
        <div>
          <label className={label} htmlFor="tips_cash">
            Cash tips
          </label>
          <input
            id="tips_cash"
            name="tips_cash"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={tipsCash}
            onChange={(e) => setTipsCash(e.target.value)}
            placeholder="0.00"
            className={field}
          />
          <FieldError message={errors.tips_cash} />
        </div>
      </div>

      {tracks("tip_out") ? (
        <div>
          <label className={label} htmlFor="tip_out">
            Tipped out
          </label>
          <input
            id="tip_out"
            name="tip_out"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={draft.tip_out ?? ""}
            placeholder="0.00"
            className={field}
          />
          <FieldError message={errors.tip_out} />
        </div>
      ) : null}

      {tracks("total_sales") ? (
        <div>
          <label className={label} htmlFor="of_total_sales">
            {optionalLabel("total_sales")}
          </label>
          <input
            id="of_total_sales"
            name="of_total_sales"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            defaultValue={draft.total_sales ?? ""}
            className={field}
          />
        </div>
      ) : null}

      {tracks("shift_type") ? (
        <div>
          <label className={label} htmlFor="of_shift_type">
            {optionalLabel("shift_type")}
          </label>
          <input
            id="of_shift_type"
            name="of_shift_type"
            type="text"
            defaultValue={draft.shift_type ?? ""}
            placeholder="Concert, game, private event"
            className={field}
          />
        </div>
      ) : null}

      {tracks("guest_count") ? (
        <div>
          <label className={label} htmlFor="of_guest_count">
            {optionalLabel("guest_count")}
          </label>
          <input
            id="of_guest_count"
            name="of_guest_count"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            defaultValue={draft.guest_count ?? ""}
            className={field}
          />
        </div>
      ) : null}

      {tracks("notes") ? (
        <div>
          <label className={label} htmlFor="of_notes">
            {optionalLabel("notes")}
          </label>
          <textarea
            id="of_notes"
            name="of_notes"
            rows={2}
            defaultValue={draft.notes ?? ""}
            className={`${field} resize-none`}
          />
        </div>
      ) : null}

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
