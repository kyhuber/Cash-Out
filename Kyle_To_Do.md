# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** August 29, 2026 — reordered for a browser-only setup (no
local checkout needed).

---

## ⏭️ Do these next

None of this needs a copy of the code on your computer — Supabase, Vercel and
GitHub are all browser-only. Steps 1–4 set up the database and sign-in, 5–6 get
it onto your phone, and 7 is what you'll need in hand once it's there.

### 1. Create a Supabase project — *action*

- [ ] Go to [supabase.com](https://supabase.com) → **New project**
- [ ] Pick the region closest to Seattle (`West US (Oregon)` or similar)
- [ ] Save the database password somewhere safe — you'll want it later, and it
      isn't shown again

### 2. Copy the two Supabase keys somewhere handy — *action*

You'll paste these into Vercel in step 5. Nothing to install.

- [ ] In the dashboard: **Project Settings → Data API** → copy the **Project URL**
- [ ] **Project Settings → API Keys** → copy the **anon / publishable** key
      (⚠️ *not* the `service_role` / secret key — that one bypasses all privacy
      rules and must never leave the dashboard)

*(The anon key is safe to expose — row-level security is what protects your
data. This repo is public, so never put a secret key in a file here.)*

### 3. Create the database tables — *action*

There are now **two** migration files, and they must be run **in order**.

- [ ] Dashboard → **SQL Editor** → **New query**
- [ ] Paste all of `supabase/migrations/0001_initial_schema.sql` → **Run**
- [ ] New query again, paste all of
      `supabase/migrations/0002_conditional_anchor_date.sql` → **Run**
- [ ] Check **Table Editor** — you should see `workplaces` and `shifts`

*(Skipping 0002 means the app will reject any workplace paid monthly or twice a
month, because the schema will still demand a pay-period anchor date it no
longer asks you for.)*

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

### 5. Deploy it — *action*

Nothing here needs a copy of the code on your computer. Vercel builds straight
from GitHub.

- [ ] [vercel.com](https://vercel.com) → **Add New → Project → Import Git
      Repository** → pick `kyhuber/Cash-Out`
- [ ] On the import screen, under **Environment Variables**, add:
      - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL from step 2
      - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon key from step 2
- [ ] Deploy, then open the URL it gives you and sign in

⚠️ Vercel bakes environment variables in **at build time**. If you change one
later (Project → Settings → Environment Variables), the live site keeps the old
value until you redeploy: **Deployments → `⋯` on the latest → Redeploy.**

*(`ANTHROPIC_API_KEY` goes here too, but not until shift logging exists. It
deliberately has no `NEXT_PUBLIC_` prefix, which is what keeps it off the
browser.)*

### 6. Put it on your phone — *action*

- [ ] Open the Vercel URL **in Safari** on your iPhone → Share → **Add to Home
      Screen**. It has to be Safari; Chrome can't install a PWA on iOS.

### 7. Get your pay stub details together — *action*

The workplace form is built and waiting. For **each** job, have a recent pay
stub in front of you and find:

- [ ] **Lumen Field** — base hourly wage · how often you're paid · the first day
      of a recent pay period · whether it pays overtime (and at what rate)
- [ ] **Climate Pledge Arena** (Moët & Chandon Imperial Lounge) — the same four

You'll also pick, per job, which of these it actually reports to you:
*total sales · tip-out paid · event type · number of guests · notes*. Only tick
what you can really find out. If something you'd want is missing from that list,
tell me — that's the PRD's open question about the field list, and now you can
answer it by looking at the real form.

### 8. Confirm one decision I made for you — *decision*

Your PRD says to capture an **anchor pay date**. I built it as the **first day
of a pay period** instead, because a pay date usually falls *after* the period it
covers, which makes "which period does this shift belong to?" ambiguous.

The form asks: *"First day of a recent pay period — not the day you got paid."*

- [ ] **Fine as-is**, or
- [ ] **You'd rather enter the pay date** and have the app work backwards
      (doable, but needs a rule for how many days before payday the period ends)

---

## Phase 3 — Conversational shift logging

**This is what I'm building next**, and the phase where your input matters most.

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

Deploying moved up to step 5 — it's how you'll use the app at all, not a
final step. What's left here is the part that can't be rushed.

### Actions

- [ ] Get an Anthropic API key at
      [console.anthropic.com](https://console.anthropic.com) → **API Keys**,
      and add it to Vercel as `ANTHROPIC_API_KEY`, then redeploy
      *(cost for your usage will be pennies a month — each shift is one tiny call)*
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
| Anchor date for monthly / twice-monthly jobs | Not asked for — those periods follow the calendar, so the form hides the field | Aug 29 |
| Deleting a workplace | Deletes its shifts too, behind a confirm step | Aug 29 |
| Working without a local checkout | Yes — Supabase, Vercel and GitHub are all browser-only. Keys live in Vercel's dashboard, never in a committed file | Aug 29 |

---

## ✅ Already done

- [x] Renamed `CLAUDE` → `CLAUDE.md` so project instructions load
- [x] Renamed `PRD` → `Cash_Out_PRD.md` so it renders and the links resolve
- [x] Database schema, with row-level security tested against cross-user reads,
      writes and deletes, and constraints tested against bad data
- [x] Email-code sign-in built end to end
- [x] Installable PWA shell — manifest, icons, iOS home-screen support
- [x] Pay-period and shift-duration math, unit tested
- [x] **Workplace setup** — add, edit and delete a workplace, with wage, pay
      period, overtime terms and the optional tracked fields
- [x] Home screen listing your workplaces, with a first-run empty state
