"use client";

import { useState } from "react";
import { OPTIONAL_FIELDS, type OptionalFieldKey } from "@/lib/workplace";
import { localToday, shiftHours } from "@/lib/shift";

export type FieldsWorkplace = {
  id: string;
  name: string;
  optional_fields: OptionalFieldKey[];
  /** Bars or lounges already recorded here, offered as suggestions. */
  stations: string[];
};

/** Everything the fields below can be pre-filled from. */
export type ShiftValues = {
  workplace_id: string | null;
  station: string | null;
  shift_date: string | null;
  clock_in: string | null;
  clock_out: string | null;
  tips_cash: number | null;
  tips_card: number | null;
  tip_out: number | null;
  total_sales: number | null;
  shift_type: string | null;
  guest_count: number | null;
  notes: string | null;
};

export const label = "block text-sm font-medium mb-1.5";
export const hint = "text-xs opacity-60 mt-1.5";
export const field =
  "w-full rounded-xl border border-black/15 dark:border-white/20 bg-transparent " +
  "px-4 py-3.5 text-base outline-none focus:border-black/50 dark:focus:border-white/50";
export const primary =
  "w-full rounded-xl bg-foreground text-background px-4 py-3.5 text-base " +
  "font-medium disabled:opacity-50";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 dark:text-red-400 mt-1.5">{message}</p>
  );
}

const num = (n: number | null) => (n === null ? "" : String(n));

/**
 * The shift form fields, shared by the post-parse confirmation card and the
 * edit-an-existing-shift form.
 *
 * They are one component because they have to agree: both write the same row
 * against the same validation, and two copies of this markup would drift the
 * first time a field changed in only one of them.
 */
export function ShiftFields({
  workplaces,
  values,
  errors,
  unsplitTips,
}: {
  workplaces: FieldsWorkplace[];
  values: ShiftValues;
  errors: Record<string, string>;
  /**
   * A tips figure given without saying how it split. Only the parse flow can
   * produce one; editing a saved shift never does.
   */
  unsplitTips?: number | null;
}) {
  const [workplaceId, setWorkplaceId] = useState(
    values.workplace_id ?? (workplaces.length === 1 ? workplaces[0].id : ""),
  );
  // Controlled so the running duration below them stays live as they are edited.
  const [clockIn, setClockIn] = useState(values.clock_in ?? "");
  const [clockOut, setClockOut] = useState(values.clock_out ?? "");
  // Controlled so the "all card" shortcut can fill them.
  const [tipsCard, setTipsCard] = useState(num(values.tips_card));
  const [tipsCash, setTipsCash] = useState(num(values.tips_cash));

  const selected = workplaces.find((w) => w.id === workplaceId);
  const tracks = (key: OptionalFieldKey) =>
    selected?.optional_fields.includes(key) ?? false;
  const optionalLabel = (key: OptionalFieldKey) =>
    OPTIONAL_FIELDS.find((f) => f.key === key)?.label ?? key;

  const hours = shiftHours(clockIn, clockOut);

  return (
    <>
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
            defaultValue={values.station ?? ""}
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
          defaultValue={values.shift_date ?? localToday()}
          className={field}
        />
        <p className={hint}>
          The day the shift <em>started</em>. An overnight belongs to the
          evening it began.
        </p>
        <FieldError message={errors.shift_date} />
      </div>

      <div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="clock_in">
              Clocked in
            </label>
            <input
              id="clock_in"
              name="clock_in"
              type="time"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
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
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className={field}
            />
            <FieldError message={errors.clock_out} />
          </div>
        </div>

        {/* The one number that makes a misread am/pm obvious. Wrong times still
            look like times; a 20-hour shift does not look like a shift. */}
        {hours === null ? null : (
          <p className={`${hint} tabular-nums`}>
            {hours} hours
            {hours > 16
              ? " — that's a long shift, check the times are the right way round"
              : ""}
          </p>
        )}
      </div>

      {unsplitTips != null && unsplitTips > 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3">
          <p className="text-sm">
            You said <strong>${unsplitTips.toFixed(2)}</strong> in tips but not
            how it split. Splitting it for you would be a guess.
          </p>
          <button
            type="button"
            onClick={() => {
              setTipsCard(String(unsplitTips));
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
            defaultValue={num(values.tip_out)}
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
            defaultValue={num(values.total_sales)}
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
            defaultValue={values.shift_type ?? ""}
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
            defaultValue={num(values.guest_count)}
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
            defaultValue={values.notes ?? ""}
            className={`${field} resize-none`}
          />
        </div>
      ) : null}
    </>
  );
}
