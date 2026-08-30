# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** August 30, 2026 — end of day. Start at "Tomorrow morning".

---

# ☀️ Tomorrow morning — start here

**About 15 minutes of clicking, then one message back to me.** Do them in order;
each one confirms the previous worked.

### Step 1 — Fix the two Vercel variables (5 min)

The names changed today. Vercel → **Project → Settings → Environment Variables**:

| Add this | Value |
|---|---|
| `SUPABASE_URL` | `https://orgezkldagwaifmnnbse.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → **API Keys** → anon / publishable |

- [ ] Add both. **Secret is the right type now** — the browser-exposure prompt
      won't appear, because these no longer go to the browser at all.
- [ ] Delete the old `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Redeploy** — Deployments → `⋯` on the latest → **Redeploy**

⚠️ The redeploy is not optional. Vercel applies environment changes at build
time, so the settings page will show your new values while the live site keeps
serving the old ones.

### Step 2 — Sign in (2 min)

- [ ] Open the site, enter your email, tap **Email me a code**

**What should happen:** an email with a **6-digit code**. Type it in, you're in.

**If a link arrives instead**, the email template still needs changing:
Supabase → **Authentication → Emails → Magic Link**, body containing:

      Your Cash Out sign-in code is: <strong>{{ .Token }}</strong>

`{{ .Token }}` is the part that matters. Save, then try signing in again — no
redeploy needed for this one, it's a Supabase setting.

**If you see a red error under the form**, paste it to me. It'll say what's
wrong in plain language now.

### Step 3 — Add your two workplaces (5 min)

Have a recent pay stub from each job open. For **each** you'll enter:

- Base hourly wage
- How often you're paid
- **The first day of a recent pay period** — not the day you got paid
- Whether it pays overtime, and the rate (usually 1.5)
- Which of these the job actually reports to you:
  *total sales · tip-out paid · event type · number of guests · notes*

- [ ] **Lumen Field**
- [ ] **Climate Pledge Arena** (Moët & Chandon Imperial Lounge)

**If saving fails**, the database tables were never created. Supabase →
**SQL Editor** → run `supabase/migrations/0001_initial_schema.sql`, then
`supabase/migrations/0002_conditional_anchor_date.sql`, in that order.

### Step 4 — Put it on your phone (1 min)

- [ ] Open the site **in Safari** on your iPhone → Share → **Add to Home Screen**

Has to be Safari. Chrome can't install a PWA on iOS.

---

# 📨 Then send me one message

This is what unblocks everything else. **Answer these in a single reply and I
can build the rest without stopping to ask.**

### A. How you actually talk about a shift

Write **10–20 examples** of how you'd really describe a shift — the way you'd
say it at 1am, not cleaned up. For example:

> *"Lumen, four til close, 180 on cards and like 40 cash"*
> *"did the lounge last night, 6 to 1, 220 in tips, tipped out 35"*

Include the messy ones — trailing off, correcting yourself, vague times, saying
the venue two different ways. **The parser gets tuned against how you talk, and
I can't guess it.** This is the single highest-value thing you can give me.

### B. Five decisions

1. **Pay period anchor** — the form asks for *"first day of a recent pay
   period"* rather than your pay date, because a pay date falls *after* the
   period it covers. Fine as-is, or would you rather enter the pay date?

2. **"Til close"** — when you don't say an end time, should the app leave it
   blank for you to fill, or pre-fill a default closing time per workplace
   (still editable)? *My lean: leave it blank. The app guessing at a number is
   the thing this app exists to prevent.*

3. **Missing data on the confirmation card** — anything you didn't say shows as
   an empty field, never a guess. Confirm that's what you want.

4. **Which number leads the pay-period summary** — what the employer owed you
   (hours × wage + tips), or what you actually took home (minus tip-out)?
   *My lean: employer-owed first, since checking a pay stub is the point;
   take-home underneath.*

5. **Friends** — self-serve signup, or do you provision accounts?
   *My lean: self-serve. Hand-provisioning becomes a chore fast, and row-level
   security is what keeps everyone's data separate.*

Saying *"go with your leans"* to any of these is a complete answer.

---

# 🏁 Distance to done

Honest version: **tomorrow won't close this out, but it clears the runway.**
The MVP is five features and two are finished.

| MVP feature | State |
|---|---|
| 1. Multi-user auth | ✅ Built |
| 2. Workplace setup | ✅ Built |
| 3. Conversational shift logging | ⬜ Next — the actual product |
| 4. Shift history | ⬜ |
| 5. Pay-period summary | ⬜ |

**What's left from me:** roughly 3–4 build sessions. Shift logging is the big
one (the parser plus the confirmation card); history and the summary are
smaller and mostly mechanical.

**What's left from you:** tomorrow's 15 minutes, the one message above, and then
the part nobody can shortcut — **logging real shifts for 2–3 weeks** and finding
where the parser trips on your actual phrasing. That's also when you hold a
summary against a real pay stub and see whether the numbers line up.

**One thing you'll need before shift logging works:** an Anthropic API key from
[console.anthropic.com](https://console.anthropic.com) → **API Keys**, added to
Vercel as `ANTHROPIC_API_KEY`, then redeploy. No prefix on that one — it's a
real secret, unlike the Supabase values. Cost will be pennies a month; each
shift is one small call. **Not needed until I've built the parser**, so it can
wait.

---

# Later — not blocking

**Phase 4 (shift history):** no decisions expected. Tell me if you want filters
beyond "by workplace."

**Phase 7 (friends):** covered by decision 5 above. Worth revisiting whether the
repo should go private before you invite anyone — it's public right now, which
is fine for the code but worth a deliberate choice.

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
| Working without a local checkout | Yes — Supabase, Vercel and GitHub are browser-only | Aug 29 |
| Supabase config location | Server-only, no `NEXT_PUBLIC_` prefix — nothing about the database connection reaches the browser | Aug 30 |

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
- [x] Supabase project created, Vercel project connected
- [x] **Deployed and live on Vercel** — the site loads
- [x] Plain-language errors for a misconfigured Supabase URL, instead of
      Supabase's own "Invalid path specified in request URL"
- [x] Supabase config made server-only, which also removed Vercel's
      browser-exposure prompt
