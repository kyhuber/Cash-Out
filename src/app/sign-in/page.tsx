import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  // Tolerate a broken Supabase config here so the form still renders and can
  // show the real reason when the user submits it.
  let user = null;
  try {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }

  if (user) redirect("/");

  return (
    <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-sm w-full mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight">Cash Out</h1>
      <p className="mt-2 mb-8 opacity-70 text-sm">
        Keep your own record of every shift.
      </p>
      <SignInForm />
    </main>
  );
}
