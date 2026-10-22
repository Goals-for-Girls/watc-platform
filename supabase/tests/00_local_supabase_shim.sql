-- Local test shim: recreates the parts of Supabase the migrations rely on
-- (roles, auth.users, auth.uid(), default grants), so the access rules can
-- be tested on plain PostgreSQL. Do NOT run this against a Supabase project.

-- Roles are cluster-wide, so they may exist from an earlier run.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create table auth.users (id uuid primary key, email text unique);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Supabase grants table access to these roles by default and relies on
-- row-level security to restrict it. Mirror that.
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
