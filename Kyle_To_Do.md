# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** September 25, 2026 — **service charge, daily overtime,
take-home estimate and CSV export are built and in a pull request.** Once it
merges, there are settings only you can fill in. Steps below.

---

# Do these next

## 1. Merge the pull request

The migration runs on its own when it lands on `main` (the migrate workflow).
Nothing to paste into the SQL editor.

## 2. Fill in each workplace's new settings (about 2 minutes)

Home page → Workplaces → **Edit** on each. Three new things on the form, all
read off your stubs:

| Setting | Lumen Field | Climate Pledge Arena |
|---|---|---|
| This job pays overtime | ✅ on, 1.5, **after 8 hours** | ✅ on, 1.5, **after 8 hours** |
| Filing status | Single | Single |
| Two-jobs box ticked on this W-4 | **✅ yes** | ❌ no |
| Union dues per month | **$33** | blank |

How I know: Lumen's federal withholding only reproduces with the two-jobs box
ticked (it withheld $99.87 on $1,181.58), and Climate Pledge's only
reproduces with it unticked ($0 on $240.51, $26.35 on $568.95). The $33 dues
came off your Sep 11 Lumen check and not your Sep 25 one, so it's once a
month, first check of the month.

Until you save these, take-home is estimated as if both jobs were a plain
single W-4 with no dues — so Lumen will read a little high until step 2 is
done.

## 3. Check one existing shift over 8 hours

Any shift you'd already logged at a job with overtime switched *on* now gets
overtime after 8 hours automatically (the migration fills the threshold in).
A shift saved while that job's overtime was *off* stays without it — editing a
shift deliberately never rewrites the pay terms it was saved with, so a raise
can't reach backwards. If a long shift is showing no overtime after step 2,
tell me and I'll write a one-off migration for those rows rather than have
you delete and re-log them.

---

# Still blocking: Google sign-in setup

Unchanged from Sep 23. Code side is done — a "Continue with Google" button sits
above the email form. Two dashboard tasks only you can do, roughly 10 minutes:

**1. Create a Google OAuth client** (Google Cloud Console):
- https://console.cloud.google.com/apis/credentials — create a project if you
  don't have one.
- **OAuth consent screen**: External, app name "Cash Out", your email. Leave
  it in **Testing** mode and add your own Google account under "Test users".
- **Credentials** → Create Credentials → OAuth client ID → **Web application**.
- Under **Authorized redirect URIs**, paste the callback URL Supabase shows
  under Authentication → Providers → Google (looks like
  `https://<your-project-ref>.supabase.co/auth/v1/callback`).
- Save, copy the **Client ID** and **Client Secret**.

**2. Enable Google in Supabase**: Authentication → Providers → Google → on,
paste both values, save. No env vars, no redeploy.

---

# Your domain question

Answered Sep 22: **keep this app on Vercel, point a subdomain of your GoDaddy
domain at it via DNS.** Only if you decide to do it:

- [ ] Add a DNS record at GoDaddy (Vercel → project → Settings → Domains shows
      the exact value)
- [ ] Add the domain in Vercel → this project → Settings → Domains

---

# 🏁 Where this stands

| MVP feature | State |
|---|---|
| 1. Multi-user auth | ✅ Built |
| 2. Workplace setup | ✅ Built |
| 3. Conversational shift logging | ✅ Built and confirmed working live |
| 4. Shift history | ✅ Built |
| 5. Pay-period summary | ✅ Built, now with overtime, service charge and take-home |

**What changed on Sep 25**, from your five requests and four stubs:

- **Service charge** is a box on every shift, at every job. It's added to the
  check as wages, not as a tip, and taxed that way.
- **Every shift row shows how it adds up**: `$306.36 pay · 2 hrs OT · $861.29
  tips` under the name, with the shift's total on the right instead of just
  the tips. Opening a shift shows the full arithmetic, line by line.
- **The paycheck card** shows gross, then "about $X after tax" under it, with
  a tap-to-open breakdown: hours at your rate, overtime, service charge, card
  tips, gross, then each deduction and estimated take-home.
- **Daily overtime**: 1.5× after 8 hours in one shift, at both jobs. The rate
  and hours are rounded the way the stubs round them, so 2 hours of overtime at
  $27.85 is $83.56, matching the stub, not $83.55.
- **Cash tips** are still tracked and still count toward what a shift earned,
  but they're not in the paycheck figure — neither employer puts them on the
  check, so a figure that included them could never match a stub. The card
  says "plus $X in cash tips you already took home."
- **CSV export**: a link under Recent shifts downloads every shift ever logged,
  one row each, with the per-shift arithmetic and the pay period and pay date
  it falls in. Opens in Google Sheets, Numbers or Excel.

**How the take-home estimate works.** Every line on your four stubs is
reproduced: federal withholding to the cent on all four (IRS percentage
method, 2026 tables, using the W-4 settings above), Social Security 6.2%,
Medicare 1.45%, WA paid leave 0.8066%, WA Cares 0.58%, each within a cent.
The tax tables are keyed by year — when 2027 checks start, the card will say
"no tax tables for 2027 yet" until I add them, rather than quietly using 2026's.

**Where a stub can still differ**, by a few dollars at most: Lumen's
meal/break premium and holiday rate, Climate Pledge's guaranteed-hours top-up,
the two sub-dollar Washington fund lines, and the last cent of each flat-rate
tax (employers round those on year-to-date pay). None of those are things the
app can know from a shift.

**What's left is the part nobody can shortcut:** logging shifts, holding the
card against the next two stubs, and telling me anything that's off.

---

# 📋 Later — not blocking

**2027 tax tables** — needed in January. Federal brackets, the standard
deduction and the WA paid-leave rate all change; I'll transcribe them and check
against your first 2027 stub. Send that stub when it arrives.

**Friends** — self-serve signup, or do you provision accounts?
*My lean: self-serve.*

**Repo visibility** — public right now. Fine for the code (no keys in it), but
worth a deliberate choice before you invite anyone.

**Parser cost and accuracy** — Claude Opus 5 at medium effort, a deliberate
trade. **If it starts misreading you, raising that setting is the first thing
to try** — before rewriting any prompt.

**A local copy of the code** — not needed; GitHub holds the durable copy.

```bash
git clone https://github.com/kyhuber/Cash-Out.git
cd Cash-Out
npm install
cp .env.example .env.local    # SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ANTHROPIC_API_KEY
npm run dev
```

---

## ✅ Already decided

Kept so we don't relitigate them. Say the word if you want any reopened.

| Decision | Choice | When |
|---|---|---|
| Sign-in method | Emailed numeric code, length from Supabase's setting (6-10), never hardcoded. Never a magic link | Aug 29 |
| Google sign-in | Added alongside the code, not instead of it — the code stays as the no-Google-account fallback | Sep 23 |
| Shifts store the wage they were worked at | Yes — a raise won't rewrite history. Overtime terms are stored the same way | Aug 29, Sep 25 |
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
| Workplace rows | Demoted to a quiet row with an explicit Edit link, rather than a card that opens a form | Sep 7 |
| Per-workplace views | Handled by filtering the shift list, not a separate workplace detail page | Sep 7 |
| Scope | Log shift data, keep it available to look at, calculate what a paycheck should look like. No analytics, trends, projections or comparisons — and nothing built speculatively for later | Sep 7 |
| Headline of the app | The next paycheck per job, above the logger. Not the period containing today — those differ for several days each cycle | Sep 7 |
| Pay date rule | The first Friday strictly after a period ends. No holiday or weekend shifting for now | Sep 7 |
| Open vs closed periods | An open period's figure is labelled "so far" and never extrapolated to what the finished period might total | Sep 7 |
| Database password | Rotated after a fragment leaked into a public Actions log; migrations now connect via env vars instead of a URL so this class of leak can't recur | Sep 7 |
| Keeping the free database awake | The migration workflow also runs Mon/Thu on a schedule — a real query twice a week, comfortably inside Supabase's 7-day pause window | Sep 22 |
| Backend platform, after the pause scare | Staying on Supabase rather than paying for Pro or moving to Firebase | Sep 22 |
| Paycheck headline number | What lands on the check: regular hours × wage + daily overtime + service charge + card tips. Gross leads, take-home under it | Sep 25 |
| Cash tips | Still tracked and counted in what a shift earned, but not in the paycheck figure — they're not on either employer's check | Sep 25 |
| Service charge | A box on every shift at every job. Pay from the employer, taxed as wages, never a tip | Sep 25 |
| Overtime | Daily: 1.5× after 8 hours in one shift, at both jobs. Weekly 40-hour overtime not modelled. Threshold stored per workplace and snapshotted on each shift | Sep 25 |
| Take-home estimate | Real calculation, not a calibrated rate: IRS percentage method from the W-4 settings stored per workplace, plus the fixed WA and FICA rates. Tables keyed by year; a missing year says so rather than borrowing | Sep 25 |
| Rounding | Mirrors the stubs: hours to hundredths and the overtime rate to cents before multiplying | Sep 25 |
| Google Sheets as the database | No — no per-user access control, no constraints, and it was the high-friction tool this app replaced. Instead, a one-tap CSV export of every shift, which opens in Sheets | Sep 25 |
| Reporting | The CSV export *is* the reporting. No in-app charts or summaries beyond the paycheck card | Sep 25 |

---

## ✅ Already done

- **Live and working:** Supabase project, Vercel deployment, environment
  variables, custom SMTP through Gmail, both email templates emitting a code,
  Anthropic API key with credit on the account. Both workplaces set up with
  real wage and pay-period details; migrations applied.
- **Auth:** email-code sign-in, confirmed working.
- **Data:** schema with row-level security, tested against cross-user reads,
  writes and deletes, plus constraints tested against bad input.
- **Workplace setup:** add, edit and delete, with wage, three-date pay period
  (cadence derived, not asked), daily overtime terms, W-4 settings, union dues
  and optional tracked fields.
- **Shift logging:** freeform text → Claude → editable confirmation card → saved
  shift. Anything unsaid stays an empty box; the raw sentence is kept for
  tuning; the card shows hours so a misread am/pm is visible. Service charge is
  a field on the card.
- **Bar / lounge per shift**, with spellings snapped to what's already recorded.
- **Shift history:** recent shifts newest-first, filterable by employer, each
  showing how its pay adds up and tappable to edit or delete. Editing never
  rewrites the wage or overtime terms a shift was worked at.
- **Next paycheck**, leading the home page: gross and estimated take-home, the
  Friday it lands, and a line-by-line breakdown, for each job, with the period
  marked closed or still open.
- **Tax math** built from four real stubs and tested against their figures.
- **CSV export** of every shift.
- **Migrations:** all idempotent, applied by CI, and the test suite applies every
  one twice to prove a re-run is a no-op.
- **PWA shell:** manifest, icons, iOS home-screen support.
- **Math:** pay-period bucketing, cadence derivation, shift duration and shift
  pay, unit tested and matched against the database's own constraints.
