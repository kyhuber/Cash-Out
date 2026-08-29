import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkplaceForm } from "../workplace-form";
import { updateWorkplace } from "../actions";
import type { Workplace } from "@/lib/workplace";

export const dynamic = "force-dynamic";

export default async function EditWorkplacePage({
  params,
}: PageProps<"/workplaces/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS already scopes this to the signed-in user, so a workplace belonging to
  // someone else simply comes back empty rather than forbidden.
  const { data } = await supabase
    .from("workplaces")
    .select(
      "id, name, hourly_wage, overtime_enabled, overtime_multiplier, pay_period_type, pay_period_anchor_date, optional_fields",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const workplace: Workplace = {
    ...data,
    hourly_wage: Number(data.hourly_wage),
    overtime_multiplier:
      data.overtime_multiplier === null ? null : Number(data.overtime_multiplier),
  };

  return (
    <main className="flex-1 px-6 py-10 max-w-sm w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">
        Edit workplace
      </h1>
      <WorkplaceForm
        action={updateWorkplace}
        workplace={workplace}
        submitLabel="Save changes"
      />
    </main>
  );
}
