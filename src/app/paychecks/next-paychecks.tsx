"use client";

import { useSyncExternalStore } from "react";
import { localToday } from "@/lib/shift";
import { nextPaycheck, type ShiftRow, type SummaryWorkplace } from "@/lib/shift-summary";
import type { DateOnly } from "@/lib/pay-period";

export type PaycheckWorkplace = SummaryWorkplace & { name: string };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "Fri, Sep 18" */
function payDateLabel(date: DateOnly): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Aug 31 – Sep 13" */
function periodLabel(start: DateOnly, end: DateOnly): string {
  const fmt = (v: DateOnly, withMonth: boolean) => {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: withMonth ? "short" : undefined,
      day: "numeric",
      timeZone: "UTC",
    });
  };
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  return `${fmt(start, true)}–${fmt(end, !sameMonth)}`;
}

/** The local date never changes underneath us while the page is open. */
const subscribeToNothing = () => () => {};

export function NextPaychecks({
  workplaces,
  shifts,
}: {
  workplaces: PaycheckWorkplace[];
  shifts: ShiftRow[];
}) {
  // Which period is paid next depends on today's date, and the server runs in
  // UTC — where a west coast evening is already tomorrow. On the day a period
  // closes that would show the wrong paycheck entirely, so the date is read in
  // the browser and this renders a frame after mount rather than wrong first.
  const today = useSyncExternalStore(subscribeToNothing, localToday, () => null);

  if (workplaces.length === 0) return null;

  if (today === null) {
    // Reserve the space so the page doesn't jump when the figure arrives.
    return <section className="mt-8 min-h-32" aria-busy="true" />;
  }

  const checks = workplaces
    .map((w) => ({ workplace: w, check: nextPaycheck(shifts, w, today) }))
    .sort((a, b) => a.check.payDate.localeCompare(b.check.payDate));

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
        Next paycheck
      </h2>

      <ul className="mt-3 flex flex-col gap-4">
        {checks.map(({ workplace, check }) => (
          <li
            key={workplace.id}
            className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-3.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium truncate">
                {workplace.name}
              </span>
              <span className="text-sm opacity-70 shrink-0">
                {payDateLabel(check.payDate)}
              </span>
            </div>

            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {money(check.summary.gross)}
              {/* An open period can still grow, and saying so is the difference
                  between a running total and a claim about a final figure. */}
              {check.periodClosed ? null : (
                <span className="text-sm font-normal opacity-60"> so far</span>
              )}
            </p>

            <p className="mt-1 text-xs opacity-60 tabular-nums">
              {periodLabel(check.period.start, check.period.end)}
              {check.periodClosed ? " · closed" : " · still open"} ·{" "}
              {check.summary.shifts}{" "}
              {check.summary.shifts === 1 ? "shift" : "shifts"} ·{" "}
              {check.summary.hours} hrs
            </p>

            {check.summary.shifts === 0 ? (
              <p className="mt-1 text-xs opacity-60">
                Nothing logged in this period yet.
              </p>
            ) : null}

            {check.stubPayDateMismatch ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
                Your stub says this period was paid{" "}
                {payDateLabel(check.stubPayDateMismatch.recorded)}, not the
                Friday after it ended. Check this workplace&apos;s dates.
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {/* The three reasons the real deposit can differ. Said once, not per card,
          because a number that reads as final and isn't is the failure this app
          exists to prevent. */}
      <p className="mt-3 text-xs opacity-60">
        Before tax and deductions. Counts only shifts you&apos;ve logged, and
        doesn&apos;t apply overtime.
      </p>
    </section>
  );
}
