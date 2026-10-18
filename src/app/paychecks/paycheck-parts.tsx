import type { Paycheck } from "@/lib/shift-summary";
import type { DateOnly } from "@/lib/pay-period";

/**
 * Pieces of a paycheck card shared by the upcoming checks on the home page and
 * the past checks on their own page.
 */

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** "Fri, Sep 18" */
export function payDateLabel(date: DateOnly): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Aug 31 – Sep 13" */
export function periodLabel(start: DateOnly, end: DateOnly): string {
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
export const subscribeToNothing = () => () => {};

function Line({
  label,
  amount,
  strong,
  negative,
}: {
  label: string;
  amount: number;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={
        "flex items-baseline justify-between gap-3 tabular-nums " +
        (strong ? "font-medium" : "")
      }
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm">
        {negative ? "−" : ""}
        {money(amount)}
      </span>
    </div>
  );
}

/**
 * Gross to take-home, one line each. Collapsed by default: the two figures
 * above it are what you glance at, and this is what you open when one of them
 * looks wrong against a stub.
 */
export function HowItAddsUp({ check }: { check: Paycheck }) {
  const s = check.summary;
  const regularHours = Math.round((s.hours - s.overtimeHours) * 100) / 100;
  return (
    <details className="mt-2 group">
      <summary className="text-xs underline opacity-70 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">How this adds up</span>
        <span className="hidden group-open:inline">Hide the breakdown</span>
      </summary>

      <div className="mt-2 flex flex-col gap-1">
        <Line label={`${regularHours} hrs at your rate`} amount={s.wages} />
        {s.overtimeHours > 0 ? (
          <Line label={`${s.overtimeHours} hrs overtime`} amount={s.overtime} />
        ) : null}
        {s.serviceCharge > 0 ? (
          <Line label="Service charge" amount={s.serviceCharge} />
        ) : null}
        <Line label="Card tips" amount={s.tipsCard} />
        <Line label="Gross" amount={s.gross} strong />

        {check.takeHome ? (
          <>
            {check.takeHome.deductions.map((d) => (
              <Line key={d.key} label={d.label} amount={d.amount} negative />
            ))}
            <Line label="Estimated take-home" amount={check.takeHome.net} strong />
          </>
        ) : (
          <p className="text-xs opacity-60 mt-1">
            No tax tables loaded for {check.payDate.slice(0, 4)} yet, so no
            take-home estimate for this check.
          </p>
        )}

        {s.tipsCash > 0 ? (
          <p className="text-xs opacity-60 mt-1 tabular-nums">
            Plus {money(s.tipsCash)} in cash tips you already took home.
          </p>
        ) : null}
      </div>
    </details>
  );
}

/**
 * The big number on a paycheck: estimated take-home, because the deposit is
 * what a worker actually sees. Gross only leads when the year has no tax
 * tables, and HeadlineNote says so.
 */
export function headlineAmount(check: Paycheck): number {
  return check.takeHome ? check.takeHome.net : check.summary.gross;
}

/**
 * What the headline is, and gross beside it for holding against a stub's top
 * line: "estimated take-home · $912.40 gross", or "gross · no 2027 tax rates
 * yet" when there is nothing to estimate with.
 */
export function HeadlineNote({ check }: { check: Paycheck }) {
  return (
    <p className="text-sm opacity-70 tabular-nums">
      {check.takeHome
        ? `estimated take-home · ${money(check.summary.gross)} gross`
        : `gross · no ${check.payDate.slice(0, 4)} tax rates yet`}
    </p>
  );
}

/** "Aug 31–Sep 13 · closed · 4 shifts · 26.5 hrs" */
export function PeriodLine({
  check,
  showOpen = true,
}: {
  check: Paycheck;
  /** Off where every check is long closed, and saying so is noise. */
  showOpen?: boolean;
}) {
  return (
    <p className="mt-1 text-xs opacity-60 tabular-nums">
      {periodLabel(check.period.start, check.period.end)}
      {showOpen ? (check.periodClosed ? " · closed" : " · still open") : ""} ·{" "}
      {check.summary.shifts} {check.summary.shifts === 1 ? "shift" : "shifts"}{" "}
      · {check.summary.hours} hrs
    </p>
  );
}

/**
 * The reasons a real deposit can differ. Said once per page, not per card,
 * because a number that reads as final and isn't is the failure this app
 * exists to prevent.
 */
export function PaycheckCaveats() {
  return (
    <p className="mt-3 text-xs opacity-60">
      Counts only shifts you&apos;ve logged. Cash tips aren&apos;t on the
      check, so they aren&apos;t in these figures. Take-home is an estimate
      from each job&apos;s W-4 settings and this year&apos;s rates; a stub can
      differ by a few cents of rounding, or by pay the app doesn&apos;t know
      about like a break premium or holiday rate.
    </p>
  );
}
