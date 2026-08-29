# Cash Out
## Product Requirements Document — v1 (MVP)

**Owner:** Kai
**Status:** Draft — ready for Claude Code build
**Last updated:** August 28, 2026

---

## 1. Problem

Kai works two part-time service jobs (bartending at Lumen Field, serving in the Moët Chandon Imperial Lounge at Climate Pledge Arena) and doesn't reliably track hours or tips. A coworker recently discovered — only because they were diligent about checking their pay stub — that an employer had failed to pay out tips from a shift. The error was caught and corrected, but it exposed a real risk: without your own record, you have no way to know if your paycheck is right.

The current workaround is a Google Sheet with manual formulas. It works, but it's high-friction on a phone, especially right after a shift when you're tired and just want to go home.

## 2. Goals

- Make logging a shift take seconds, not minutes — ideally just talking or typing a sentence.
- Give the user (Kai, then friends) enough of a running total to sanity-check a paycheck against actual work.
- Build something friends can use too, without becoming a second job to maintain.

## 3. Non-Goals (for now)

- **Not a business.** No monetization in v1.
- **Not a native iOS app.** Ship as a mobile-first PWA. App Store distribution is a possible *later* step, not a blocker — a working PWA can be wrapped for the App Store without a rewrite if it's ever worth doing.
- **Not a full paycheck reconciliation engine.** Automatically comparing "what I logged" against "what my paycheck actually paid," with discrepancy flags, is valuable — but it's a second feature loop with real complexity. MVP builds the data foundation for it; it doesn't build the comparison itself.
- **Not a general budgeting/expense app.** Scope stays tight to shifts, hours, and tips.

## 4. Target Users

Kai and a handful of friends — hourly service workers (servers, bartenders) who typically work at one or two workplaces, are paid a base hourly wage plus tips, and don't currently track either in a reliable way.

## 5. MVP Scope

| # | Feature | Why it's MVP |
|---|---|---|
| 1 | Multi-user auth (lightweight) | Sharing with friends is a stated goal, not a maybe — cheaper to build in now than retrofit later |
| 2 | Workplace setup (name, hourly wage, pay period info, optional tracked fields) | Needed before a single shift can be logged meaningfully |
| 3 | Conversational shift logging + editable confirmation | This *is* the product — the low-friction capture is the whole point |
| 4 | Shift history (view / edit / delete) | Mistakes happen; without this, one bad transcription corrupts the record |
| 5 | Pay-period summary (hours, tips, estimated gross) | Delivers the "sanity-check my paycheck" value without needing a full reconciliation engine |

That's the bar for "worth using instead of the Google Sheet." Everything else goes to the backlog in Section 9.

## 6. Feature Details

### 6.1 Auth & Accounts
- Google sign-in recommended (fast to build, no password management); magic-link email as a fallback if friends don't want to use Google. **Open question — confirm before build.**
- Each user's data is private to them (row-level isolation). No cross-user visibility in v1.

### 6.2 Workplace Setup (onboarding)
When a user adds a workplace, they enter:
- Workplace name (e.g., "Lumen Field," "Climate Pledge Arena")
- Base hourly wage
- Overtime terms — a simple flag ("this job pays overtime: yes/no") plus a rate/multiplier field if yes (e.g., 1.5x after 40 hrs/week). **The app captures this in v1; it does not calculate weekly overtime automatically yet** — see Section 9.
- Pay period type (weekly / biweekly / semi-monthly / monthly) and one anchor pay date, entered by looking at a recent pay stub. This lets the app bucket future shifts into the correct pay period automatically.
- Optional tracked fields for this workplace — a short toggle list the user picks from during setup, since not every job provides the same data (e.g., one of Kai's jobs reports total sales; the other doesn't). Starter list to build against:
  - Total sales
  - Tip-out amount paid
  - Event/shift type (e.g., concert, game, private event)
  - Number of guests/covers
  - Free-text notes

  This list can grow, but a fixed short list beats a fully custom field-builder for v1 — the latter is real engineering scope for a passion project.

### 6.3 Conversational Shift Logging
- One text field per entry. The user types or dictates freely (native iOS keyboard dictation, or a personal tool like Wispr Flow — both are OS-level, so this works the same regardless of Safari vs. Chrome).
- The freeform text is sent to an LLM call on the backend, which parses it into: workplace, date, clock-in time, clock-out time, tips (cash/card if mentioned), plus any optional fields that workplace has enabled.
- **Always show an editable confirmation card before saving.** Non-negotiable — the entire point of this app is catching numbers that are wrong, so it can't silently trust its own mishearing of a number either.

### 6.4 Shift History
- Chronological list of logged shifts, filterable by workplace.
- Tap into any entry to edit or delete it.

### 6.5 Pay-Period Summary
- For each workplace and pay period: total hours worked, total tips (cash + card), and an estimated gross pay figure (hours × wage, tips added — overtime multiplier applied if flagged, using the simple flat-rate assumption, not full weekly-threshold logic).
- This is what the user holds up against their actual pay stub. In v1, *they* do the comparison — the app doesn't do it for them yet.

## 7. Data Model (rough)

```
User
  id, email, auth_provider, created_at

Workplace
  id, user_id, name, hourly_wage, overtime_enabled, overtime_multiplier,
  pay_period_type, pay_period_anchor_date, optional_fields (array of enabled field keys)

Shift
  id, user_id, workplace_id, date, clock_in, clock_out,
  tips_cash, tips_card, optional_field_values (json), raw_input_text, created_at
```

## 8. Technical Architecture

- **Frontend:** Mobile-first PWA. Install via Safari's Add to Home Screen for the full standalone-app feel; Chrome works fine for day-to-day browsing but isn't where you'd install it.
- **Backend:** Small API layer — needed because the Anthropic API key can't live in the browser, and per-user data privacy needs to be enforced server-side.
- **Database/Auth:** Postgres with row-level security (Supabase is a natural fit) — handles both data isolation and auth in one system.
- **Hosting:** Vercel or similar free-tier-friendly host.
- **Voice input:** Native keyboard dictation via a plain text field — *not* the in-browser Web Speech API, which has unreliable support in Safari on iOS.

## 9. Backlog / Roadmap (Post-MVP)

Roughly in order of likely value, not a committed sequence:

1. **Automated paycheck reconciliation** — user enters what a paycheck actually paid; app compares it to the expected total for that period and flags a discrepancy. This is the fullest expression of the original motivation and probably the highest-value v2 feature.
2. **Real overtime calculation** — proper weekly-threshold aggregation across shifts, rather than the flat flag captured in v1.
3. **Dashboard & analytics** — trends over time, best-performing shifts/days, tips by workplace.
4. **Export for taxes** — CSV/PDF export of logged tips. Worth building with the federal "No Tax on Tips" deduction in mind (up to $25,000 in qualified cash tips is deductible starting this tax year) — this app is naturally positioned to help someone substantiate that deduction against what their employer reports on their W-2.
5. **Pay-day reminders / notifications.**
6. **Tip-out / pooled-tip splitting calculator**, if friends who work pooled-tip rooms want it.
7. **Photo capture of a pay stub** to auto-fill wage and pay-period settings during onboarding, instead of manual entry.
8. **App Store distribution**, if usage among friends validates going wider — wrap the existing PWA rather than rebuild native.

## 10. Open Questions

- Google sign-in vs. magic-link email — which for v1?
- Exact starter list of optional fields — is the Section 6.2 list right, or should it be adjusted before build?
- Overtime multiplier — flat rate captured per workplace, or does any of Kai's or friends' work have daily (not just weekly) OT rules that should be a field too?
- Should friends' accounts be fully self-serve (they sign up themselves), or does Kai want to provision them?
