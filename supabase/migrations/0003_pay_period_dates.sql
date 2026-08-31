-- Onboarding now reads three dates straight off a pay stub — the first day of a
-- pay period, the last day, and the date that period was paid — instead of
-- asking the user to name their pay cadence and then pick a single anchor date.
--
-- The cadence is derived from the first two (see payPeriodTypesMatching in
-- src/lib/pay-period.ts), which removes the question people most often get
-- wrong: "biweekly" and "twice a month" are 26 and 24 paychecks a year, and are
-- routinely confused. Two dates off a stub can't be confused.
--
-- pay_period_type and pay_period_anchor_date keep their existing meaning, so
-- every existing row and all the bucketing math are untouched.

alter table workplaces
  -- Redundant with anchor + type for the math, but stored anyway: it is what
  -- the user actually read off their stub, and re-deriving it for the edit form
  -- would show them a period they never typed.
  add column pay_period_end_date date,
  -- Not derivable from anything. The gap between a period ending and being paid
  -- is the employer's own lag, and it is what the backlog's paycheck
  -- reconciliation and pay-day reminders will both need.
  add column pay_date date;

-- Nullable because rows created before this migration have neither. New rows
-- always carry both — the form requires them.

alter table workplaces add constraint pay_period_end_after_start
  check (
    pay_period_end_date is null
    or pay_period_anchor_date is null
    or pay_period_end_date > pay_period_anchor_date
  );

-- Guards the misreading this change exists to prevent: putting the pay date
-- where a period date belongs. A period is always paid on or after it starts.
alter table workplaces add constraint pay_date_not_before_period
  check (
    pay_date is null
    or pay_period_anchor_date is null
    or pay_date >= pay_period_anchor_date
  );
