# Kyle — To Do

Everything the project needs **from you**: actions only you can take (accounts,
keys, pay stubs) and decisions only you can make.

Claude maintains this file. It gets rewritten whenever an action is completed or
a decision is made, so the top section is always what's actually blocking.

**Last updated:** September 23, 2026 — **added Google sign-in, blocked on your
Google Cloud setup.** The code is built and pushed; nothing works until you
create the OAuth client and paste its keys into Supabase. Steps below.

---

# Blocking: Google sign-in setup

Code side is done — a "Continue with Google" button now sits above the email
form on the sign-in page, alongside the existing numeric-code flow (which
still works exactly as before; this is additive, not a replacement).

Two things only you can do, both dashboard clicks, roughly 10 minutes total:

**1. Create a Google OAuth client** (Google Cloud Console):
- Go to https://console.cloud.google.com/apis/credentials, create a project
  if you don't already have one for this.
- **OAuth consent screen** tab: set it to **External**, fill in an app name
  ("Cash Out" is fine) and your email. Leave it in **Testing** mode — since
  this is just for you, it never needs Google's verification review. Under
  "Test users," add your own Google account email.
- **Credentials** tab → Create Credentials → OAuth client ID → Application
  type **Web application**.
- Under **Authorized redirect URIs**, add your Supabase callback URL. It's
  shown on the Supabase side in the next step (Authentication → Providers →
  Google — it auto-fills a URL like
  `https://<your-project-ref>.supabase.co/auth/v1/callback`). Paste that
  exact URL in here.
- Save. Google shows you a **Client ID** and **Client Secret** — copy both.

**2. Enable Google in Supabase** (your Supabase project dashboard):
- Authentication → Providers → find **Google** in the list, toggle it on.
- Paste in the Client ID and Client Secret from step 1.
- Save.

That's it — no environment variables to touch, no redeploy needed. Once
saved, reload the sign-in page and tap "Continue with Google" to test it. If
Google shows an error about a redirect URI mismatch, it means the URL pasted
into Google's "Authorized redirect URIs" doesn't exactly match what Supabase
shows — copy it again rather than retyping it.

---

# One thing I'm still waiting on you for

A couple of messages back I asked what you wanted for a tax estimate on the
paycheck card (gross + net, using the effective rate off a real stub) and laid
out three questions: whether your employer's reported gross includes cash
tips, which stub to calibrate from, and which number should lead. That's still
open — no rush, just flagging it so it doesn't get lost under the Supabase
detour.

---

# Your domain question

Answered in chat just now: **keep this app on Vercel, point a subdomain of your
GoDaddy domain at it via DNS.** No hosting move, no rebuild — my full reasoning
and the concrete steps are in my reply. Only real "to-do" if you decide to do
it:

- [ ] Add a DNS record at GoDaddy (Vercel's project → Settings → Domains screen
      tells you the exact value once you start adding the domain there)
- [ ] Add the domain in Vercel → this project → Settings → Domains

Both are dashboard actions only you can do — I have no Vercel or GoDaddy
access from here. Say the word if you want to go ahead and I'll write out the
exact click-by-click steps.

---

# 🏁 Where this stands

| MVP feature | State |
|---|---|
| 1. Multi-user auth | ✅ Built |
| 2. Workplace setup | ✅ Built |
| 3. Conversational shift logging | ✅ Built and confirmed working live |
| 4. Shift history | ✅ Built |
| 5. Pay-period summary | ✅ Built |

**Next paycheck now leads the page** — one card per job, soonest first, showing
what that check will be and the Friday it lands.

This fixed a real error, not just the layout. The page used to show *the pay
period containing today*, which is not the same thing as your next check. A
period is paid the Friday after it ends, so in the stretch between a period
closing and its payday, the money arriving next belongs to the period that
already finished — while "the current period" has barely started. For several
days each cycle you were being shown the wrong period's money.

Each card says whether the period is **closed** (the figure is final) or
**still open** (it says "so far", and can only go up). Nothing is extrapolated:
shifts you haven't worked yet are never guessed at.

It also cross-checks the pay date on your stub against the Friday rule. If they
disagree, the card says so — either the rule doesn't hold for that job or a
date was mistyped, and both are worth knowing.

**Below that:** the logger, then recent shifts (filterable by employer, tap any
to correct or delete it), then workplaces as a quiet settings row.

Workplaces no longer carry their own money figure. They used to show "this
period", which would now sit on the same screen as a *different* number for the
same job — the one being paid next. Two totals for one job is worse than one.

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
| Sign-in method | Emailed numeric code, length from Supabase's setting (6-10), never hardcoded. Never a magic link | Aug 29 |
| Google sign-in | Added alongside the code, not instead of it — the code stays as the no-Google-account fallback | Sep 23 |
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
| Headline of the app | The next paycheck per job, above the logger. Not the period containing today — those differ for several days each cycle | Sep 7 |
| Pay date rule | The first Friday strictly after a period ends. No holiday or weekend shifting for now | Sep 7 |
| Open vs closed periods | An open period's figure is labelled "so far" and never extrapolated to what the finished period might total | Sep 7 |
| Database password | Rotated after a fragment leaked into a public Actions log; migrations now connect via env vars instead of a URL so this class of leak can't recur | Sep 7 |
| Keeping the free database awake | The migration workflow now also runs Mon/Thu on a schedule — a real query twice a week, comfortably inside Supabase's 7-day pause window | Sep 22 |
| Backend platform, after the pause scare | Staying on Supabase rather than paying for Pro or moving to Firebase. The keep-alive fix is free and small; Firebase is free too but would mean rebuilding the data model, RLS and auth from scratch | Sep 22 |

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
- **Next paycheck**, leading the home page: the amount and the Friday it lands,
  for each job, with the period marked closed or still open.
- **Migrations:** all idempotent, applied by CI, and the test suite applies every
  one twice to prove a re-run is a no-op.
- **PWA shell:** manifest, icons, iOS home-screen support.
- **Math:** pay-period bucketing, cadence derivation and shift duration, unit
  tested and matched against the database's own constraints.
