import Link from "next/link";
import { minutesToHours } from "@/lib/pay-period";
import type { ShiftRow } from "@/lib/shift-summary";

/** "Sat Sep 6" — the date is date-only, so it is formatted in UTC. */
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

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function RecentShifts({
  shifts,
  workplaceNames,
  activeFilter,
  limit = 15,
}: {
  shifts: ShiftRow[];
  workplaceNames: Map<string, string>;
  /** The workplace id currently filtered to, or null for all. */
  activeFilter: string | null;
  limit?: number;
}) {
  const filtered = activeFilter
    ? shifts.filter((s) => s.workplace_id === activeFilter)
    : shifts;
  const shown = filtered.slice(0, limit);

  // The filter is a link, not client state: it survives a reload, it is
  // shareable, and it keeps this a server component with no hydration cost.
  const chip = (id: string | null, text: string) => {
    const active = activeFilter === id;
    return (
      <Link
        key={id ?? "all"}
        href={id ? `/?job=${id}` : "/"}
        scroll={false}
        className={
          "rounded-full px-3 py-1.5 text-xs whitespace-nowrap border " +
          (active
            ? "bg-foreground text-background border-transparent"
            : "border-black/15 dark:border-white/20 opacity-70")
        }
      >
        {text}
      </Link>
    );
  };

  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
        Recent shifts
      </h2>

      {workplaceNames.size > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto -mx-6 px-6 pb-1">
          {chip(null, "All")}
          {[...workplaceNames].map(([id, name]) => chip(id, name))}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="mt-3 text-sm opacity-70">
          {shifts.length === 0
            ? "Nothing logged yet. Your first shift will show up here."
            : "No shifts logged at this job yet."}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {shown.map((s) => {
            const hours = minutesToHours(s.minutes_worked);
            const tips = s.tips_cash + s.tips_card;
            return (
              <li
                key={s.id}
                className="border-b border-black/10 dark:border-white/15 last:border-0"
              >
                <Link
                  href={`/shifts/${s.id}`}
                  className="flex items-baseline justify-between gap-3 py-3 active:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {readableDate(s.shift_date)}
                    </span>
                    <span className="block text-xs opacity-60 truncate">
                      {workplaceNames.get(s.workplace_id) ?? "Unknown"}
                      {s.station ? ` · ${s.station}` : ""}
                    </span>
                  </span>
                  <span className="text-right shrink-0 tabular-nums">
                    <span className="block text-sm">{money(tips)}</span>
                    <span className="block text-xs opacity-60">
                      {hours} hrs
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > shown.length ? (
        <p className={"mt-3 text-xs opacity-60"}>
          Showing the most recent {shown.length} of {filtered.length}.
        </p>
      ) : null}
    </section>
  );
}
