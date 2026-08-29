-- Semi-monthly and monthly pay periods are fixed to the calendar (1st-15th,
-- 16th-EOM, or the whole month), so they have no anchor to measure from. Only
-- weekly and biweekly periods need one.
--
-- Without this, onboarding would have to store a meaningless date for those two
-- types just to satisfy NOT NULL.

alter table workplaces alter column pay_period_anchor_date drop not null;

alter table workplaces add constraint anchor_required_for_offset_periods
  check (
    pay_period_type in ('semi_monthly', 'monthly')
    or pay_period_anchor_date is not null
  );
