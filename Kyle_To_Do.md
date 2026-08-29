# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** August 29, 2026 — after the first build session.

---

## ⏭️ Do these next

These are what stand between the current code and it running on your phone.
Nothing else in this file is urgent yet.

### 1. Create a Supabase project — *action*

- [ ] Go to [supabase.com](https://supabase.com) → **New project**
- [ ] Pick the region closest to Seattle (`West US (Oregon)` or similar)
- [ ] Save the database password somewhere safe — you'll want it later, and it
      isn't shown again

### 2. Get the two keys into the app — *action*

- [ ] In the dashboard: **Project Settings → Data API** → copy the **Project URL**
- [ ] **Project Settings → API Keys** → copy the **anon / publishable** key
      (⚠️ *not* the `service_role` / secret key — that one bypasses all privacy
      rules and must never go in the app)
- [ ] In the repo: `cp .env.example .env.local` and paste both values in

### 3. Create the database tables — *action*

- [ ] Dashboard → **SQL Editor** → **New query**
- [ ] Paste the entire contents of
      `supabase/migrations/0001_initial_schema.sql` and hit **Run**
- [ ] You should see tables `workplaces` and `shifts` under **Table Editor**

### 4. Switch the sign-in email to send a code — *action* ⚠️

**This is the one step that silently breaks sign-in if you skip it.**

The app signs you in with a 6-digit code, not a magic link — a link would open
in Safari and put your session outside the installed app. But Supabase sends a
link by default.

- [ ] Dashboard → **Authentication → Emails** → **Magic Link** template
- [ ] Replace the body with something that sends the code instead of the link:

      Your Cash Out sign-in code is: <strong>{{ .Token }}</strong>

- [ ] The key part is `{{ .Token }}`. If the template still only has
      `{{ .ConfirmationURL }}`, there's no code to type and sign-in will fail.

### 5. Confirm one decision I made for you — *decision*

Your PRD says to capture an **anchor pay date** from a pay stub. I built it as
the **first day of a pay period** instead, because a pay date usually falls
*after* the period it pays for, which makes "which period does this shift belong
to?" ambiguous.

So onboarding will ask *"What was the first day of a recent pay period?"* rather
than *"When were you last paid?"*

- [ ] **Fine as-is**, or
- [ ] **You'd rather enter the pay date** and have the app work backwards
      (doable, but needs a rule for how many days before payday the period ends)

---

## Phase 2 — Workplace setup

Needed before a single shift can be logged. Have a recent pay stub from **each**
job in front of you.

### Actions

- [ ] **Lumen Field** — from a pay stub, find:
  - Base hourly wage
  - Pay period type (weekly / biweekly / semi-monthly / monthly)
  - The first day of one recent pay period
- [ ] **Climate Pledge Arena (Moët & Chandon Imperial Lounge)** — same three
- [ ] Note whether either job pays overtime, and at what multiplier (usually 1.5×)

### Decisions

- [ ] **Which optional fields to turn on per workplace.** The starter list is:
      `total sales`, `tip-out paid`, `shift type` (concert / game / private
      event), `guest count`, `notes`. Your PRD says one job reports total sales
      and the other doesn't — worth confirming which is which. Unused fields
      cost nothing, so it's fine to enable generously.
- [ ] **PRD open question:** is that list right, or is something missing that
      you'd actually want logged?
- [ ] **Overtime rule.** Washington has no *daily* overtime requirement — it's
      weekly over 40 hours — so a flat per-workplace flag should cover both your
      jobs. Confirm neither job has a daily rule. (A friend in California later
      would need daily rules; that's a v2 problem.)

---

## Phase 3 — Conversational shift logging

This is the actual product, and the phase where your input matters most.

### Actions

- [ ] **Write down 10–20 examples of how you'd actually describe a shift**,
      in your own words, the way you'd say it at 1am — not cleaned up.
      Things like *"Lumen, four til close, 180 on cards and like 40 cash."*

      This is the single most useful thing you can give me. The parser gets
      tuned against how *you* talk, not textbook phrasing, and I can't guess it.
      Include the messy ones: trailing off, correcting yourself, vague times.

- [ ] Confirm how you'll dictate — iOS keyboard mic, or Wispr Flow. Both are
      OS-level so the app doesn't care, but worth knowing what you'll really use.

### Decisions

- [ ] **What should "til close" mean?** Options: leave the clock-out blank for
      you to fill in, or store a default closing time per workplace and
      pre-fill it (still editable). The second is faster but is the app
      guessing at a number — and catching wrong numbers is the whole point.
- [ ] **How hard should the confirmation card push back on missing data?**
      My default: anything you didn't say renders as an empty field to fill,
      never as a guess. Confirm that's what you want.

---

## Phase 4 — Shift history

No decisions expected. If you want filters beyond "by workplace," say so.

---

## Phase 5 — Pay-period summary

### Decisions

- [ ] **Which number leads?** There are two, and they differ:
  - **What the employer owed you** — hours × wage + tips. This is what you hold
    against the pay stub.
  - **What you actually took home** — the same, minus tip-out.

  My recommendation: lead with the employer-owed figure, since paycheck-checking
  is the reason the app exists, and show take-home underneath.

---

## Phase 6 — Deploy and actually use it

### Actions

- [ ] Create a [Vercel](https://vercel.com) account and import this repo
- [ ] Add the same env vars from `.env.local` to the Vercel project settings
- [ ] Get an Anthropic API key at
      [console.anthropic.com](https://console.anthropic.com) → **API Keys**,
      and add it to Vercel as `ANTHROPIC_API_KEY`
      *(cost for your usage will be pennies a month — each shift is one tiny call)*
- [ ] On your iPhone, open the deployed URL **in Safari** → Share → **Add to
      Home Screen**. It has to be Safari; Chrome can't install it on iOS.
- [ ] **Log real shifts for 2–3 weeks before showing anyone.** This is where
      you find out how the parser handles your actual phrasing.
- [ ] Hold one pay-period summary against a real pay stub and see if it matches.

---

## Phase 7 — Friends

### Decisions

- [ ] **PRD open question: self-serve signup, or do you provision accounts?**
      My recommendation is self-serve — hand-provisioning becomes a chore in
      about three weeks. Row-level security is what keeps everyone's data
      separate; you just don't advertise the URL.

---

## ✅ Already decided

Kept here so we don't relitigate them. Say the word if you want any reopened.

| Decision | Choice | When |
|---|---|---|
| Sign-in method | Email 6-digit code, not magic link or Google | Aug 29 |
| Shifts store the wage they were worked at | Yes — a raise won't rewrite history | Aug 29 |
| Overnight shifts | Belong to the date they started; duration wraps 24h | Aug 29 |
| Tip-out | Tracked, so both gross and take-home can be shown | Aug 29 |
| Framework | Next.js 16 + Supabase + Vercel | Aug 29 |
| Service worker | Skipped — iOS doesn't need it, and stale caches would risk showing wrong numbers | Aug 29 |
| Separate `users` table | Skipped — Supabase's `auth.users` already has it | Aug 29 |

---

## ✅ Already done

- [x] Renamed `CLAUDE` → `CLAUDE.md` so project instructions load
- [x] Renamed `PRD` → `Cash_Out_PRD.md` so it renders and the links resolve
- [x] Database schema written, with row-level security tested against
      cross-user reads, writes, and deletes
- [x] Email-code sign-in built end to end
- [x] Installable PWA shell — manifest, icons, iOS home-screen support
- [x] Pay-period and shift-duration math, unit tested
