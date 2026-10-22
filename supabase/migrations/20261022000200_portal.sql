-- =============================================================================
-- Coach portal additions
-- =============================================================================

-- Member rows the current user holds for a given role.
create or replace function public.my_member_ids(r public.app_role)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.members m
  where m.user_id = auth.uid() and m.role = r and m.active;
$$;

-- Coaches can create teams for themselves, inside their own organization.
create policy teams_coach_insert on public.teams for insert to authenticated
  with check (
    coach_member_id in (select public.my_member_ids('coach'))
    and org_id in (select public.my_org_ids('coach'))
  );
