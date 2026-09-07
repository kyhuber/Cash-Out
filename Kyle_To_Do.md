# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** September 7, 2026 — **all five MVP features are now built.**
The home page leads with logging, then your recent shifts, with workplaces
demoted to a settings row. **Start at step 1 — it begins with rotating your
database password, because a fragment of it leaked into a public Actions log.**

---

# 1️⃣ Rotate your database password, then apply the migrations

## 🔴 First: rotate the password

The migration workflow failed three times, and the third failure printed a
**fragment of your database password into the Actions log**:

    psql: error: invalid integer value "Qs8!vEA" for connection option "port"

Your password contains characters that aren't URI-safe, so Postgres misread the
connection string and named part of your password in the error. **Your repo is
public, so that log is public.** GitHub masked the secret itself, but not this
fragment, because it isn't the exact stored value.

- [ ] Supabase → **Settings → Database → Database password → Reset database
      password**. Copy the new one.

This costs you nothing: the app connects with the publishable key, not this
password. Nothing breaks when you rotate it.

*The old logs can also be deleted — say the word and I'll do it — but rotating
is what actually matters. Once the password is changed, the fragment is worth
nothing.*

**You don't need to pick a "safe" password.** The workflow no longer puts the
password inside a URL at all, so any characters are fine now.

## Then: apply the migrations

**Two files need to reach your database.** Until they do, adding or editing a
workplace fails. Pick either route.

### Option A — set it up once, never paste SQL again *(recommended)*

**a. Get the connection string**

It is **not** under Settings. Open your project and click the **Connect** button
at the **top of the page**. That opens a panel with three connection strings.

- [ ] Take the **Session pooler** one — the host contains `pooler`:

      postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-1-us-west-1.pooler.supabase.com:5432/postgres

- [ ] Replace `[YOUR-PASSWORD]` with your **new** password, exactly as shown —
      no quotes, no escaping

⚠️ **Session pooler, not Direct connection.** Direct needs IPv6 (or a paid IPv4
add-on) and GitHub's runners are IPv4-only — the direct string doesn't error, it
hangs until it times out. The session pooler is IPv4 on every plan, free
included.

⚠️ **Not the Transaction pooler** (port `6543`) either — no prepared statements.
*The workflow checks which one you gave it and says so.*

**b. Add it to GitHub**

GitHub → your repo → **Settings → Secrets and variables → Actions**. If
`SUPABASE_DB_URL` is already there, **update** it:

| Name | Value |
|---|---|
| `SUPABASE_DB_URL` | the connection string from above |

- [ ] Added or updated

**c. Run it**

GitHub → **Actions** tab → **Migrate database** → **Run workflow**.

- [ ] Ran it, and it went green

It now tests the connection first, so if something is still wrong it says which
part — host, user, or password — instead of failing on a migration file.

From here on, a migration applies itself when I push it. Nothing for you to do.

⚠️ This gives GitHub Actions write access to your live database. Fine for a
personal project, and only workflows in your own repo can read the secret — but
it's a real key.

### Option B — paste them by hand

Supabase → **SQL Editor** → **New query** → paste and **Run**, in order:

- [ ] [`0003_pay_period_dates.sql`](https://github.com/kyhuber/Cash-Out/blob/main/supabase/migrations/0003_pay_period_dates.sql)
- [ ] [`0004_shift_station.sql`](https://github.com/kyhuber/Cash-Out/blob/main/supabase/migrations/0004_shift_station.sql)

✅ **Re-running one is safe.** Every migration is written so a second run does
nothing instead of failing partway.

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
| 4. Shift history | ✅ Built |
| 5. Pay-period summary | ✅ Built |

**The home page is now ordered the way you use it:** the text box, then your
recent shifts, then workplaces. Workplaces used to be big tappable cards that
opened a settings form — a lot of visual weight promising content and
delivering a form you'll touch twice a year. They're now a quiet row with a
live summary and an explicit **Edit** link.

**Recent shifts** lists what you've logged newest-first, with a chip to filter
by employer. Tap any shift to correct it or delete it. That closes the gap your
own example opened: *"I expect I earned some tips, maybe $50"* — you can log a
guess now and fix the number when the card tips post.

**Each workplace shows its current pay period**: dates, hours, tips, and
estimated gross at `hours × wage + tips`. That's the number to hold against a
pay stub. Tip-out is tracked separately so it never inflates what the employer
owes you.

*Tax withholding is deliberately not in that number, and neither is overtime.
Both are a later phase — a half-built version of either produces a figure that
looks authoritative and isn't, which is the one thing this app can't do.*

**What's left is the part nobody can shortcut:** logging real shifts for two or
three weeks, telling me every time the parser trips, and holding a summary
against an actual stub.

---

# 📋 Later — not blocking

**Friends** — self-serve signup, or do you provision accounts?
*My lean: self-serve.*

**Repo visibility** — public right now. Fine for the code (no keys in it), but
worth a deliberate choice before you invite anyone.

**Tax withholding** — your stated later phase. It turns the estimated-gross
figure into a take-home-after-tax one, which needs filing status, allowances and
state rules. Real scope, worth doing properly, and not started.

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
| Home page order | Logger, then recent shifts, then workplaces. Configuration goes last | Sep 7 |
| Workplace rows | Demoted to a quiet row with a live period summary and an explicit Edit link, rather than a card that opens a form | Sep 7 |
| Per-workplace views | Handled by filtering the shift list, not a separate workplace detail page | Sep 7 |
| Summary headline number | What the employer owes: hours × wage + tips. Tip-out subtracted only for take-home | Sep 7 |
| Tax withholding and overtime | Excluded from the estimate on purpose. A partial version looks authoritative and isn't. Later phase | Sep 7 |
| Scope | Log shift data, keep it available to look at, calculate what a paycheck should look like. No analytics, trends, projections or comparisons — and nothing built speculatively for later | Sep 7 |

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
- **Shift history:** recent shifts newest-first, filterable by employer, each
  tappable to edit or delete. Editing never rewrites the wage a shift was
  worked at.
- **Pay-period summary** per workplace: period dates, hours, tips and estimated
  gross at `hours × wage + tips`, computed from the browser's date so it can't
  land in the wrong period.
- **Migrations:** all idempotent, applied by CI, and the test suite applies every
  one twice to prove a re-run is a no-op.
- **PWA shell:** manifest, icons, iOS home-screen support.
- **Math:** pay-period bucketing, cadence derivation and shift duration, unit
  tested and matched against the database's own constraints.
