import type { ShiftPay } from "@/lib/shift-pay";

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * How one shift's pay adds up, line by line.
 *
 * Every line is stated as the arithmetic behind it — hours times rate — so a
 * figure can be checked with a calculator, and a wrong number in the source
 * (a misread clock-out, a wage typed wrong) shows up as a wrong line rather
 * than a wrong total.
 */
export function ShiftBreakdown({ pay, wage }: { pay: ShiftPay; wage: number }) {
  const line = (label: string, amount: number, strong = false) => (
    <div
      key={label}
      className={
        "flex items-baseline justify-between gap-3 tabular-nums " +
        (strong ? "font-medium" : "")
      }
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm">{money(amount)}</span>
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
      {line("On the paycheck", pay.onCheck, true)}
      {line("Cash tips, taken home", pay.tipsCash)}
      <div className="mt-1 border-t border-black/10 dark:border-white/15 pt-1">
        {line("Total earned", pay.earned, true)}
      </div>
    </div>
  );
}
