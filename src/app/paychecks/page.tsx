import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDaysTo } from "@/lib/pay-period";
import { PAST_PAYCHECK_MONTHS, monthsBefore } from "@/lib/shift-summary";
import { PastPaychecks } from "./past-paychecks";
import {
  PAYCHECK_WORKPLACE_COLUMNS,
  SHIFT_COLUMNS,
  toPaycheckWorkplace,
  toShiftRow,
} from "./rows";

export const dynamic = "force-dynamic";

/**
 * The earliest shift date the oldest check on the page can contain: six months
 * of pay dates back, plus the longest a period runs (a month) and the longest
 * it waits for its Friday (a week). Generous on purpose — it only bounds the
 * query, and the server's UTC date may be a day off the user's.
 */
function loadSince(): string {
  const utcToday = new Date().toISOString().slice(0, 10);
  return addDaysTo(monthsBefore(utcToday, PAST_PAYCHECK_MONTHS), -45);
}

export default async function PastPaychecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: workplaces, error: wErr }, { data: shiftRows, error: sErr }] =
    await Promise.all([
      supabase
        .from("workplaces")
        .select(PAYCHECK_WORKPLACE_COLUMNS)
        .order("created_at", { ascending: true }),
      supabase
        .from("shifts")
        .select(SHIFT_COLUMNS)
        .gte("shift_date", loadSince()),
    ]);

  const error = wErr ?? sErr;

  return (
    <main className="flex-1 px-6 py-10 max-w-sm w-full mx-auto">
      <Link href="/" className="text-sm underline opacity-70">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Past paychecks
      </h1>
      <p className="mt-1 text-sm opacity-70">
        Last {PAST_PAYCHECK_MONTHS} months, from the shifts you logged.
      </p>

      {error ? (
        // Never fall through to an empty list on a failed read: "no checks"
        // would be a confident lie about the user's own record.
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load your paychecks: {error.message}
        </p>
      ) : (
        <PastPaychecks
          workplaces={(workplaces ?? []).map(toPaycheckWorkplace)}
          shifts={(shiftRows ?? []).map(toShiftRow)}
        />
      )}
    </main>
  );
}
