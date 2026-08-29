"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
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

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { step: "code", email, error: "That code didn't work. Try again." };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
