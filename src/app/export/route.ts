import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { nextFridayAfter, payPeriodFor, type PayPeriodType } from "@/lib/pay-period";
import { shiftPay } from "@/lib/shift-pay";

export const dynamic = "force-dynamic";

const HEADER = [
  "date",
  "workplace",
  "bar_or_lounge",
  "clock_in",
  "clock_out",
  "hours",
  "regular_hours",
  "overtime_hours",
  "hourly_wage",
  "overtime_rate",
  "wages",
  "overtime_pay",
  "service_charge",
  "card_tips",
  "cash_tips",
  "on_paycheck",
  "total_earned",
  "tip_out",
  "pay_period_start",
  "pay_period_end",
  "pay_date",
  "event_type",
  "guests",
  "total_sales",
  "notes",
  "what_you_said",
] as const;

/**
 * Every shift the signed-in user has logged, as a spreadsheet.
 *
 * The record kept available to look at, in the tool people already reach for
 * when they want to slice it. Each row carries the same per-shift arithmetic
 * the app shows, plus the pay period and pay date it falls in, so a stub can
 * be matched by filtering on one column. Nothing is summarised here: that is
 * what the spreadsheet is for.
 *
 * RLS scopes the query to the user; the session check is so an expired one
 * lands on sign-in rather than an empty file.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: workplaces, error: wErr }, { data: shifts, error: sErr }] =
    await Promise.all([
      supabase
        .from("workplaces")
        .select("id, name, pay_period_type, pay_period_anchor_date"),
      supabase
        .from("shifts")
        .select(
          "shift_date, workplace_id, station, clock_in, clock_out, minutes_worked, tips_cash, tips_card, tip_out, service_charge, hourly_wage_at_time, overtime_multiplier_at_time, overtime_threshold_at_time, optional_field_values, raw_input_text",
        )
        .order("shift_date", { ascending: true })
        .order("clock_in", { ascending: true }),
    ]);

  if (wErr || sErr) {
    return new Response(`Couldn't load your shifts: ${(wErr ?? sErr)!.message}`, {
      status: 500,
    });
  }

  const byId = new Map((workplaces ?? []).map((w) => [w.id, w] as const));
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

  const rows = (shifts ?? []).map((s) => {
    const w = byId.get(s.workplace_id);
    const pay = shiftPay({
      minutes_worked: Number(s.minutes_worked),
      hourly_wage_at_time: Number(s.hourly_wage_at_time),
      overtime_multiplier_at_time: num(s.overtime_multiplier_at_time),
      overtime_threshold_at_time: num(s.overtime_threshold_at_time),
      tips_cash: Number(s.tips_cash),
      tips_card: Number(s.tips_card),
      service_charge: Number(s.service_charge),
    });

    // A shift whose workplace can't be read gets blank period columns rather
    // than a guessed cadence.
    const period = w
      ? payPeriodFor(
          s.shift_date,
          w.pay_period_type as PayPeriodType,
          w.pay_period_anchor_date ?? null,
        )
      : null;

    const extra = (s.optional_field_values ?? {}) as Record<string, unknown>;
    const text = (v: unknown) => (typeof v === "string" ? v : null);

    return [
      s.shift_date,
      w?.name ?? "",
      s.station,
      String(s.clock_in).slice(0, 5),
      String(s.clock_out).slice(0, 5),
      pay.hours,
      pay.regularHours,
      pay.overtimeHours,
      Number(s.hourly_wage_at_time),
      pay.overtimeRate,
      pay.wages,
      pay.overtime,
      pay.serviceCharge,
      pay.tipsCard,
      pay.tipsCash,
      pay.onCheck,
      pay.earned,
      Number(s.tip_out),
      period?.start ?? null,
      period?.end ?? null,
      period ? nextFridayAfter(period.end) : null,
      text(extra.shift_type),
      num(extra.guest_count),
      num(extra.total_sales),
      text(extra.notes),
      s.raw_input_text,
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(HEADER, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cash-out-shifts-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
