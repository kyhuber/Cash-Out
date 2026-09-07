import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { knownStations } from "../actions";
import { EditShiftForm } from "./edit-shift-form";
import type { FieldsWorkplace, ShiftValues } from "../shift-fields";
import type { OptionalFieldKey } from "@/lib/workplace";

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
        "id, workplace_id, station, shift_date, clock_in, clock_out, tips_cash, tips_card, tip_out, optional_field_values, raw_input_text",
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
    total_sales: num(optional.total_sales),
    shift_type: (optional.shift_type as string) ?? null,
    guest_count: num(optional.guest_count),
    notes: (optional.notes as string) ?? null,
  };

  return (
    <main className="flex-1 px-6 py-10 max-w-sm w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Edit shift</h1>
      <EditShiftForm
        id={shift.id}
        workplaces={workplaces}
        values={values}
        rawInputText={shift.raw_input_text}
      />
    </main>
  );
}
