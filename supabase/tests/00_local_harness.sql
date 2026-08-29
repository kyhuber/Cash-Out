-- Local-only stand-in for the pieces Supabase provides, so 0001_initial_schema.sql
-- can be run unmodified against a plain Postgres for testing. Never applied to
-- a real Supabase project — there, auth.users and auth.uid() already exist.
create schema if not exists auth;

create table if not exists auth.users (id uuid primary key, email text);

-- Mirrors Supabase's real implementation, including the empty-string handling:
-- the setting is null-checked BEFORE the jsonb cast, so an absent JWT yields
-- NULL rather than a parse error.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
