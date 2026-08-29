-- Cross-user isolation tests. Run after 00_local_harness.sql and the migration.
-- Any failure raises, so `psql -v ON_ERROR_STOP=1` exits non-zero.
grant usage on schema public to authenticated;
grant select, insert, update, delete on workplaces, shifts to authenticated;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'kai@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'sam@example.com');

insert into workplaces (id, user_id, name, hourly_wage, pay_period_type, pay_period_anchor_date, optional_fields)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Lumen Field', 20.76, 'biweekly', '2026-08-14', array['total_sales','tip_out','shift_type']),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   'Sam''s Bar', 18.00, 'weekly', '2026-08-21', array['notes']);

-- Overnight duration: a shift that wraps past midnight is still one shift.
insert into shifts (user_id, workplace_id, shift_date, clock_in, clock_out, hourly_wage_at_time) values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','2026-08-20','17:00','22:00',20.76),
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','2026-08-21','20:00','02:00',20.76),
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','2026-08-22','16:00','00:30',20.76),
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-0000-0000-0000-000000000001','2026-08-23','20:00','00:00',20.76);

do $$
declare r record; expected int;
begin
  for r in select clock_in, clock_out, minutes_worked from shifts order by shift_date loop
    expected := case
      when r.clock_in = '17:00' then 300
      when r.clock_in = '20:00' and r.clock_out = '02:00' then 360
      when r.clock_in = '16:00' then 510
      when r.clock_in = '20:00' and r.clock_out = '00:00' then 240
    end;
    if r.minutes_worked is distinct from expected then
      raise exception 'FAIL %-%: got % want %', r.clock_in, r.clock_out, r.minutes_worked, expected;
    end if;
    raise notice 'PASS %-% = % min', r.clock_in, r.clock_out, r.minutes_worked;
  end loop;
end $$;

do $$
declare n int; blocked boolean;
begin
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
  set local role authenticated;

  select count(*) into n from workplaces;
  if n <> 1 then raise exception 'FAIL: Kai sees % workplaces, want 1', n; end if;
  raise notice 'PASS Kai sees only his own workplace';

  select count(*) into n from shifts;
  if n <> 4 then raise exception 'FAIL: Kai sees % shifts, want 4', n; end if;
  raise notice 'PASS Kai sees only his own shifts';

  blocked := false;
  begin
    insert into shifts (user_id, workplace_id, shift_date, clock_in, clock_out, hourly_wage_at_time)
    values ('11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-000000000002',
            '2026-08-24','10:00','14:00',20.76);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: filed a shift against another user''s workplace'; end if;
  raise notice 'PASS blocked from filing against another user''s workplace';

  blocked := false;
  begin
    insert into shifts (user_id, workplace_id, shift_date, clock_in, clock_out, hourly_wage_at_time)
    values ('22222222-2222-2222-2222-222222222222','bbbbbbbb-0000-0000-0000-000000000002',
            '2026-08-24','10:00','14:00',18.00);
  exception when insufficient_privilege then blocked := true;
  end;
  if not blocked then raise exception 'FAIL: inserted a row owned by another user'; end if;
  raise notice 'PASS blocked from inserting rows owned by another user';

  update workplaces set hourly_wage = 999 where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: updated % of another user''s workplaces', n; end if;
  raise notice 'PASS cannot update another user''s workplace';

  delete from shifts where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: deleted % of another user''s shifts', n; end if;
  raise notice 'PASS cannot delete another user''s shifts';

  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
  select count(*) into n from shifts;
  if n <> 0 then raise exception 'FAIL: Sam sees % of Kai''s shifts', n; end if;
  raise notice 'PASS Sam sees none of Kai''s shifts';

  reset role;
end $$;

do $$
declare n int;
begin
  set local role authenticated;
  select count(*) into n from workplaces;
  if n <> 0 then raise exception 'FAIL: anonymous sees % workplaces', n; end if;
  select count(*) into n from shifts;
  if n <> 0 then raise exception 'FAIL: anonymous sees % shifts', n; end if;
  raise notice 'PASS anonymous sees nothing';
  reset role;
end $$;
