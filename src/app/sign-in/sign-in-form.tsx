"use client";

import { useActionState } from "react";
import { sendCode, verifyCode, type AuthState } from "@/app/auth/actions";

const initialEmail: AuthState = { step: "email" };
const initialCode: AuthState = { step: "code" };

const field =
  "w-full rounded-xl border border-black/15 dark:border-white/20 bg-transparent " +
  "px-4 py-3.5 text-base outline-none focus:border-black/50 dark:focus:border-white/50";
const button =
  "w-full rounded-xl bg-foreground text-background px-4 py-3.5 text-base " +
  "font-medium disabled:opacity-50";

export function SignInForm() {
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
    );
  }

  return (
    <form action={codeAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <label htmlFor="code" className="text-sm opacity-70">
        Enter the 6-digit code sent to {email}
      </label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        // Lets iOS offer the code straight from the Mail notification.
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        placeholder="123456"
        className={`${field} text-center text-2xl tracking-[0.4em]`}
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
