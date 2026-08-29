"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  OPTIONAL_FIELDS,
  PAY_PERIOD_TYPES,
  needsAnchorDate,
  type Workplace,
} from "@/lib/workplace";
import type { PayPeriodType } from "@/lib/pay-period";
import { deleteWorkplace, type WorkplaceFormState } from "./actions";

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

export function WorkplaceForm({
  action,
  workplace,
  submitLabel,
}: {
  action: (
    prev: WorkplaceFormState,
    formData: FormData,
  ) => Promise<WorkplaceFormState>;
  workplace?: Workplace;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.errors ?? {};

  // Controlled because they drive which fields are shown.
  const [periodType, setPeriodType] = useState<PayPeriodType>(
    workplace?.pay_period_type ?? "biweekly",
  );
  const [overtime, setOvertime] = useState(workplace?.overtime_enabled ?? false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const enabledFields = new Set(workplace?.optional_fields ?? []);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-5">
        {workplace ? (
          <input type="hidden" name="id" value={workplace.id} />
        ) : null}

        <div>
          <label className={label} htmlFor="name">
            Where do you work?
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoCapitalize="words"
            defaultValue={workplace?.name}
            placeholder="Lumen Field"
            className={field}
          />
          <FieldError message={errors.name} />
        </div>

        <div>
          <label className={label} htmlFor="hourly_wage">
            Base hourly wage
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">
              $
            </span>
            <input
              id="hourly_wage"
              name="hourly_wage"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={workplace?.hourly_wage}
              placeholder="20.76"
              className={`${field} pl-8`}
            />
          </div>
          <p className={hint}>Before tips. Check a recent pay stub.</p>
          <FieldError message={errors.hourly_wage} />
        </div>

        <div>
          <label className={label} htmlFor="pay_period_type">
            How often are you paid?
          </label>
          <select
            id="pay_period_type"
            name="pay_period_type"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PayPeriodType)}
            className={field}
          >
            {PAY_PERIOD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.pay_period_type} />
        </div>

        {/* Only weekly and biweekly periods are measured from an anchor. */}
        {needsAnchorDate(periodType) ? (
          <div>
            <label className={label} htmlFor="pay_period_anchor_date">
              First day of a recent pay period
            </label>
            <input
              id="pay_period_anchor_date"
              name="pay_period_anchor_date"
              type="date"
              defaultValue={workplace?.pay_period_anchor_date ?? undefined}
              className={field}
            />
            <p className={hint}>
              Not the day you got paid — the first day of the stretch of work
              that paycheck covered. It&apos;s how shifts get grouped.
            </p>
            <FieldError message={errors.pay_period_anchor_date} />
          </div>
        ) : null}

        <div className="rounded-xl border border-black/10 dark:border-white/15 p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="overtime_enabled"
              checked={overtime}
              onChange={(e) => setOvertime(e.target.checked)}
              className="size-5 accent-current"
            />
            <span className="text-base">This job pays overtime</span>
          </label>

          {overtime ? (
            <div className="mt-4">
              <label className={label} htmlFor="overtime_multiplier">
                Overtime rate
              </label>
              <input
                id="overtime_multiplier"
                name="overtime_multiplier"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="1"
                defaultValue={workplace?.overtime_multiplier ?? 1.5}
                className={field}
              />
              <p className={hint}>
                Usually 1.5. Recorded now — the weekly 40-hour calculation comes
                later.
              </p>
              <FieldError message={errors.overtime_multiplier} />
            </div>
          ) : null}
        </div>

        <fieldset>
          <legend className={label}>What does this job report?</legend>
          <p className={`${hint} mb-3 mt-0`}>
            Only what you can actually find out. Skip anything this job
            doesn&apos;t tell you.
          </p>
          <div className="flex flex-col gap-2">
            {OPTIONAL_FIELDS.map((f) => (
              <label
                key={f.key}
                className="flex items-start gap-3 rounded-xl border border-black/10 dark:border-white/15 px-4 py-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  name="optional_fields"
                  value={f.key}
                  defaultChecked={enabledFields.has(f.key)}
                  className="size-5 mt-0.5 accent-current"
                />
                <span>
                  <span className="block text-base">{f.label}</span>
                  <span className="block text-xs opacity-60">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError message={errors.optional_fields} />
        </fieldset>

        {state.formError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.formError}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Saving…" : submitLabel}
        </button>

        <Link
          href="/"
          className="text-sm underline opacity-70 text-center py-2"
        >
          Cancel
        </Link>
      </form>

      {workplace ? (
        <div className="border-t border-black/10 dark:border-white/15 pt-6">
          {confirmingDelete ? (
            <form action={deleteWorkplace} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={workplace.id} />
              <p className="text-sm">
                Delete <strong>{workplace.name}</strong> and every shift logged
                against it? This can&apos;t be undone.
              </p>
              <button
                type="submit"
                className="w-full rounded-xl bg-red-600 text-white px-4 py-3.5 text-base font-medium"
              >
                Yes, delete it
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-sm underline opacity-70 py-2"
              >
                Keep it
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm text-red-600 dark:text-red-400 underline"
            >
              Delete this workplace
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
