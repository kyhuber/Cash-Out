"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { localToday } from "@/lib/shift";
import {
  stubPayDateMismatch,
  upcomingPaychecks,
  type Paycheck,
  type ShiftRow,
} from "@/lib/shift-summary";
import {
  AfterTax,
  HowItAddsUp,
  PaycheckCaveats,
  PeriodLine,
  money,
  payDateLabel,
  subscribeToNothing,
} from "./paycheck-parts";
import type { PaycheckWorkplace } from "./rows";

function CheckCard({
  name,
  check,
  later,
}: {
  name: string;
  check: Paycheck;
  /** The check after the next one, which never leads. */
  later: boolean;
}) {
  return (
    <div className="h-full rounded-xl border border-black/10 dark:border-white/15 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium truncate">{name}</span>
        <span className="text-sm opacity-70 shrink-0">
          {later ? "Then " : ""}
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

      {/* Net sits right under gross, smaller. Gross is the figure to hold
          against the stub's top line; net is what should reach the bank. */}
      <AfterTax check={check} />
      <PeriodLine check={check} />

      {check.summary.shifts === 0 ? (
        <p className="mt-1 text-xs opacity-60">
          Nothing logged in this period yet.
        </p>
      ) : (
        <HowItAddsUp check={check} />
      )}
    </div>
  );
}

/**
 * Side-by-side slides the user swipes between, on native scroll snapping so
 * the gesture is the phone's own rather than a re-implementation of it. Each
 * slide is narrower than the row so the next one's edge shows — the swipe is
 * otherwise invisible — and the dots say there is more and which is showing.
 */
function Swipeable({
  slides,
  labels,
}: {
  slides: ReactNode[];
  /** What each dot announces to a screen reader. */
  labels: string[];
}) {
  const row = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setActive(max > 0 ? Math.round((el.scrollLeft / max) * (slides.length - 1)) : 0);
  };

  const show = (i: number) => {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (max * i) / (slides.length - 1), behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={row}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div key={i} className="w-[88%] shrink-0 snap-start">
            {slide}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => show(i)}
            aria-label={labels[i]}
            aria-current={i === active}
            className="p-1.5"
          >
            <span
              className={
                "block size-1.5 rounded-full bg-foreground " +
                (i === active ? "opacity-70" : "opacity-20")
              }
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function UpcomingPaychecks({
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

  const jobs = workplaces
    .map((w) => ({ workplace: w, checks: upcomingPaychecks(shifts, w, today) }))
    .sort((a, b) => a.checks[0].payDate.localeCompare(b.checks[0].payDate));

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
          Next paycheck
        </h2>
        <Link href="/paychecks" className="text-xs underline opacity-60">
          Past paychecks
        </Link>
      </div>

      <ul className="mt-3 flex flex-col gap-4">
        {jobs.map(({ workplace, checks }) => {
          const mismatch = stubPayDateMismatch(workplace);
          return (
            <li key={workplace.id}>
              {/* The next check always leads. The one after only exists while
                  the next pays a period that has already closed — exactly when
                  a shift worked today isn't on it — and sits one swipe away. */}
              {checks.length === 1 ? (
                <CheckCard name={workplace.name} check={checks[0]} later={false} />
              ) : (
                <Swipeable
                  labels={checks.map(
                    (c) => `${workplace.name}, paid ${payDateLabel(c.payDate)}`,
                  )}
                  slides={checks.map((c, i) => (
                    <CheckCard
                      key={c.payDate}
                      name={workplace.name}
                      check={c}
                      later={i > 0}
                    />
                  ))}
                />
              )}

              {mismatch ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">
                  Your stub says a period ending{" "}
                  {payDateLabel(workplace.pay_period_end_date!)} was paid{" "}
                  {payDateLabel(mismatch.recorded)}, not the Friday after it
                  ended. Check this workplace&apos;s dates.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <PaycheckCaveats />
    </section>
  );
}
