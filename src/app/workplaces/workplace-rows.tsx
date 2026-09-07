"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { localToday } from "@/lib/shift";
import { periodSummary, type ShiftRow } from "@/lib/shift-summary";
import type { DateOnly, PayPeriod, PayPeriodType } from "@/lib/pay-period";

export type RowWorkplace = {
  id: string;
  name: string;
  hourly_wage: number;
  pay_period_type: PayPeriodType;
  pay_period_anchor_date: DateOnly | null;
};

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

/** "Sep 1–14", or "Sep 28 – Oct 11" when the period spans two months. */
function periodLabel(p: PayPeriod): string {
  const fmt = (d: string, withMonth: boolean) => {
    const [y, m, day] = d.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, day));
    return date.toLocaleDateString("en-US", {
      month: withMonth ? "short" : undefined,
      day: "numeric",
      timeZone: "UTC",
    });
  };
  const sameMonth = p.start.slice(0, 7) === p.end.slice(0, 7);
  return sameMonth
    ? `${fmt(p.start, true)}–${fmt(p.end, false)}`
    : `${fmt(p.start, true)} – ${fmt(p.end, true)}`;
}

/** The local date never changes underneath us while the page is open. */
const subscribeToNothing = () => () => {};

export function WorkplaceRows({
  workplaces,
  shifts,
  shiftsUnavailable = false,
}: {
  workplaces: RowWorkplace[];
  shifts: ShiftRow[];
  /** True when the shift read failed, so totals would understate reality. */
  shiftsUnavailable?: boolean;
}) {
  // The current pay period depends on today's date, and the server runs in UTC.
  // Between late afternoon and midnight on the US west coast that is already
  // tomorrow, which at a period boundary would show the wrong period entirely.
  //
  // useSyncExternalStore is how a value that only exists in the browser is read
  // without a hydration mismatch: the server snapshot is null, the client
  // snapshot is the local date, so the summary appears a frame after mount
  // rather than being rendered wrong first.
  const today = useSyncExternalStore(subscribeToNothing, localToday, () => null);

  return (
    <ul className="mt-3 flex flex-col">
      {workplaces.map((w) => {
        // A summary built from shifts that failed to load reads as a real
        // total that happens to be low. Show the wage alone instead.
        const summary =
          today && !shiftsUnavailable ? periodSummary(shifts, w, today) : null;

        return (
          <li
            key={w.id}
            className="border-b border-black/10 dark:border-white/15 last:border-0"
          >
            <Link
              href={`/workplaces/${w.id}`}
              className="flex items-baseline justify-between gap-3 py-3 active:opacity-60"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{w.name}</span>
                <span className="block text-xs opacity-60 tabular-nums">
                  {shiftsUnavailable ? (
                    `$${w.hourly_wage.toFixed(2)}/hr`
                  ) : summary === null ? (
                    // Matches the height of the real line so nothing jumps.
                    <span className="opacity-0">—</span>
                  ) : summary.shifts === 0 ? (
                    `${periodLabel(summary.period)} · nothing logged yet`
                  ) : (
                    `${periodLabel(summary.period)} · ${summary.hours} hrs · ` +
                    `${money(summary.tips)} tips · ${money(summary.gross)} est.`
                  )}
                </span>
              </span>
              <span className="text-xs opacity-50 shrink-0 underline">
                Edit
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
