# Cash Out

A low-friction shift and tip tracker for hourly service workers. Log a shift by talking or typing a sentence — Cash Out parses it into structured data, so you always have your own record to check against your paycheck.

## Why this exists

Built after a coworker discovered an employer hadn't paid out tips from a shift — and only caught it because they happened to check their pay stub closely. Cash Out makes it easy enough to log every shift that you actually will, so you always have something to check your paycheck against.

## Full spec

See [`Cash_Out_PRD.md`](./Cash_Out_PRD.md) for the complete product requirements — MVP scope, data model, architecture, and roadmap.

## Stack

- Frontend: mobile-first PWA
- Backend: small API layer (holds the Anthropic API key, enforces per-user data privacy)
- Database/Auth: Supabase (Postgres + row-level security)
- Hosting: Vercel
- Voice input: native OS keyboard dictation, not the in-browser Web Speech API (unreliable on iOS Safari)

## Status

Pre-implementation. This repo currently holds the spec; build is starting via Claude Code.

## Environment variables

See `.env.example`. You'll need your own Supabase project and Anthropic API key — neither is committed here.
