# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** August 31, 2026 — you're signed in and both workplaces are
set up. Everything from the setup checklist is done and has been cleared out.
Next up is **shift logging**, the actual product. Start at "Do these next".

---

# 🎯 Do these next

**Two things, about 20 minutes.** Together they unblock the whole core of the
app — the part where you talk at your phone and it files a shift.

### 1. Get an Anthropic API key (5 min)

This is what reads *"Lumen, four til close, 180 on cards"* and turns it into
numbers. Nothing about shift logging works without it.

**a. Create the key**

- [ ] [console.anthropic.com](https://console.anthropic.com) → **API Keys** →
      **Create Key**. Name it `Cash Out`.
- [ ] Copy it (starts `sk-ant-`). Like the Google app password, it's shown once.

**b. Put $5 of credit on the account**

- [ ] Console → **Billing** → add credit. **$5 is the minimum.**

⚠️ **Do this even though it feels premature.** A brand-new key with a $0 balance
doesn't fail at sign-up — it fails on the *first shift you try to log*, with a
"credit balance is too low" error that looks like a bug in the app. Cheaper to
rule out now.

Cost is genuinely trivial: roughly a cent or two per shift. At the rate you'd
actually log, $5 covers something like a year.

**c. Add it to Vercel**

Vercel → **Project → Settings → Environment Variables**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | the `sk-ant-...` key |

- [ ] Add it. **Secret** is the right Vercel type. No `NEXT_PUBLIC_` prefix —
      unlike the Supabase values, this one is a real secret and must never reach
      a browser.
- [ ] **Redeploy** — Deployments → `⋯` on the latest → **Redeploy**

⚠️ Same trap as last time: Vercel applies environment changes at build time, so
the settings page will show the key while the live site doesn't have it.

*Nothing in the app uses this key yet — I haven't built the parser. Adding it
now just means I'm not waiting on you when I do.*

---

### 2. Send me how you actually talk about a shift (15 min)

**This is the single highest-value thing you can give me, and nothing
substitutes for it.** The parser gets tuned against your real phrasing, and I
can't invent it — if I guess, I'll build something that works on sentences you'd
never say.

**a. Write 10–20 examples.** How you'd really describe a shift at 1am, tired,
one-handed. Not cleaned up.

> *"Lumen, four til close, 180 on cards and like 40 cash"*
> *"did the lounge last night, 6 to 1, 220 in tips, tipped out 35"*

**Deliberately include the messy ones** — trailing off, correcting yourself
mid-sentence, vague times, forgetting to say where you were, saying a number two
different ways. Those are the cases that decide whether this app is usable or
annoying. Clean examples teach me nothing I don't already know.

**b. Tell me what you call each place out loud.** Now that both workplaces
exist, the parser has to match what you say against what's actually in the
database. So: every name you'd realistically use for each — *"Lumen," "the
field," "Lumen Field," "the lounge," "CPA," "Climate Pledge," "Moët"* — and
which workplace each one means.

**c. Roughly when does a normal shift run at each?** Just typical start and end.
This is what lets *"til close"* and *"the usual"* resolve to something sane
instead of nothing.

---

### 3. Three decisions (2 min)

These shape how the confirmation card behaves. **"Go with your leans" is a
complete answer to all three.**

The principle underneath all of them: **anything you didn't say shows up as an
empty field, never a guess.** The entire reason this app exists is catching
numbers that are wrong — so it can't quietly invent one either. Say the word if
you disagree with that; everything else follows from it.

1. **"Til close"** — when you don't say an end time, leave it blank for you to
   fill, or pre-fill a default closing time for that workplace (still editable)?
   *My lean: blank.* A pre-filled time is the app guessing at a number, and a
   wrong-but-plausible 2:00am is worse than an obvious empty box — you'd never
   catch it.

2. **The date, when you don't say one** — default to today, or leave it blank?
   *My lean: today.* This is the one field where I'd break the no-guessing rule:
   you'll almost always log right after the shift, the date sits in plain sight
   on the card, and a wrong date is obvious in a way a wrong dollar figure isn't.
   Tell me if you'd rather it stayed strict.

3. **Which workplace, when you don't say** — you have two, so the card can just
   ask you to pick, with neither pre-selected. *My lean: ask.* Guessing "probably
   Lumen, that's where he usually is" files tips against the wrong job and the
   wrong wage, and you'd have no reason to look twice.

---

# 🔎 One thing worth double-checking

**Your two anchor dates.** The workplace form asked for *"the first day of a
recent pay period"* — **not** the day you got paid. Those are different dates,
usually a week or two apart.

If a pay date went in by mistake, nothing breaks and nothing looks wrong — every
pay-period summary is just silently shifted, and you'd only find out by holding
one against a stub and wondering why it didn't match. Two-minute check, worth
doing before there's any data in there:

- [ ] Open each workplace and look at the date it shows
- [ ] On your stub, find the **pay period** range (something like
      *"08/04/2026 – 08/17/2026"*). The date in the app should be the **start**
      of that range — not the *pay date* or *check date* printed near it.

Off? Just edit the workplace. Nothing else has to change.

*(For a job paid monthly or twice a month there's no date to check — those
periods follow the calendar, so the form doesn't ask.)*

---

# 📱 Small, if you haven't yet

- [ ] Open the site **in Safari** on your iPhone → Share → **Add to Home Screen**

Has to be Safari; Chrome can't install a PWA on iOS. Worth doing before you
start logging real shifts — the whole point is that it's one tap away when
you're walking to your car, not a browser tab you have to go find.

---

# 🏁 Where this stands

The MVP is five features. **Two are done and working** — you proved both today
by signing in and setting up two jobs.

| MVP feature | State |
|---|---|
| 1. Multi-user auth | ✅ Built — you're signed in |
| 2. Workplace setup | ✅ Built — both jobs in |
| 3. Conversational shift logging | 🔨 **Next** — waiting on the two items above |
| 4. Shift history | ⬜ |
| 5. Pay-period summary | ⬜ |

**What I build next (phase 3), once you've sent the examples:**

- A single text box on the home screen. You type or dictate one sentence.
- A server-side call to Claude that parses it into workplace, date, in/out
  times, cash and card tips, plus whichever optional fields that workplace has
  turned on.
- **An editable confirmation card, always.** Nothing saves until you look at it.
- Your raw sentence gets stored alongside the parsed result, so when the parser
  trips on something I can see exactly what you said and fix it.

**Then:** phase 4 (shift history — list, edit, delete) and phase 5 (pay-period
summary). Both are smaller and mostly mechanical. Call it 3–4 build sessions
total.

**Then the part nobody can shortcut:** logging real shifts for two or three
weeks, and telling me every time the parser gets something wrong. That's also
when you first hold a summary up against an actual pay stub and find out whether
the numbers line up — which is the entire reason this exists.

---

# 📋 Later — not blocking

**Which number leads the pay-period summary** (phase 5) — what the employer owed
you (hours × wage + tips), or what you actually took home (after tip-out)?
*My lean: employer-owed on top, since checking a stub is the point; take-home
underneath.* No rush — I'll ask again when I build it.

**Friends** (phase 7) — self-serve signup, or do you provision accounts?
*My lean: self-serve. Hand-provisioning becomes a chore fast, and row-level
security is what keeps everyone's data separate anyway.*

**Repo visibility** — it's public right now. Fine for the code (no keys are in
it), but worth a deliberate choice before you invite anyone.

**Shift history filters** — planned as "by workplace." Tell me if you want more.

**A local copy of the code** — not needed, and not a gap in your backups; GitHub
holds the durable copy. Only worth it if you want to run the dev server or read
the code in an editor:

```bash
git clone https://github.com/kyhuber/Cash-Out.git
cd Cash-Out
npm install
cp .env.example .env.local    # fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Needs Git and Node 22. Pointing `.env.local` at your existing Supabase project
means local testing writes to the same database the live app uses — a second
free Supabase project keeps test data out of the real one.

---

## ✅ Already decided

Kept so we don't relitigate them. Say the word if you want any reopened.

| Decision | Choice | When |
|---|---|---|
| Sign-in method | Emailed numeric code, not magic link or Google. Length is Supabase's setting (6-10), never hardcoded | Aug 29 |
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

Trimmed to a summary — the step-by-step setup checklists are gone now that
they're finished.

- **Live and working:** Supabase project, Vercel deployment, environment
  variables, custom SMTP through Gmail, both email templates emitting a code.
- **Auth:** email-code sign-in built end to end, and confirmed working — you
  signed in.
- **Data:** schema with row-level security, tested against cross-user reads,
  writes and deletes, plus constraints tested against bad input.
- **Workplace setup:** add, edit and delete, with wage, pay period, overtime
  terms and optional tracked fields. Confirmed working — two workplaces saved.
- **PWA shell:** manifest, icons, iOS home-screen support.
- **Math:** pay-period bucketing and shift duration, unit tested, matching the
  database's own generated column.
