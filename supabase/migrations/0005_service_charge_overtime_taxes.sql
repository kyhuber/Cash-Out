-- Service charges, daily overtime, and what a paycheck estimate needs to get
-- from gross to take-home.
--
-- All of it was read off four real pay stubs (two per employer, Sep 2026):
--
--   * A service charge is paid on the check and taxed as ordinary wages, not
--     as a tip. It can appear at any job, so it is a plain column like tips.
--   * Daily overtime: hours past 8 in one shift are paid at 1.5x. The
--     multiplier was already captured; the threshold was not, and both are
--     snapshotted onto the shift for the same reason the wage is — a later
--     change of terms must not rewrite what a past shift was worth.
--   * Federal withholding follows the W-4 on file with each employer, which
--     differs per job (one has the two-jobs box ticked, the other does not),
--     so the W-4 settings live on the workplace.
--   * Union dues are a flat monthly amount taken from one check a month.
--
-- Safe to run more than once.

-- --- shifts ------------------------------------------------------------------

alter table shifts
  add column if not exists service_charge numeric(10, 2) not null default 0,
  -- Hours in one shift after which overtime applies, as it stood when the
  -- shift was saved. Null when the workplace did not pay overtime then.
  add column if not exists overtime_threshold_at_time numeric(4, 2);

alter table shifts drop constraint if exists service_charge_not_negative;
alter table shifts add constraint service_charge_not_negative
  check (service_charge >= 0);

alter table shifts drop constraint if exists overtime_threshold_positive;
alter table shifts add constraint overtime_threshold_positive
  check (overtime_threshold_at_time is null or overtime_threshold_at_time > 0);

-- Shifts saved before this migration at a job that paid overtime carry the
-- multiplier but no threshold. Daily overtime after 8 hours is the rule at
-- both of the jobs this was built against, so that is what they get. Guarded
-- on null so a re-run changes nothing.
update shifts
  set overtime_threshold_at_time = 8
  where overtime_multiplier_at_time is not null
    and overtime_threshold_at_time is null;

-- --- workplaces --------------------------------------------------------------

alter table workplaces
  add column if not exists overtime_daily_threshold_hours numeric(4, 2) not null default 8,
  -- W-4 step 1(c). Withholding differs by filing status.
  add column if not exists w4_filing_status text not null default 'single',
  -- W-4 step 2(c), the "two jobs" box. Halves the standard deduction and the
  -- brackets the employer withholds against.
  add column if not exists w4_two_jobs boolean not null default false,
  -- Flat post-tax amount taken once a month, from the first check of the month.
  add column if not exists union_dues_monthly numeric(10, 2) not null default 0;

alter table workplaces drop constraint if exists overtime_daily_threshold_positive;
alter table workplaces add constraint overtime_daily_threshold_positive
  check (overtime_daily_threshold_hours > 0);

-- These MUST match FILING_STATUSES in src/lib/paycheck-taxes.ts; workplace.test.ts
-- asserts it.
alter table workplaces drop constraint if exists w4_filing_status_known;
alter table workplaces add constraint w4_filing_status_known
  check (w4_filing_status in ('single', 'married_jointly', 'head_of_household'));

alter table workplaces drop constraint if exists union_dues_not_negative;
alter table workplaces add constraint union_dues_not_negative
  check (union_dues_monthly >= 0);
