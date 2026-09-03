# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** September 3, 2026 — all five MVP features are now either built
or next; shift logging is live but has never made a real parse call. Three
things below, in order. **Start at step 1: the site won't work until the
migrations are applied.**

---

# 1️⃣ Get the migrations applied

**Two files need to reach your database.** Until they do, adding or editing a
workplace fails. Pick either route.

## Option A — set it up once, never paste SQL again *(recommended)*

**a. Get the connection string**

It is **not** under Settings. Open your project and click the **Connect** button
at the **top of the page**. That opens a panel with three connection strings.

- [ ] Take the **Session pooler** one — the host contains `pooler`:

      postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-1-us-west-1.pooler.supabase.com:5432/postgres

- [ ] Replace `[YOUR-PASSWORD]` with your database password

⚠️ **Session pooler, not Direct connection.** Direct needs IPv6 (or a paid IPv4
add-on) and GitHub's runners are IPv4-only — the direct string doesn't error, it
hangs until it times out. The session pooler is IPv4 on every plan, free
included.

⚠️ **Not the Transaction pooler** (port `6543`) either — no prepared statements.
*The workflow now checks which one you gave it and says so, rather than failing
in a way you'd have to guess at.*

*Password lost? **Settings → Database → Database password → Reset**. Resetting
doesn't affect the app — it connects with the publishable key, not this one.*

**b. Add it to GitHub**

GitHub → your repo → **Settings → Secrets and variables → Actions** → **New
repository secret**:

| Name | Value |
|---|---|
| `SUPABASE_DB_URL` | the connection string from above |

- [ ] Added

**c. Run it**

GitHub → **Actions** tab → **Migrate database** → **Run workflow**.

- [ ] Ran it, and it went green

From here on, a migration applies itself when I push it. Nothing for you to do.

⚠️ This gives GitHub Actions write access to your live database. Fine for a
personal project, and only workflows in your own repo can read the secret — but
it's a real key.

## Option B — paste them by hand

Supabase → **SQL Editor** → **New query** → paste and **Run**, in order:

- [ ] [`0003_pay_period_dates.sql`](https://github.com/kyhuber/Cash-Out/blob/main/supabase/migrations/0003_pay_period_dates.sql)
- [ ] [`0004_shift_station.sql`](https://github.com/kyhuber/Cash-Out/blob/main/supabase/migrations/0004_shift_station.sql)

✅ **Re-running one is safe now.** Every migration is written so a second run
does nothing instead of failing partway. The `column "pay_period_end_date"
already exists` error you hit was the old version — it broke nothing.

---

# 2️⃣ Update your two workplaces

Once the migrations are in, open each workplace and:

- [ ] **Fill in the two new date fields** — last day of the pay period, and the
      date you got paid for it. You only have a start date stored; the form
      guesses the end from the schedule, but only your stub knows the pay date.
- [ ] **Tick "Bar or lounge"** under *What does this job report?* — for both
      venues. It's off by default, so nothing asks for a bar until you turn it
      on.

While you're there, check the line that says *"That's every two weeks — 26
paychecks a year"* matches reality. If it doesn't, one of the dates is wrong.

---

# 3️⃣ Log one real shift, and tell me what happened

**This is the highest-value thing you can do, and it replaces the homework I
asked you for.**

Every shift you log stores the exact sentence you typed. So you don't need to
sit down and invent examples — just use the app after your next shift and tell
me anything it got wrong.

- [ ] Log a shift the way you'd actually describe it
- [ ] If anything comes back wrong, paste me **what you typed** and **what the
      card showed**

⚠️ **Nothing has ever gone through the parser.** There's no Anthropic key in my
build environment, so I could not make a single live call. Everything around it
is tested — schema, sanitising, date maths, what the database accepts — but the
first sentence you type is genuinely the first one. **If it errors, paste me the
message.** It's written to say what's wrong in plain language.

Worth deliberately trying across your first several:

- A shift where you **don't know your tips yet**
- One where you **correct yourself** mid-sentence
- One where you **don't say which venue** — it should ask, not guess
- One at **each bar or lounge** you work
- Something **that isn't a shift at all**, to see it decline rather than invent

---

# 🏁 Where this stands

| MVP feature | State |
|---|---|
| 1. Multi-user auth | ✅ Built |
| 2. Workplace setup | ✅ Built |
| 3. Conversational shift logging | ✅ Built — **never run live** |
| 4. Shift history | 🔨 Next |
| 5. Pay-period summary | ⬜ |

**What I build next: shift history** — the list of what you've logged, and the
ability to edit or delete any of it.

Your own example bumped this up the list. *"I expect I earned some tips, maybe
$50"* told me you often don't know your card tips when you walk out. That makes
"log it now, fix the number in two days" a normal workflow rather than an edge
case — and right now there's no way to go back and fix anything.

**Then the pay-period summary**, which is the point of the whole thing: hours,
tips and estimated gross for a period, to hold against a real pay stub.

**What's left from you after that:** logging real shifts for two or three weeks
and telling me every time the parser trips. That's the only way it gets good,
and it's also when you first check a summary against an actual stub.

---

# 📋 Later — not blocking

**Which number leads the pay-period summary** — what the employer owed you
(hours × wage + tips), or what you actually took home (after tip-out)?
*My lean: employer-owed on top, take-home underneath.* I'll ask again when I
build it.

**Friends** — self-serve signup, or do you provision accounts?
*My lean: self-serve.*

**Repo visibility** — public right now. Fine for the code (no keys in it), but
worth a deliberate choice before you invite anyone.

**Shift history filters** — planned as "by workplace" and "by bar." Tell me if
you want more.

**Parser cost and accuracy** — Claude Opus 5 at medium effort, a deliberate
trade: slightly less thoroughness for a faster answer, since you're standing in
a parking lot and the card catches mistakes anyway. Roughly a cent or two per
shift. **If it starts misreading you, raising that setting is the first thing to
try** — before rewriting any prompt.

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
| Pay period onboarding | Three dates off a stub — period start, period end, pay date. Cadence is derived, never asked | Sep 3 |
| "Til close" with no end time | Left blank, not pre-filled. A plausible wrong time is the thing this app exists to prevent | Sep 3 |
| Date with none said | Defaults to today. The one field where a default is safe, because a wrong date is obvious on the card | Sep 3 |
| Workplace when unclear | Card asks. Guessing files tips against the wrong job and the wrong wage | Sep 3 |
| Unsplit tips total | Never split automatically; the card asks, with a one-tap "all card" | Sep 3 |
| Bar / lounge inside a venue | A field on the shift, not a second workplace — the wage is the same, only tips differ. Spelling is snapped to bars already recorded so totals can't split | Sep 3 |
| How you'll phrase things | Full sentences, as if talking to someone taking the details down. Parser handles that and clipped fragments equally | Sep 3 |
| Times with no am/pm | Always PM. A morning start is always written "am", and an "am" end after an afternoon start is past midnight | Sep 3 |
| Parser model | Claude Opus 5, adaptive thinking, medium effort — latency matters more than the last few points of accuracy when a card catches errors | Sep 3 |
| Applying migrations | Every migration is idempotent, and CI applies all of them on every push. No migration-state table to drift or repair | Sep 3 |

---

## ✅ Already done

- **Live and working:** Supabase project, Vercel deployment, environment
  variables, custom SMTP through Gmail, both email templates emitting a code,
  Anthropic API key with credit on the account.
- **Auth:** email-code sign-in, confirmed working.
- **Data:** schema with row-level security, tested against cross-user reads,
  writes and deletes, plus constraints tested against bad input.
- **Workplace setup:** add, edit and delete, with wage, three-date pay period
  (cadence derived, not asked), overtime terms and optional tracked fields.
- **Shift logging:** freeform text → Claude → editable confirmation card → saved
  shift. Anything unsaid stays an empty box; the raw sentence is kept for
  tuning; the card shows hours so a misread am/pm is visible.
- **Bar / lounge per shift**, with spellings snapped to what's already recorded.
- **Migrations:** all idempotent, applied by CI, and the test suite applies every
  one twice to prove a re-run is a no-op.
- **PWA shell:** manifest, icons, iOS home-screen support.
- **Math:** pay-period bucketing, cadence derivation and shift duration, unit
  tested and matched against the database's own constraints.
