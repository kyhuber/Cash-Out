import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

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
    .select("id, name, hourly_wage")
    .order("created_at", { ascending: true });

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
        ) : workplaces && workplaces.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {workplaces.map((w) => (
              <li
                key={w.id}
                className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-3 flex justify-between"
              >
                <span>{w.name}</span>
                <span className="opacity-60 tabular-nums">
                  ${Number(w.hourly_wage).toFixed(2)}/hr
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm opacity-70">
            No workplaces yet. Adding one is the next thing to build.
          </p>
        )}
      </section>
    </main>
  );
}
