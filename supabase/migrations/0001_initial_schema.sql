-- Cash Out — initial schema
--
-- Users are Supabase's built-in `auth.users`; there is no separate users table.
-- It already carries id / email / provider / created_at, so duplicating it would
-- only create a second thing to keep in sync.
--
-- Safe to run more than once. Migrations here are applied by hand in the
-- Supabase SQL editor, which tracks nothing, so re-running one is a matter of
-- when, not if — every statement below is guarded accordingly.

do $$ begin
  create type pay_period_type as enum ('weekly', 'biweekly', 'semi_monthly', 'monthly');
exception when duplicate_object then null;
end $$;

create table if not exists workplaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  name text not null check (length(trim(name)) > 0),
  hourly_wage numeric(10, 2) not null check (hourly_wage >= 0),

  overtime_enabled boolean not null default false,
  overtime_multiplier numeric(4, 2) check (overtime_multiplier >= 1),

  pay_period_type pay_period_type not null,
  pay_period_anchor_date date not null,

  -- Section 6.2 starter list. Growing it is a migration, which is the point:
  -- a fixed short list beats a custom field-builder for v1.
  optional_fields text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint overtime_multiplier_required_when_enabled
    check (not overtime_enabled or overtime_multiplier is not null),
  constraint optional_fields_known
    check (optional_fields <@ array['total_sales', 'tip_out', 'shift_type', 'guest_count', 'notes']::text[])
);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workplace_id uuid not null references workplaces (id) on delete cascade,

  -- A shift belongs to the date it STARTED. An overnight concert shift running
  -- 20:00 -> 02:00 is one shift on the earlier date, not two.
  shift_date date not null,
  clock_in time not null,
  clock_out time not null,

  tips_cash numeric(10, 2) not null default 0 check (tips_cash >= 0),
  tips_card numeric(10, 2) not null default 0 check (tips_card >= 0),
  -- Tracked so the summary can show both what the employer owed and what was
  -- actually taken home after tipping out.
  tip_out numeric(10, 2) not null default 0 check (tip_out >= 0),

  -- Wage is snapshotted at save time. A later raise must never silently rewrite
  -- what a past shift was worth — the whole app depends on the record holding still.
  hourly_wage_at_time numeric(10, 2) not null check (hourly_wage_at_time >= 0),
  overtime_multiplier_at_time numeric(4, 2),

  optional_field_values jsonb not null default '{}'::jsonb,
  -- Kept so a bad parse can be replayed and the prompt improved.
  raw_input_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Wraps past midnight when clock_out is earlier than clock_in.
  minutes_worked integer generated always as (
    (extract(epoch from (clock_out - clock_in)) / 60)::int
      + case when clock_out < clock_in then 1440 else 0 end
  ) stored,

  constraint shift_has_duration check (clock_in <> clock_out)
);

create index if not exists workplaces_user_idx on workplaces (user_id);
create index if not exists shifts_user_date_idx on shifts (user_id, shift_date desc);
create index if not exists shifts_workplace_date_idx on shifts (workplace_id, shift_date desc);

-- updated_at maintenance
create or replace function set_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists workplaces_set_updated_at on workplaces;
create trigger workplaces_set_updated_at before update on workplaces
  for each row execute function set_updated_at();
drop trigger if exists shifts_set_updated_at on shifts;
create trigger shifts_set_updated_at before update on shifts
  for each row execute function set_updated_at();

-- Row-level security: every user sees only their own rows.
alter table workplaces enable row level security;
alter table shifts enable row level security;

drop policy if exists workplaces_select on workplaces;
create policy workplaces_select on workplaces for select
  using (auth.uid() = user_id);
drop policy if exists workplaces_insert on workplaces;
create policy workplaces_insert on workplaces for insert
  with check (auth.uid() = user_id);
drop policy if exists workplaces_update on workplaces;
create policy workplaces_update on workplaces for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists workplaces_delete on workplaces;
create policy workplaces_delete on workplaces for delete
  using (auth.uid() = user_id);

drop policy if exists shifts_select on shifts;
create policy shifts_select on shifts for select
  using (auth.uid() = user_id);
-- The workplace check matters: owning the row is not enough, you must also own
-- the workplace it points at, or a shift could be filed against someone else's job.
drop policy if exists shifts_insert on shifts;
create policy shifts_insert on shifts for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from workplaces w where w.id = workplace_id and w.user_id = auth.uid())
  );
drop policy if exists shifts_update on shifts;
create policy shifts_update on shifts for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from workplaces w where w.id = workplace_id and w.user_id = auth.uid())
  );
drop policy if exists shifts_delete on shifts;
create policy shifts_delete on shifts for delete
  using (auth.uid() = user_id);
