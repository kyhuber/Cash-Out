-- Schema constraint tests. These document what the database refuses to store,
-- independent of anything the app validates.
do $$
declare rejected boolean;
begin
  insert into auth.users (id, email)
  values ('33333333-3333-3333-3333-333333333333', 'constraints@example.com');

  -- --- pay_period_anchor_date is required for offset-based periods ---
  rejected := false;
  begin
    insert into workplaces (user_id, name, hourly_wage, pay_period_type)
    values ('33333333-3333-3333-3333-333333333333', 'No anchor weekly', 20, 'weekly');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: weekly workplace accepted without an anchor date'; end if;
  raise notice 'PASS weekly requires an anchor date';

  rejected := false;
  begin
    insert into workplaces (user_id, name, hourly_wage, pay_period_type)
    values ('33333333-3333-3333-3333-333333333333', 'No anchor biweekly', 20, 'biweekly');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: biweekly workplace accepted without an anchor date'; end if;
  raise notice 'PASS biweekly requires an anchor date';

  -- --- ...but calendar-based periods do not need one ---
  insert into workplaces (user_id, name, hourly_wage, pay_period_type)
  values ('33333333-3333-3333-3333-333333333333', 'Monthly job', 20, 'monthly');
  raise notice 'PASS monthly accepted with no anchor date';

  insert into workplaces (user_id, name, hourly_wage, pay_period_type)
  values ('33333333-3333-3333-3333-333333333333', 'Semi-monthly job', 20, 'semi_monthly');
  raise notice 'PASS semi_monthly accepted with no anchor date';

  -- --- overtime multiplier required when overtime is enabled ---
  rejected := false;
  begin
    insert into workplaces (user_id, name, hourly_wage, pay_period_type, overtime_enabled)
    values ('33333333-3333-3333-3333-333333333333', 'OT no multiplier', 20, 'monthly', true);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: overtime enabled without a multiplier'; end if;
  raise notice 'PASS overtime requires a multiplier';

  -- --- optional_fields limited to the known keys ---
  rejected := false;
  begin
    insert into workplaces (user_id, name, hourly_wage, pay_period_type, optional_fields)
    values ('33333333-3333-3333-3333-333333333333', 'Bad field', 20, 'monthly', array['not_a_real_field']);
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: unknown optional field key accepted'; end if;
  raise notice 'PASS unknown optional field keys rejected';

  -- --- a shift must have a duration ---
  rejected := false;
  begin
    insert into shifts (user_id, workplace_id, shift_date, clock_in, clock_out, hourly_wage_at_time)
    select '33333333-3333-3333-3333-333333333333', id, '2026-08-24', '12:00', '12:00', 20
    from workplaces where name = 'Monthly job';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: zero-length shift accepted'; end if;
  raise notice 'PASS zero-length shift rejected';

  -- --- negative money is rejected ---
  rejected := false;
  begin
    insert into shifts (user_id, workplace_id, shift_date, clock_in, clock_out, hourly_wage_at_time, tips_cash)
    select '33333333-3333-3333-3333-333333333333', id, '2026-08-24', '12:00', '18:00', 20, -5
    from workplaces where name = 'Monthly job';
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: negative tips accepted'; end if;
  raise notice 'PASS negative tips rejected';

  -- --- a pay period has to end after it starts (migration 0003) ---
  rejected := false;
  begin
    insert into workplaces (user_id, name, hourly_wage, pay_period_type,
                            pay_period_anchor_date, pay_period_end_date)
    values ('33333333-3333-3333-3333-333333333333', 'Backwards period', 20,
            'biweekly', '2026-08-16', '2026-08-03');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: period ending before it starts accepted'; end if;
  raise notice 'PASS pay period must end after it starts';

  -- --- a pay date cannot fall before the period it pays for (migration 0003) ---
  -- This is the misreading the three-date onboarding form exists to catch:
  -- typing the pay date where a period date belongs.
  rejected := false;
  begin
    insert into workplaces (user_id, name, hourly_wage, pay_period_type,
                            pay_period_anchor_date, pay_period_end_date, pay_date)
    values ('33333333-3333-3333-3333-333333333333', 'Paid before it began', 20,
            'biweekly', '2026-08-03', '2026-08-16', '2026-07-30');
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: pay date before the period start accepted'; end if;
  raise notice 'PASS pay date cannot precede the pay period';

  -- --- the ordinary case still stores ---
  insert into workplaces (user_id, name, hourly_wage, pay_period_type,
                          pay_period_anchor_date, pay_period_end_date, pay_date)
  values ('33333333-3333-3333-3333-333333333333', 'Three dates off a stub', 20,
          'biweekly', '2026-08-03', '2026-08-16', '2026-08-21');
  raise notice 'PASS a period with all three dates is accepted';

  -- --- and rows predating 0003 still store, since both columns are nullable ---
  insert into workplaces (user_id, name, hourly_wage, pay_period_type,
                          pay_period_anchor_date)
  values ('33333333-3333-3333-3333-333333333333', 'Pre-0003 row', 20,
          'biweekly', '2026-08-03');
  raise notice 'PASS a workplace with no end or pay date is still accepted';
end $$;
