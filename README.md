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

In progress. Three of the five MVP features are built: multi-user auth
(email-code sign-in), workplace setup, and conversational shift logging with an
editable confirmation card — on top of a schema with row-level security and an
installable PWA shell. Shift history and the pay-period summary are still to
come.

## What's needed from you

See [`Kyle_To_Do.md`](./Kyle_To_Do.md) for the running list of actions and
decisions the project is waiting on. The top section is always what's blocking.

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run dev
```

Apply the migrations in `supabase/migrations/` to your Supabase project in
filename order, then follow the note at the bottom of `.env.example` to enable
custom SMTP and switch both email templates over to sending a code.

```bash
npm test              # unit tests
npm run build         # production build
./scripts/test-db.sh  # schema + row-level-security tests against a scratch DB
```

## Environment variables

See `.env.example`. You'll need your own Supabase project and Anthropic API key — neither is committed here.
