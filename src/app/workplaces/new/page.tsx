import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkplaceForm } from "../workplace-form";
import { createWorkplace } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewWorkplacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex-1 px-6 py-10 max-w-sm w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Add a workplace
      </h1>
      <p className="text-sm opacity-70 mb-8">
        You&apos;ll need a recent pay stub for the wage and pay period.
      </p>
      <WorkplaceForm action={createWorkplace} submitLabel="Add workplace" />
    </main>
  );
}
