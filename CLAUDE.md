# Cash Out — Project Instructions

Read `Cash_Out_PRD.md` first — it's the full spec. This file is for the invariants that should hold in every session, not a restatement of it.

## Non-negotiables

- Always show an editable confirmation card before saving a parsed shift entry. Never auto-save an LLM-parsed entry without user confirmation — the whole point of this app is catching wrong numbers.
- Voice/text input goes through native OS keyboard dictation, not the in-browser Web Speech API (unreliable on iOS Safari).
- Each user's data is private (row-level isolation via Supabase). No cross-user data access in v1.
- Keep the Anthropic API key server-side only — never expose it to the browser.

## Stack

- PWA frontend, mobile-first
- Supabase (Postgres + auth + RLS)
- Vercel hosting
- Small backend API layer for the Anthropic parsing call

## Scope discipline

MVP is Section 5 of the PRD. Backlog items (Section 9) — automated paycheck reconciliation, real overtime math, dashboards, exports, notifications, tip-out splitting, App Store distribution — are out of scope unless explicitly asked for.

## Build/run commands

_To be filled in once the framework is chosen._
