import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { ShiftLogger, type LoggerWorkplace } from "@/app/shifts/shift-logger";
import { RecentShifts } from "@/app/shifts/recent-shifts";
import { knownStations } from "@/app/shifts/actions";
import {
  WorkplaceRows,
  type RowWorkplace,
} from "@/app/workplaces/workplace-rows";
import type { ShiftRow } from "@/lib/shift-summary";
import type { OptionalFieldKey } from "@/lib/workplace";
import type { DateOnly, PayPeriodType } from "@/lib/pay-period";

export const dynamic = "force-dynamic";

/**
 * How far back to load. Everything on this page — the recent list and each
 * workplace's current-period totals — is served from this one query, and no
 * pay period is longer than a month, so 90 days covers both with room to spare.
 */
const WINDOW_DAYS = 90;

/**
 * Recent shifts, newest first.
 *
 * Lives outside the component because reading the clock is impure, and a
 * component body is not allowed to be.
 */
async function loadRecentShifts(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  return supabase
    .from("shifts")
    .select(
      "id, workplace_id, station, shift_date, clock_in, clock_out, minutes_worked, tips_cash, tips_card, tip_out, hourly_wage_at_time",
    )
    .gte("shift_date", since)
    .order("shift_date", { ascending: false })
    .order("clock_in", { ascending: false });
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy refreshes the session but is not an authorization boundary, so the
  // check lives here. RLS is the boundary that actually protects the data.
  if (!user) redirect("/sign-in");

  const { job } = await searchParams;
  const activeFilter = typeof job === "string" && job ? job : null;

  const [
    { data: workplaces, error },
    { data: shiftRows, error: shiftsError },
  ] = await Promise.all([
    supabase
      .from("workplaces")
      .select(
        "id, name, hourly_wage, pay_period_type, pay_period_anchor_date, overtime_enabled, optional_fields",
      )
      .order("created_at", { ascending: true }),
    loadRecentShifts(supabase),
  ]);

  const hasWorkplaces = !!workplaces && workplaces.length > 0;
  const stations = hasWorkplaces ? await knownStations(supabase) : {};

  // Postgres numerics arrive as strings over PostgREST; coerce once, here, so
  // nothing downstream has to remember to.
  const shifts: ShiftRow[] = (shiftRows ?? []).map((s) => ({
    id: s.id,
    workplace_id: s.workplace_id,
    station: s.station,
    shift_date: s.shift_date,
    clock_in: String(s.clock_in).slice(0, 5),
    clock_out: String(s.clock_out).slice(0, 5),
    minutes_worked: Number(s.minutes_worked),
    tips_cash: Number(s.tips_cash),
    tips_card: Number(s.tips_card),
    tip_out: Number(s.tip_out),
    hourly_wage_at_time: Number(s.hourly_wage_at_time),
  }));

  const forLogger: LoggerWorkplace[] = (workplaces ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    optional_fields: (w.optional_fields ?? []) as OptionalFieldKey[],
    stations: stations[w.id] ?? [],
  }));

  const forRows: RowWorkplace[] = (workplaces ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    hourly_wage: Number(w.hourly_wage),
    pay_period_type: w.pay_period_type as PayPeriodType,
    pay_period_anchor_date: (w.pay_period_anchor_date ?? null) as DateOnly | null,
  }));

  const workplaceNames = new Map(
    (workplaces ?? []).map((w) => [w.id, w.name] as const),
  );

  return (
    <main className="flex-1 px-6 py-10 max-w-sm w-full mx-auto">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Cash Out</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm underline opacity-70">
            Sign out
          </button>
        </form>
      </header>
      <p className="mt-1 text-sm opacity-70">{user.email}</p>

      {/* Logging a shift is the product, so it leads. */}
      {hasWorkplaces ? (
        <section className="mt-8">
          <ShiftLogger workplaces={forLogger} />
        </section>
      ) : null}

      {/* Then what you logged. This is what you actually come back to look at. */}
      {hasWorkplaces ? (
        shiftsError ? (
          // Never fall through to the empty state on a failed read: "nothing
          // logged yet" would be a confident lie about the user's own record,
          // which is the exact failure this app exists to prevent.
          <section className="mt-10">
            <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
              Recent shifts
            </h2>
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              Couldn&apos;t load your shifts: {shiftsError.message}
            </p>
          </section>
        ) : (
          <RecentShifts
            shifts={shifts}
            workplaceNames={workplaceNames}
            activeFilter={activeFilter}
          />
        )
      ) : null}

      {/* Workplaces are configuration — touched twice a year — so they sit
          last and quietly, carrying a summary rather than a tap target that
          promises content and opens a form. */}
      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
          Workplaces
        </h2>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load workplaces: {error.message}
          </p>
        ) : hasWorkplaces ? (
          <>
            <WorkplaceRows
              workplaces={forRows}
              shifts={shifts}
              shiftsUnavailable={!!shiftsError}
            />
            <Link
              href="/workplaces/new"
              className="mt-3 block text-sm underline opacity-70"
            >
              Add another workplace
            </Link>
          </>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-black/20 dark:border-white/25 px-5 py-8 text-center">
            <p className="text-sm opacity-70">
              Add where you work first. Cash Out needs your wage and pay period
              before it can make sense of a shift.
            </p>
            <Link
              href="/workplaces/new"
              className="mt-5 inline-block rounded-xl bg-foreground text-background px-5 py-3 text-base font-medium"
            >
              Add a workplace
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
