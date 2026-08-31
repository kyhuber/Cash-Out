"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * A misconfigured Supabase URL or key throws from createClient(). Surfacing
 * that as a form error puts the actionable message in front of whoever is
 * setting the app up, instead of a blank 500 page.
 */
async function clientOrConfigError() {
  try {
    return { supabase: await createClient(), configError: null };
  } catch (e) {
    return {
      supabase: null,
      configError: e instanceof Error ? e.message : "Supabase is not configured.",
    };
  }
}

export type AuthState = {
  step: "email" | "code";
  email?: string;
  error?: string;
};

const emailSchema = z.email();
const codeSchema = z.string().regex(/^\d{6}$/);

/**
 * Sends a 6-digit code. Deliberately no `emailRedirectTo`: a magic link would
 * open in Safari rather than the installed PWA, landing the session in a
 * different storage container than the app runs in. A code the user types
 * never leaves the app.
 *
 * Requires the Supabase "Magic Link" email template to emit {{ .Token }}.
 */
export async function sendCode(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!emailSchema.safeParse(email).success) {
    return { step: "email", error: "That doesn't look like an email address." };
  }

  const { supabase, configError } = await clientOrConfigError();
  if (!supabase) return { step: "email", email, error: configError };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (error) {
    return { step: "email", email, error: error.message };
  }

  return { step: "code", email };
}

export async function verifyCode(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const token = String(formData.get("code") ?? "").trim();

  if (!codeSchema.safeParse(token).success) {
    return { ...prev, step: "code", email, error: "Enter the 6-digit code." };
  }

  const { supabase, configError } = await clientOrConfigError();
  if (!supabase) return { step: "code", email, error: configError };

  // Which template issued the code depends on whether the account already
  // existed: a first-ever sign-in goes through "Confirm signup", every later
  // one through "Magic Link". Try the general email type first and fall back to
  // the signup type, so a new account can't get stuck unable to verify.
  let error = (await supabase.auth.verifyOtp({ email, token, type: "email" }))
    .error;

  if (error) {
    const fallback = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    // Report the first failure — it describes the expected flow.
    if (!fallback.error) error = null;
  }

  if (error) {
    return {
      step: "code",
      email,
      error: /expire/i.test(error.message)
        ? "That code has expired. Request a new one."
        : "That code didn't work. Try again.",
    };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
