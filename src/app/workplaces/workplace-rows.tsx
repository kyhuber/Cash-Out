import Link from "next/link";
import type { PayPeriodType } from "@/lib/pay-period";

export type RowWorkplace = {
  id: string;
  name: string;
  hourly_wage: number;
  pay_period_type: PayPeriodType;
};

const PERIOD_LABEL: Record<PayPeriodType, string> = {
  weekly: "Weekly",
  biweekly: "Every two weeks",
  semi_monthly: "Twice a month",
  monthly: "Monthly",
};

/**
 * Workplaces are configuration, touched twice a year, so they sit last and
 * carry no money of their own. The next-paycheck card above already says what
 * each job is worth right now; repeating a total here would put two different
 * figures for the same job on one screen, since that card follows the period
 * being paid next and not the one containing today.
 */
export function WorkplaceRows({ workplaces }: { workplaces: RowWorkplace[] }) {
  return (
    <ul className="mt-3 flex flex-col">
      {workplaces.map((w) => (
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
                ${w.hourly_wage.toFixed(2)}/hr · {PERIOD_LABEL[w.pay_period_type]}
              </span>
            </span>
            <span className="text-xs opacity-50 shrink-0 underline">Edit</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
