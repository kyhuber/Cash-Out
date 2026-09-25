"use client";

import { useActionState } from "react";
import {
  sendCode,
  verifyCode,
  signInWithGoogle,
  type AuthState,
} from "@/app/auth/actions";
import { OTP_MAX_LENGTH } from "@/lib/auth";

const initialEmail: AuthState = { step: "email" };
const initialCode: AuthState = { step: "code" };

const field =
  "w-full rounded-xl border border-black/15 dark:border-white/20 bg-transparent " +
  "px-4 py-3.5 text-base outline-none focus:border-black/50 dark:focus:border-white/50";
const button =
  "w-full rounded-xl bg-foreground text-background px-4 py-3.5 text-base " +
  "font-medium disabled:opacity-50";
const secondaryButton =
  "w-full rounded-xl border border-black/15 dark:border-white/20 px-4 py-3.5 " +
  "text-base font-medium flex items-center justify-center gap-2";

export function SignInForm({ oauthError }: { oauthError?: string }) {
  const [emailState, emailAction, emailPending] = useActionState(
    sendCode,
    initialEmail,
  );
  const [codeState, codeAction, codePending] = useActionState(
    verifyCode,
    initialCode,
  );

  const onCodeStep = emailState.step === "code";
  const email = emailState.email ?? "";

  if (!onCodeStep) {
    return (
      <div className="flex flex-col gap-4">
        <form action={signInWithGoogle}>
          <button type="submit" className={secondaryButton}>
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
        {oauthError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {oauthError}
          </p>
        ) : null}
        <div className="flex items-center gap-3 text-xs opacity-50">
          <div className="h-px flex-1 bg-current" />
          or
          <div className="h-px flex-1 bg-current" />
        </div>
        <form action={emailAction} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm opacity-70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            required
            defaultValue={emailState.email}
            placeholder="you@example.com"
            className={field}
          />
          {emailState.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {emailState.error}
            </p>
          ) : null}
          <button type="submit" disabled={emailPending} className={button}>
            {emailPending ? "Sending…" : "Email me a code"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={codeAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <label htmlFor="code" className="text-sm opacity-70">
        Enter the code sent to {email}
      </label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        // Lets iOS offer the code straight from the Mail notification.
        autoComplete="one-time-code"
        // Length is a per-project Supabase setting (6-10), not a constant.
        maxLength={OTP_MAX_LENGTH}
        required
        autoFocus
        placeholder="12345678"
        className={`${field} text-center text-2xl tracking-[0.3em]`}
      />
      {codeState.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {codeState.error}
        </p>
      ) : null}
      <button type="submit" disabled={codePending} className={button}>
        {codePending ? "Checking…" : "Sign in"}
      </button>
      <button
        type="submit"
        formAction={emailAction}
        formNoValidate
        className="text-sm underline opacity-70 py-2"
      >
        Use a different email
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
