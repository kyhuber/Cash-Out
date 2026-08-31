# Cash Out — Project Instructions

@AGENTS.md

Read `Cash_Out_PRD.md` first — it's the full spec. This file is for the invariants that should hold in every session, not a restatement of it.

## Non-negotiables

- Always show an editable confirmation card before saving a parsed shift entry. Never auto-save an LLM-parsed entry without user confirmation — the whole point of this app is catching wrong numbers.
- Voice/text input goes through native OS keyboard dictation, not the in-browser Web Speech API (unreliable on iOS Safari).
- Each user's data is private (row-level isolation via Supabase). No cross-user data access in v1.
- Keep the Anthropic API key server-side only — never expose it to the browser.
- The app authenticates to Supabase with the PUBLISHABLE key
  (`sb_publishable_...`, formerly the anon key). Never the SECRET key
  (`sb_secret_...`, formerly `service_role`) — it bypasses row-level security,
  which would show every user everyone else's shifts. `src/lib/env.ts` refuses
  to start with one; keep that check.
- Sign-in is a 6-digit email code, never a magic link. A link opens in Safari,
  so the session lands outside the installed PWA's storage container. This needs
  BOTH the "Confirm signup" template (a user's first sign-in, which creates the
  account) and the "Magic Link" template (every one after) to emit
  `{{ .Token }}` — editing only the latter leaves first sign-in broken. Editing
  templates at all requires custom SMTP on a new free-tier project, and the
  built-in provider only delivers to project team members, so custom SMTP is
  required before anyone but the owner can sign in.
- A shift stores the wage it was worked at (`hourly_wage_at_time`). A later
  raise must never retroactively change what a past shift was worth.
- A shift belongs to the date it STARTED. Overnight shifts (20:00 -> 02:00) are
  one shift on the earlier date; `minutes_worked` wraps by 24h.
- `pay_period_anchor_date` is the FIRST DAY of a known pay period, not the pay
  date. Ask for it that way in the UI.
- `src/lib/pay-period.ts` and the `minutes_worked` generated column in
  `supabase/migrations/0001_initial_schema.sql` implement the same rule. Change
  them together; `scripts/test-db.sh` and the unit tests both check it.

## Keeping Kyle_To_Do.md current

`Kyle_To_Do.md` is the running list of what the project needs *from Kyle* —
actions only Kyle can take (accounts, API keys, pay stub details) and
decisions only Kyle can make.

Rewrite it whenever an action is completed or a decision is made, in the same
turn as the work itself — not at the end of a session. That means:

- Move anything just decided into the "Already decided" table with the date,
  and anything just finished into "Already done".
- Re-cut the "Do these next" section so it only holds what is actually
  blocking right now.
- Add any new action or decision the work surfaced.
- Update the "Last updated" line.

If a phase's work reveals that a listed decision no longer matters, delete it
rather than leaving it to rot. The file is only useful if the top of it can be
trusted.

## Stack

- PWA frontend, mobile-first
- Supabase (Postgres + auth + RLS)
- Vercel hosting
- Small backend API layer for the Anthropic parsing call

## Scope discipline

MVP is Section 5 of the PRD. Backlog items (Section 9) — automated paycheck reconciliation, real overtime math, dashboards, exports, notifications, tip-out splitting, App Store distribution — are out of scope unless explicitly asked for.

## Build/run commands

Framework is Next.js (App Router, TypeScript, Tailwind v4) on Node 22.

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # eslint
npx tsc --noEmit     # typecheck
npm test             # vitest unit tests
./scripts/test-db.sh # applies the schema to a scratch DB and tests RLS
```

`scripts/test-db.sh` needs a local Postgres and drops/recreates its target
database — point it at a scratch DB, never at the real Supabase project.

Note: Next 16 renamed Middleware to Proxy. Session refresh lives in
`src/proxy.ts`, and it is NOT an authorization boundary — pages check the
session themselves and RLS is what actually protects the data.
