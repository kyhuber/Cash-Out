"use client";

import { useSyncExternalStore } from "react";
import { localToday } from "@/lib/shift";
import {
  PAST_PAYCHECK_MONTHS,
  pastPaychecks,
  type ShiftRow,
} from "@/lib/shift-summary";
import {
  AfterTax,
  HowItAddsUp,
  PaycheckCaveats,
  PeriodLine,
  money,
  payDateLabel,
  periodLabel,
  subscribeToNothing,
} from "./paycheck-parts";
import type { PaycheckWorkplace } from "./rows";

/**
 * Checks already paid, one list per job, newest first: what to hold a stub
 * against once it has arrived. A record to look at, not a report — no totals,
 * no comparisons between checks.
 */
export function PastPaychecks({
  workplaces,
  shifts,
}: {
  workplaces: PaycheckWorkplace[];
  shifts: ShiftRow[];
}) {
  // Which checks have been paid depends on today, read in the browser for the
  // same reason as on the home page: the server's UTC date can be tomorrow.
  const today = useSyncExternalStore(subscribeToNothing, localToday, () => null);
  if (today === null) return <div className="min-h-32" aria-busy="true" />;

  return (
    <>
      {workplaces.map((w) => {
        const checks = pastPaychecks(shifts, w, today);
        return (
          <section key={w.id} className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
              {w.name}
            </h2>

            {checks.length === 0 ? (
              <p className="mt-3 text-sm opacity-70">
                No checks paid in the last {PAST_PAYCHECK_MONTHS} months with a
                shift logged.
              </p>
            ) : (
              <ul className="mt-1 flex flex-col">
                {checks.map((check) => (
                  <li
                    key={check.payDate}
                    className="border-b border-black/10 dark:border-white/15 last:border-0 py-3"
                  >
                    <div
                      className={
                        "flex items-baseline justify-between gap-3 " +
                        (check.summary.shifts === 0 ? "opacity-50" : "")
                      }
                    >
                      <span className="text-sm font-medium">
                        {payDateLabel(check.payDate)}
                      </span>
                      <span className="text-lg font-semibold tabular-nums">
                        {money(check.summary.gross)}
                      </span>
                    </div>
                    {check.summary.shifts === 0 ? (
                      // Kept rather than dropped, but quiet: a gap may be a
                      // shift that was never logged, and that is worth noticing.
                      <p className="mt-1 text-xs opacity-60 tabular-nums">
                        {periodLabel(check.period.start, check.period.end)} ·
                        nothing logged
                      </p>
                    ) : (
                      <>
                        <AfterTax check={check} />
                        <PeriodLine check={check} showOpen={false} />
                        <HowItAddsUp check={check} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <div className="mt-8">
        <PaycheckCaveats />
        {/* The wage is stored on each shift, so gross never moves. The W-4 is
            not, so a change there re-estimates every check on this page. */}
        <p className="mt-2 text-xs opacity-60">
          Take-home on past checks uses each job&apos;s W-4 settings as they
          are now. If you&apos;ve changed them since, an older estimate will
          have changed with them.
        </p>
      </div>
    </>
  );
}
