"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ShiftFields,
  primary,
  type FieldsWorkplace,
  type ShiftValues,
} from "../shift-fields";
import { deleteShift, updateShift, type SaveState } from "../actions";

export function EditShiftForm({
  id,
  workplaces,
  values,
  rawInputText,
}: {
  id: string;
  workplaces: FieldsWorkplace[];
  values: ShiftValues;
  rawInputText: string | null;
}) {
  const [state, formAction, saving] = useActionState<SaveState, FormData>(
    updateShift,
    {},
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={id} />
        {/* Kept so the sentence that produced this shift survives an edit —
            it is the record of what the parser was actually given. */}
        <input
          type="hidden"
          name="raw_input_text"
          value={rawInputText ?? ""}
        />

        {rawInputText ? (
          <p className="text-sm opacity-60 italic">
            You said: &ldquo;{rawInputText}&rdquo;
          </p>
        ) : null}

        <ShiftFields
          workplaces={workplaces}
          values={values}
          errors={state.errors ?? {}}
        />

        {state.formError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.formError}
          </p>
        ) : null}

        <button type="submit" disabled={saving} className={primary}>
          {saving ? "Saving…" : "Save changes"}
        </button>

        <Link href="/" className="text-sm underline opacity-70 text-center py-2">
          Cancel
        </Link>
      </form>

      <div className="border-t border-black/10 dark:border-white/15 pt-6">
        {confirmingDelete ? (
          <form action={deleteShift} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={id} />
            <p className="text-sm">
              Delete this shift? This can&apos;t be undone.
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
            Delete this shift
          </button>
        )}
      </div>
    </div>
  );
}
