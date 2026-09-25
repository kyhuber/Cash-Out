import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Google redirects here with a `code` after the consent screen. Exchanging it
 * is what actually creates the session — until this runs, the user has
 * authenticated with Google but Supabase doesn't know it yet.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}/`);
    } catch {
      // Missing/invalid Supabase config — fall through to the error redirect.
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent("Google sign-in didn't complete. Try again.")}`,
  );
}
