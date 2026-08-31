# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** August 31, 2026 — API key added, shift logging built, pay
period onboarding changed to three dates. **One database step is required
before the site will work again.** Start at "Do this first".

---

# 🚨 Do this first — the site is broken until you do

**Two minutes.** I changed the workplaces table, and the deploy that's going out
now expects those columns. Until you run this, adding or editing a workplace
will fail.

Supabase → **SQL Editor** → **New query** → paste the whole contents of
`supabase/migrations/0003_pay_period_dates.sql`
([open it on GitHub](https://github.com/kyhuber/Cash-Out/blob/main/supabase/migrations/0003_pay_period_dates.sql))
→ **Run**.

- [ ] Ran it. It should say "Success. No rows returned."

**No redeploy needed** — this is a database change, not an environment one.

*Why: the table now stores the pay period's end date and the pay date, which it
had nowhere to put before. Both columns are nullable, so your two existing
workplaces are untouched and still work.*

### Then, once that's run

- [ ] Open each of your two workplaces and **fill in the two new date fields**
      (last day of the pay period, and the date you got paid for it), then save.

Your existing entries only carry a start date. The form guesses the end date
from the schedule already stored, but it can't know your pay date — only your
stub has that. Saving once with all three fills the gaps and re-checks the
dates against each other.

---

# 🎤 Tomorrow: how you actually talk about a shift

**This is now the only thing standing between you and a working app.**
Everything else is built.

**a. Write 10–20 examples.** How you'd really describe a shift at 1am, tired,
one-handed. Not cleaned up.

> *"Lumen, four til close, 180 on cards and like 40 cash"*
> *"did the lounge last night, 6 to 1, 220 in tips, tipped out 35"*

**Deliberately include the messy ones** — trailing off, correcting yourself
mid-sentence, vague times, forgetting to say where you were, saying a number two
different ways. Those decide whether this is usable or annoying. Clean examples
teach me nothing I don't already know.

**b. What you call each place out loud.** Every name you'd realistically use —
*"Lumen," "the field," "the lounge," "CPA," "Climate Pledge," "Moët"* — and
which workplace each one means. Right now the parser only knows the two names
exactly as you typed them into the form.

**c. Roughly when a normal shift runs at each.** Just typical start and end.
This is what lets *"til close"* resolve to something instead of nothing.

Send those and I'll tune the parser against them. Until then it's running on my
best guess at how a bartender talks, which is exactly the thing I told you I
can't guess.

---

# ✅ What I built today

### Shift logging — the actual product

The home screen now leads with a text box. Type or dictate a sentence, it comes
back as a filled-in card, **nothing saves until you press save.**

- Parses workplace, date, clock in/out, cash and card tips, tip-out, and
  whichever extra fields that job tracks.
- **Anything you didn't say comes back as an empty box, never a guess.**
- Your raw sentence is stored with the shift, so when the parser gets something
  wrong I can see exactly what you said and fix it.

**I went with my leans on your three decisions.** All easy to flip — say the
word:

| Decision | What I built |
|---|---|
| "Til close" with no end time | Left blank for you to fill |
| No date said | Defaults to today, shown on the card |
| Workplace unclear | Asks you to pick — never guesses between your two jobs |

One thing I added that wasn't on the list: if you give a tips total **without
saying how it split** (*"220 in tips"*), it won't split it for you. The card
says so and offers a one-tap "it was all card". Both of your own example
sentences had this, so it's going to come up constantly.

### Your pay-period idea — built, and taken one step further

You were right, and the reason is stronger than you put it. I dropped the
**"how often are you paid?"** dropdown entirely and now derive it from your two
period dates.

That dropdown was the worst question on the form. *Biweekly* and *twice a month*
sound identical and are 26 versus 24 paychecks a year — it's one of the most
commonly confused things in payroll, and getting it wrong would have silently
mis-grouped every shift you ever logged. Two dates off a stub can't be confused.

So the form now asks exactly what you said:

- First day of that pay period
- Last day of that pay period
- The date you got paid for it

…then tells you what it worked out: *"That's every two weeks — 26 paychecks a
year."* If that line is wrong, one of your dates is.

**Two safety nets came free with it:**

1. A pay date **before** the period started is now rejected outright, in both
   the form and the database. That's the exact misreading we flagged last time,
   and it can no longer be saved at all.
2. There is one genuinely ambiguous case — Feb 16–29 in a leap year is both a
   14-day period *and* the back half of a month. Rather than guess, the form
   asks. You'll never see it; a friend on a semi-monthly schedule in 2028 might.

---

# 🏁 Where this stands

| MVP feature | State |
|---|---|
| 1. Multi-user auth | ✅ Built |
| 2. Workplace setup | ✅ Built |
| 3. Conversational shift logging | ✅ **Built** — untested against real speech |
| 4. Shift history | ⬜ Next |
| 5. Pay-period summary | ⬜ |

**Honest caveat on #3:** I have no Anthropic key in my environment, so I could
not make a single live parse call. Everything around it is tested — the schema,
the sanitising, the date maths, what the database will and won't accept — but
**the first real sentence you type is the first one that has ever gone through
it.** If it errors, paste me the message; it'll say what's wrong in plain
language.

**What's left from me:** shift history (list, edit, delete), then the
pay-period summary. Both smaller than what went in today.

**What's left from you:** the examples above, and then the part nobody can
shortcut — logging real shifts for two or three weeks and telling me every time
the parser gets something wrong. That's also when you first hold a summary up
against a real pay stub, which is the whole reason this exists.

---

# 📋 Later — not blocking

**Which number leads the pay-period summary** (phase 5) — what the employer owed
you (hours × wage + tips), or what you actually took home (after tip-out)?
*My lean: employer-owed on top, take-home underneath.* I'll ask again when I
build it.

**Friends** (phase 7) — self-serve signup, or do you provision accounts?
*My lean: self-serve.*

**Repo visibility** — public right now. Fine for the code (no keys in it), but
worth a deliberate choice before you invite anyone.

**Shift history filters** — planned as "by workplace." Tell me if you want more.

**Parser cost** — it runs on Claude Opus 5 at medium effort, which is a
deliberate trade: a bit less thoroughness for a faster answer, since you're
standing in a parking lot and the confirmation card catches mistakes anyway.
Roughly a cent or two per shift. If it starts misreading you, raising that
setting is the first thing to try, before rewriting anything.

**A local copy of the code** — not needed; GitHub holds the durable copy. Only
worth it to run the dev server or read the code in an editor:

```bash
git clone https://github.com/kyhuber/Cash-Out.git
cd Cash-Out
npm install
cp .env.example .env.local    # SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ANTHROPIC_API_KEY
npm run dev
```

Needs Git and Node 22. Pointing `.env.local` at your live Supabase project means
local testing writes to the same database the real app uses — a second free
project keeps test data out of the real one.

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
| Deleting a workplace | Deletes its shifts too, behind a confirm step | Aug 29 |
| Working without a local checkout | Yes — Supabase, Vercel and GitHub are browser-only | Aug 29 |
| Supabase config location | Server-only, no `NEXT_PUBLIC_` prefix | Aug 30 |
| Which Supabase key | The publishable key (`sb_publishable_...`), never the secret key | Aug 31 |
| Email delivery | Custom SMTP via Gmail app password | Aug 31 |
| Pay period onboarding | Three dates off a stub — period start, period end, pay date. Cadence is derived, never asked | Aug 31 |
| "Til close" with no end time | Left blank, not pre-filled. A plausible wrong time is the thing this app exists to prevent | Aug 31 |
| Date with none said | Defaults to today. The one field where a default is safe, because a wrong date is obvious on the card | Aug 31 |
| Workplace when unclear | Card asks. Guessing files tips against the wrong job and the wrong wage | Aug 31 |
| Unsplit tips total | Never split automatically; the card asks, with a one-tap "all card" | Aug 31 |
| Parser model | Claude Opus 5, adaptive thinking, medium effort — latency matters more than the last few points of accuracy when a card catches errors | Aug 31 |

---

## ✅ Already done

- **Live and working:** Supabase project, Vercel deployment, environment
  variables, custom SMTP through Gmail, both email templates emitting a code,
  Anthropic API key with credit on the account.
- **Auth:** email-code sign-in, confirmed working.
- **Data:** schema with row-level security, tested against cross-user reads,
  writes and deletes, plus constraints tested against bad input.
- **Workplace setup:** add, edit and delete, with wage, three-date pay period,
  overtime terms and optional tracked fields. Two workplaces saved.
- **Shift logging:** freeform text → Claude → editable confirmation card → saved
  shift, with the raw sentence kept for tuning.
- **PWA shell:** manifest, icons, iOS home-screen support.
- **Math:** pay-period bucketing, cadence derivation and shift duration, unit
  tested and matched against the database's own constraints.
