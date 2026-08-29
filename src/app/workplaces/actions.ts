"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  needsAnchorDate,
  optionalNumber,
  workplaceSchema,
  OPTIONAL_FIELD_KEYS,
  type OptionalFieldKey,
} from "@/lib/workplace";
import type { PayPeriodType } from "@/lib/pay-period";

export type WorkplaceFormState = {
  errors?: Record<string, string>;
  formError?: string;
};

/**
 * Builds the row from form input.
 *
 * Two normalisations happen here rather than in the browser, because the client
 * can send anything: a hidden anchor field is forced to null for calendar-based
 * pay periods, and the overtime multiplier is dropped when overtime is off.
 * Both mirror constraints the database enforces anyway.
 */
function readForm(formData: FormData) {
  const payPeriodType = String(
    formData.get("pay_period_type") ?? "",
  ) as PayPeriodType;

  const overtimeEnabled = formData.get("overtime_enabled") === "on";

  const anchorRaw = String(formData.get("pay_period_anchor_date") ?? "").trim();

  const submitted = formData.getAll("optional_fields").map(String);
  const optionalFields = submitted.filter((f): f is OptionalFieldKey =>
    (OPTIONAL_FIELD_KEYS as readonly string[]).includes(f),
  );

  return {
    name: String(formData.get("name") ?? ""),
    hourly_wage: optionalNumber(formData.get("hourly_wage")) ?? Number.NaN,
    pay_period_type: payPeriodType,
    pay_period_anchor_date:
      needsAnchorDate(payPeriodType) && anchorRaw !== "" ? anchorRaw : null,
    overtime_enabled: overtimeEnabled,
    overtime_multiplier: overtimeEnabled
      ? optionalNumber(formData.get("overtime_multiplier"))
      : null,
    optional_fields: optionalFields,
  };
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

export async function createWorkplace(
  _prev: WorkplaceFormState,
  formData: FormData,
): Promise<WorkplaceFormState> {
  const parsed = workplaceSchema.safeParse(readForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // user_id comes from the session, never from the form. RLS would reject a
  // mismatch anyway, but the app should not be sending one in the first place.
  const { error } = await supabase
    .from("workplaces")
    .insert({ ...parsed.data, user_id: user.id });

  if (error) return { formError: error.message };

  revalidatePath("/");
  redirect("/");
}

export async function updateWorkplace(
  _prev: WorkplaceFormState,
  formData: FormData,
): Promise<WorkplaceFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { formError: "Missing workplace id" };

  const parsed = workplaceSchema.safeParse(readForm(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Scoped by user_id as well as id: RLS enforces this, and saying so here
  // means a mismatched id updates nothing instead of erroring obscurely.
  const { error } = await supabase
    .from("workplaces")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { formError: error.message };

  revalidatePath("/");
  redirect("/");
}

export async function deleteWorkplace(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Shifts cascade with the workplace — see the on delete cascade in 0001.
  await supabase.from("workplaces").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/");
  redirect("/");
}
