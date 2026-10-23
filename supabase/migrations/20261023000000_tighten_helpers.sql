-- =============================================================================
-- Tighten helper functions (from Supabase's security advisor, Oct 23, 2026)
--
-- participant_age and has_consent are only used inside the database (by the
-- logged roster function and by triggers, which run as the owner), so signed-in
-- users no longer need to call them directly.
--
-- team_of_participant and team_of_project are used by access rules, so they
-- stay callable, but now only answer for teams the caller is allowed to see.
-- For anyone else they return null, which the access rules treat as "no".
-- =============================================================================

revoke execute on function public.participant_age(uuid, date) from authenticated;
revoke execute on function public.has_consent(uuid, public.consent_kind) from authenticated;

create or replace function public.team_of_participant(p uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select team_id from public.participants where id = p and public.sees_team(team_id);
$$;

create or replace function public.team_of_project(p uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select team_id from public.projects where id = p and public.sees_team(team_id);
$$;
