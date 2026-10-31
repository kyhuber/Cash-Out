import type { ShiftPay } from "@/lib/shift-pay";
import type { DateOnly } from "@/lib/pay-period";
import { payDateLabel } from "@/app/paychecks/paycheck-parts";

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * How one shift's pay adds up, line by line.
 *
 * Every line is stated as the arithmetic behind it — hours times rate — so a
 * figure can be checked with a calculator, and a wrong number in the source
 * (a misread clock-out, a wage typed wrong) shows up as a wrong line rather
 * than a wrong total.
 *
 * Tip-out comes off before the paycheck line, because the employer deducts it
 * from the check. Take-home is this shift's gross less its share of the taxes
 * on the check it is paid on (`shiftTakeHome`); null when there are no tax
 * tables for that year.
 */
export function ShiftBreakdown({
  pay,
  wage,
  takeHome,
  tracksTipOut,
}: {
  pay: ShiftPay;
  wage: number;
  takeHome: { net: number; payDate: DateOnly } | null;
  /** Show a $0 tip-out line too, where the job tracks it. */
  tracksTipOut: boolean;
}) {
  const line = (
    label: string,
    amount: number,
    { strong = false, negative = false } = {},
  ) => (
    <div
      key={label}
      className={
        "flex items-baseline justify-between gap-3 tabular-nums " +
        (strong ? "font-medium" : "")
      }
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm">
        {negative && amount > 0 ? "−" : ""}
        {money(amount)}
      </span>
    </div>
  );

  return (
    <div className="mt-2 flex flex-col gap-1">
      {line(`${pay.regularHours} hrs × ${money(wage)}`, pay.wages)}
      {pay.overtimeHours > 0 && pay.overtimeRate !== null
        ? line(
            `${pay.overtimeHours} hrs overtime × ${money(pay.overtimeRate)}`,
            pay.overtime,
          )
        : null}
      {pay.serviceCharge > 0 ? line("Service charge", pay.serviceCharge) : null}
      {line("Card tips", pay.tipsCard)}
      {pay.tipOut > 0 || tracksTipOut
        ? line("Tipped out", pay.tipOut, { negative: true })
        : null}
      <div className="mt-1 border-t border-black/10 dark:border-white/15 pt-1 flex flex-col gap-1">
        {line("Gross on the paycheck, before taxes", pay.onCheck, {
          strong: true,
        })}
        {takeHome ? (
          <>
            {line("Estimated take-home", takeHome.net, { strong: true })}
            <p className="text-xs opacity-60">
              After this shift&apos;s share of the taxes on the{" "}
              {payDateLabel(takeHome.payDate)} check.
            </p>
          </>
        ) : (
          <p className="text-xs opacity-60">
            No tax rates loaded for this shift&apos;s pay date yet, so no
            take-home estimate.
          </p>
        )}
      </div>
      <div className="mt-1 border-t border-black/10 dark:border-white/15 pt-1 flex flex-col gap-1">
        {line("Cash tips, taken home", pay.tipsCash)}
        {line("Total earned, before taxes", pay.earned, { strong: true })}
      </div>
    </div>
  );
}
