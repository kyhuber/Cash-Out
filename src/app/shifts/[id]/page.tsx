import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { knownStations } from "../actions";
import { EditShiftForm } from "./edit-shift-form";
import { ShiftBreakdown } from "../shift-breakdown";
import type { FieldsWorkplace, ShiftValues } from "../shift-fields";
import type { OptionalFieldKey } from "@/lib/workplace";
import { shiftPay } from "@/lib/shift-pay";

export const dynamic = "force-dynamic";

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

export default async function EditShiftPage({
  params,
}: PageProps<"/shifts/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS scopes both of these to the signed-in user, so someone else's shift
  // simply comes back empty rather than forbidden.
  const [{ data: shift }, { data: workplaceRows }] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, workplace_id, station, shift_date, clock_in, clock_out, minutes_worked, tips_cash, tips_card, tip_out, service_charge, hourly_wage_at_time, overtime_multiplier_at_time, overtime_threshold_at_time, optional_field_values, raw_input_text",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("workplaces")
      .select("id, name, optional_fields")
      .order("created_at", { ascending: true }),
  ]);

  if (!shift) notFound();

  const stations = await knownStations(supabase);

  const workplaces: FieldsWorkplace[] = (workplaceRows ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    optional_fields: (w.optional_fields ?? []) as OptionalFieldKey[],
    stations: stations[w.id] ?? [],
  }));

  const optional = (shift.optional_field_values ?? {}) as Record<string, unknown>;

  const values: ShiftValues = {
    workplace_id: shift.workplace_id,
    station: shift.station,
    shift_date: shift.shift_date,
    // Postgres returns `time` as HH:MM:SS; the form's time input wants HH:MM.
    clock_in: String(shift.clock_in).slice(0, 5),
    clock_out: String(shift.clock_out).slice(0, 5),
    tips_cash: num(shift.tips_cash),
    tips_card: num(shift.tips_card),
    tip_out: num(shift.tip_out),
    service_charge: num(shift.service_charge),
    total_sales: num(optional.total_sales),
    shift_type: (optional.shift_type as string) ?? null,
    guest_count: num(optional.guest_count),
    notes: (optional.notes as string) ?? null,
  };

  // Valued at the terms stored ON the shift, which is what it was worth when
  // it was worked — not what the workplace pays today.
  const pay = shiftPay({
    minutes_worked: Number(shift.minutes_worked),
    hourly_wage_at_time: Number(shift.hourly_wage_at_time),
    overtime_multiplier_at_time: num(shift.overtime_multiplier_at_time),
    overtime_threshold_at_time: num(shift.overtime_threshold_at_time),
    tips_cash: Number(shift.tips_cash),
    tips_card: Number(shift.tips_card),
    service_charge: Number(shift.service_charge),
  });

  return (
    <main className="flex-1 px-6 py-10 max-w-sm w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Edit shift</h1>

      <section className="mb-8 rounded-xl border border-black/10 dark:border-white/15 px-4 py-3.5">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
          What this shift earned
        </h2>
        <ShiftBreakdown pay={pay} wage={Number(shift.hourly_wage_at_time)} />
        <p className="mt-2 text-xs opacity-60">
          Worked out from the figures below at the wage this shift was saved
          with. Change a number and save to see it update.
        </p>
      </section>

      <EditShiftForm
        id={shift.id}
        workplaces={workplaces}
        values={values}
        rawInputText={shift.raw_input_text}
      />
    </main>
  );
}
