import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { payPeriodLabel } from "@/lib/workplace";
import type { PayPeriodType } from "@/lib/pay-period";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proxy refreshes the session but is not an authorization boundary, so the
  // check lives here. RLS is the boundary that actually protects the data.
  if (!user) redirect("/sign-in");

  const { data: workplaces, error } = await supabase
    .from("workplaces")
    .select("id, name, hourly_wage, pay_period_type, overtime_enabled")
    .order("created_at", { ascending: true });

  const hasWorkplaces = !!workplaces && workplaces.length > 0;

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
            <ul className="mt-3 flex flex-col gap-2">
              {workplaces.map((w) => (
                <li key={w.id}>
                  <Link
                    href={`/workplaces/${w.id}`}
                    className="block rounded-xl border border-black/10 dark:border-white/15 px-4 py-3.5 active:opacity-60"
                  >
                    <span className="flex justify-between items-baseline gap-3">
                      <span className="font-medium">{w.name}</span>
                      <span className="opacity-60 tabular-nums text-sm shrink-0">
                        ${Number(w.hourly_wage).toFixed(2)}/hr
                      </span>
                    </span>
                    <span className="block text-xs opacity-60 mt-1">
                      {payPeriodLabel(w.pay_period_type as PayPeriodType)}
                      {w.overtime_enabled ? " · pays overtime" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
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

      {hasWorkplaces ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
            Shifts
          </h2>
          <p className="mt-3 text-sm opacity-70">
            Logging a shift is the next thing to build.
          </p>
        </section>
      ) : null}
    </main>
  );
}
