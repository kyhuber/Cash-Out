# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** August 31, 2026 — custom SMTP is required before the email
templates can be edited. Start at "Tomorrow morning".

---

# ☀️ Tomorrow morning — start here

**About 25 minutes of clicking, then one message back to me.** Do them in order;
each one confirms the previous worked.

### Step 1 — Fix the two Vercel variables (5 min)

The names changed today. Vercel → **Project → Settings → Environment Variables**:

| Add this | Value |
|---|---|
| `SUPABASE_URL` | `https://orgezkldagwaifmnnbse.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → **API Keys** → the **publishable** key (starts `sb_publishable_`) |

**On the two keys you're seeing:** Supabase replaced the old anon key with the
**publishable** key — same low privileges, same row-level security behaviour,
just a new format. The anon key under *Legacy keys* still works, but it's being
retired, so use the publishable one. I verified the app handles it identically.

⚠️ **Do not use the secret key** (`sb_secret_...`, the one right next to it). It
bypasses row-level security, which would show every user everyone else's shifts.
The app now refuses to start if it finds one there, so a slip fails loudly
rather than quietly leaking data.

- [ ] Add both. **Secret is the right *Vercel type*** — that's Vercel's storage
      setting, unrelated to Supabase's secret key. The browser-exposure prompt
      won't appear, because these no longer go to the browser at all.
- [ ] Delete the old `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Redeploy** — Deployments → `⋯` on the latest → **Redeploy**

⚠️ The redeploy is not optional. Vercel applies environment changes at build
time, so the settings page will show your new values while the live site keeps
serving the old ones.

### Step 2 — Turn on custom SMTP (10 min)

Supabase's built-in email provider won't work for this project, for two
reasons — the second is the one that matters:

1. Since **June 3, 2026**, new free-tier projects on it **can't edit email
   templates**. That's the wall you hit.
2. It sends **2 emails per hour, project-wide, and only to addresses on your
   project's team.** Your friends could never receive a sign-in code from it.

So this isn't a workaround for the template lock — it's a step this project
needed anyway. Custom SMTP is free on every Supabase plan, and **no code
changes are needed**.

**Use Gmail.** You already have the account, and unlike most providers it needs
no domain and no DNS records.

**a. Create a Google app password**

⚠️ **There is no "App passwords" link on the Security page.** Google hides it.
Go straight to the URL:

- [ ] **https://myaccount.google.com/apppasswords**
- [ ] App: **Mail**. Device: **Other** → name it `Supabase`
- [ ] Copy the 16-character password. It's shown once, and it is *not* your
      Gmail password.

**If that page errors or redirects you:** 2-Step Verification isn't on yet, and
app passwords don't exist as a feature until it is. Google Account → **Security
→ 2-Step Verification** → turn it on, then go back to the link.

**If 2-Step Verification is already on and the page still won't open:** you
probably have it set up with *only* a security key or passkey, which keeps app
passwords hidden. Add a second method — phone or an authenticator app — and
they appear.

*("Linked apps" on the Security page is something else entirely — third-party
account access, not SMTP credentials.)*

**If app passwords are genuinely unavailable on your account**, tell me and
we'll switch to [Brevo](https://www.brevo.com) instead: free tier, and it
verifies a single sender address rather than requiring you to own a domain.
Ten more minutes, same five fields in Supabase, no code changes either way.

**b. Enter it in Supabase**

Supabase → **Authentication → Emails → SMTP Settings** → *Enable Custom SMTP*:

| Field | Value |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `kyhuber@gmail.com` |
| Password | the 16-character app password |
| Sender email | `kyhuber@gmail.com` |
| Sender name | `Cash Out` |

- [ ] Save

⚠️ Sender email must match the username. Gmail won't send as an address you
don't own.

Sign-in emails will arrive from your personal Gmail. Fine for you and a few
friends. If you ever want them from a branded address, that's the point to move
to a provider like Resend and verify a domain — not now.

### Step 3 — Edit both email templates (3 min)

With custom SMTP on, the Templates tab unlocks.

Supabase → **Authentication → Emails → Templates**. Two of them:

| Template | When it's sent |
|---|---|
| **Confirm signup** | Your **first ever** sign-in, when the account is created |
| **Magic Link** | Every sign-in after that |

In **both**, replace the `{{ .ConfirmationURL }}` link with:

      Your Cash Out sign-in code is: <strong>{{ .Token }}</strong>

- [ ] Confirm signup edited
- [ ] Magic Link edited

`{{ .Token }}` is the part that matters. Editing only Magic Link leaves your
first sign-in broken, because creating the account uses the other template.

### Step 4 — Sign in (2 min)

- [ ] Open the site, enter your email, tap **Email me a code**
- [ ] A **6-digit code** should arrive. Type it in.

No redeploy needed for any of steps 2–4 — these are all Supabase settings.

**If you see a red error under the form**, paste it to me; it'll say what's
wrong in plain language.

### Step 5 — Add your two workplaces (5 min)

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

### Step 6 — Put it on your phone (1 min)

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

**A local copy of the code:** not needed, and not a gap in your backups —
GitHub holds the durable copy. Worth doing only if you want to run the dev
server, use Claude Code on your own machine, or read the code in an editor:

```bash
git clone https://github.com/kyhuber/Cash-Out.git
cd Cash-Out
npm install
cp .env.example .env.local    # fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm run dev
```

Needs Git and Node 22. Note that pointing `.env.local` at your existing
Supabase project means local testing writes to the same database the live app
uses — a second free Supabase project keeps test data out of the real one.

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
| Which Supabase key | The publishable key (`sb_publishable_...`), not the legacy anon key and never the secret key | Aug 31 |
| Email delivery | Custom SMTP via Gmail app password. Supabase's built-in provider can't edit templates on new free projects, and only emails your own team — friends could never sign in | Aug 31 |

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
