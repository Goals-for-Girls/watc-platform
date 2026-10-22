-- =============================================================================
-- We Are the Change: rules, gates and access control
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Who is asking? Helpers used by every access rule.
-- SECURITY DEFINER so they can read `members` without recursing through RLS.
-- ---------------------------------------------------------------------------

create or replace function public.has_role(r public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.role = r and m.active
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.active
      and m.role in ('admin', 'safeguarding_lead', 'moderator')
  );
$$;

-- Teams the current user may work with: coaches see their own teams,
-- partner admins see their organization's teams, admins and the
-- safeguarding lead see all.
create or replace function public.manages_team(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    public.has_role('admin') or public.has_role('safeguarding_lead')
    or exists (
      select 1 from public.teams tm
      join public.members m on m.id = tm.coach_member_id
      where tm.id = t and m.user_id = auth.uid() and m.active
    )
    or exists (
      select 1 from public.teams tm
      join public.members m on m.org_id = tm.org_id and m.role = 'partner_admin'
      where tm.id = t and m.user_id = auth.uid() and m.active
    );
$$;

-- Read-only visibility for oversight roles (moderators for context,
-- evaluators for pseudonymous analysis).
create or replace function public.sees_team(t uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.manages_team(t) or public.has_role('moderator') or public.has_role('evaluator');
$$;

-- Organizations where the current user holds a given role.
create or replace function public.my_org_ids(r public.app_role)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.org_id from public.members m
  where m.user_id = auth.uid() and m.role = r and m.active and m.org_id is not null;
$$;

create or replace function public.team_of_participant(p uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select team_id from public.participants where id = p;
$$;

create or replace function public.team_of_project(p uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select team_id from public.projects where id = p;
$$;

-- ---------------------------------------------------------------------------
-- Age and consent
-- ---------------------------------------------------------------------------

create or replace function public.participant_age(p uuid, at date default current_date)
returns int language sql stable security definer set search_path = '' as $$
  select (extract(year from at)::int - birth_year)
         - case when extract(month from at)::int < birth_month then 1 else 0 end
  from public.participants where id = p;
$$;

create or replace function public.has_consent(p uuid, k public.consent_kind)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.consents c
    where c.participant_id = p and c.kind = k and c.withdrawn_at is null
  );
$$;

-- Consent records are append-only: the only allowed change is withdrawal.
create or replace function private.consents_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Consent records cannot be deleted; record a withdrawal instead';
  end if;
  if old.withdrawn_at is not null then
    raise exception 'This consent was already withdrawn';
  end if;
  if (new.participant_id, new.kind, new.given_by, new.method, new.policy_version, new.granted_at)
     is distinct from (old.participant_id, old.kind, old.given_by, old.method, old.policy_version, old.granted_at) then
    raise exception 'Consent records cannot be edited; only withdrawn';
  end if;
  return new;
end $$;

create trigger consents_append_only
  before update or delete on public.consents
  for each row execute function private.consents_append_only();

-- When participation consent is withdrawn, the girl is withdrawn too.
create or replace function private.on_consent_withdrawn()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'participation' and new.withdrawn_at is not null and old.withdrawn_at is null
     and not public.has_consent(new.participant_id, 'participation') then
    update public.participants set status = 'withdrawn', updated_at = now() where id = new.participant_id;
  end if;
  return new;
end $$;

create trigger consents_withdrawal_cascade
  after update on public.consents
  for each row execute function private.on_consent_withdrawn();

-- A girl becomes active only with participation consent. Under-13s are
-- always reached through their coach, never on their own number.
create or replace function private.participant_gates()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  age int := (extract(year from current_date)::int - new.birth_year)
             - case when extract(month from current_date)::int < new.birth_month then 1 else 0 end;
begin
  if tg_op = 'INSERT' and (age < 12 or age > 18) then
    raise exception 'Participants must be 12 to 18 when they join (age %)', age
      using errcode = 'check_violation';
  end if;
  if new.contact_mode = 'own_whatsapp' and age < 13 then
    raise exception 'Girls under 13 are contacted through their coach, not on their own WhatsApp'
      using errcode = 'check_violation';
  end if;
  if new.status = 'active' and (tg_op = 'INSERT' or not public.has_consent(new.id, 'participation')) then
    raise exception 'A participant can only be active with participation consent on record'
      using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger participants_gates
  before insert or update on public.participants
  for each row execute function private.participant_gates();

create or replace function private.identity_gates()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.whatsapp_e164 is not null
     and (select contact_mode from public.participants where id = new.participant_id) <> 'own_whatsapp' then
    raise exception 'Store a girl''s own WhatsApp number only when she is contacted directly (13 and over)'
      using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger identity_gates
  before insert or update on private.participant_identity
  for each row execute function private.identity_gates();

-- No outbound message to a girl without active participation consent.
create or replace function private.outbound_needs_consent()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p uuid;
  ch public.channel;
begin
  select participant_id, channel into p, ch from public.conversations where id = new.conversation_id;
  if new.direction = 'outbound' and ch = 'whatsapp' and p is not null
     and not public.has_consent(p, 'participation') then
    raise exception 'No active participation consent: this girl cannot be messaged'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger messages_outbound_consent
  before insert on public.messages
  for each row execute function private.outbound_needs_consent();

-- A story can be published only with media consent confirmed.
create or replace function private.publish_gate()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.published_at is not null and not new.media_consent_checked then
    raise exception 'Confirm media consent before publishing a story' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger published_stories_gate
  before insert or update on public.published_stories
  for each row execute function private.publish_gate();

-- ---------------------------------------------------------------------------
-- Identity: read and write only through these logged functions
-- ---------------------------------------------------------------------------

create or replace function public.team_roster(t uuid)
returns table (
  participant_id uuid,
  first_name text,
  age int,
  status public.participant_status,
  contact_mode public.contact_mode,
  participation_consent boolean,
  media_consent boolean
)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.manages_team(t) then
    raise exception 'Not allowed to see this team' using errcode = 'insufficient_privilege';
  end if;
  insert into private.access_log (actor, action, detail)
    values (auth.uid(), 'team_roster', jsonb_build_object('team_id', t));
  return query
    select p.id, i.first_name, public.participant_age(p.id), p.status, p.contact_mode,
           public.has_consent(p.id, 'participation'), public.has_consent(p.id, 'media')
    from public.participants p
    left join private.participant_identity i on i.participant_id = p.id
    where p.team_id = t
    order by i.first_name;
end $$;

create or replace function public.set_participant_identity(
  p uuid,
  first_name text,
  whatsapp_e164 text default null,
  guardian_name text default null,
  guardian_relation text default null,
  guardian_phone_e164 text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.manages_team(public.team_of_participant(p)) then
    raise exception 'Not allowed to edit this participant' using errcode = 'insufficient_privilege';
  end if;
  insert into private.participant_identity as pi
    (participant_id, first_name, whatsapp_e164, guardian_name, guardian_relation, guardian_phone_e164)
  values (p, first_name, whatsapp_e164, guardian_name, guardian_relation, guardian_phone_e164)
  on conflict (participant_id) do update set
    first_name = excluded.first_name,
    whatsapp_e164 = excluded.whatsapp_e164,
    guardian_name = excluded.guardian_name,
    guardian_relation = excluded.guardian_relation,
    guardian_phone_e164 = excluded.guardian_phone_e164;
  insert into private.access_log (actor, action, participant_id) values (auth.uid(), 'set_identity', p);
end $$;

-- ---------------------------------------------------------------------------
-- Safeguarding: anyone involved can raise a concern; only the lead reads cases
-- ---------------------------------------------------------------------------

create or replace function public.raise_concern(
  summary text,
  severity public.moderation_level,
  source text,
  p uuid default null,
  msg bigint default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  case_id uuid;
begin
  if not (public.is_staff() or public.has_role('coach') or public.has_role('partner_admin')) then
    raise exception 'Not allowed to raise a concern here' using errcode = 'insufficient_privilege';
  end if;
  insert into private.safeguarding_cases (participant_id, message_id, source, severity, summary, opened_by)
    values (p, msg, source, severity, summary, auth.uid())
    returning id into case_id;
  return case_id;
end $$;

create or replace function public.my_safeguarding_cases()
returns setof private.safeguarding_cases
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role('safeguarding_lead') then
    raise exception 'Only the safeguarding lead can read cases' using errcode = 'insufficient_privilege';
  end if;
  return query select * from private.safeguarding_cases order by status, opened_at desc;
end $$;

-- ---------------------------------------------------------------------------
-- Lock down the private schema
-- ---------------------------------------------------------------------------

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

-- The public (not signed in) can read published stories and nothing else.
-- Row-level security would already return no rows; this removes access entirely.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
grant select on public.published_stories to anon;

-- Helper and RPC functions: signed-in users only.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.members enable row level security;
alter table public.teams enable row level security;
alter table public.participants enable row level security;
alter table public.consents enable row level security;
alter table public.projects enable row level security;
alter table public.project_events enable row level security;
alter table public.plans enable row level security;
alter table public.check_ins enable row level security;
alter table public.survey_responses enable row level security;
alter table public.community_observations enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.moderation_items enable row level security;
alter table public.published_stories enable row level security;
alter table public.retention_rules enable row level security;

-- Organizations: everyone signed in can read names; admins manage.
create policy org_read on public.organizations for select to authenticated using (true);
create policy org_admin on public.organizations for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Members: see yourself; admins see and manage everyone; partner admins see their org.
create policy members_self on public.members for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin') or public.has_role('safeguarding_lead')
         or org_id in (select public.my_org_ids('partner_admin')));
create policy members_admin on public.members for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- Teams
create policy teams_read on public.teams for select to authenticated using (public.sees_team(id));
create policy teams_write on public.teams for insert to authenticated
  with check (public.has_role('admin') or org_id in (select public.my_org_ids('partner_admin')));
create policy teams_update on public.teams for update to authenticated
  using (public.manages_team(id)) with check (public.manages_team(id));

-- Participants (pseudonymous rows: no names here)
create policy participants_read on public.participants for select to authenticated
  using (public.manages_team(team_id) or public.has_role('evaluator'));
create policy participants_insert on public.participants for insert to authenticated
  with check (public.manages_team(team_id));
create policy participants_update on public.participants for update to authenticated
  using (public.manages_team(team_id)) with check (public.manages_team(team_id));

-- Consents: managed by whoever manages the team; evaluators may read.
create policy consents_read on public.consents for select to authenticated
  using (public.manages_team(public.team_of_participant(participant_id)) or public.has_role('evaluator'));
create policy consents_insert on public.consents for insert to authenticated
  with check (public.manages_team(public.team_of_participant(participant_id)));
create policy consents_withdraw on public.consents for update to authenticated
  using (public.manages_team(public.team_of_participant(participant_id)))
  with check (public.manages_team(public.team_of_participant(participant_id)));

-- Projects, events, plans, check-ins
create policy projects_read on public.projects for select to authenticated using (public.sees_team(team_id));
create policy projects_write on public.projects for insert to authenticated with check (public.manages_team(team_id));
create policy projects_update on public.projects for update to authenticated
  using (public.manages_team(team_id)) with check (public.manages_team(team_id));

create policy events_read on public.project_events for select to authenticated
  using (public.sees_team(public.team_of_project(project_id)));
create policy events_write on public.project_events for insert to authenticated
  with check (public.manages_team(public.team_of_project(project_id)));

create policy plans_read on public.plans for select to authenticated
  using (public.sees_team(public.team_of_project(project_id)));
create policy plans_write on public.plans for insert to authenticated
  with check (public.manages_team(public.team_of_project(project_id)));
create policy plans_approve on public.plans for update to authenticated
  using (public.manages_team(public.team_of_project(project_id)))
  with check (public.manages_team(public.team_of_project(project_id)));

create policy checkins_read on public.check_ins for select to authenticated
  using (public.sees_team(public.team_of_project(project_id)));
create policy checkins_write on public.check_ins for all to authenticated
  using (public.manages_team(public.team_of_project(project_id)))
  with check (public.manages_team(public.team_of_project(project_id)));

-- Surveys and community observations: analysis data.
create policy surveys_read on public.survey_responses for select to authenticated
  using (public.has_role('evaluator') or public.manages_team(public.team_of_participant(participant_id)));
create policy surveys_write on public.survey_responses for insert to authenticated
  with check (public.manages_team(public.team_of_participant(participant_id)));

create policy observations_read on public.community_observations for select to authenticated
  using (public.has_role('evaluator') or public.has_role('admin') or public.has_role('safeguarding_lead')
         or org_id in (select public.my_org_ids('partner_admin')));
create policy observations_write on public.community_observations for insert to authenticated
  with check (public.has_role('admin') or public.has_role('partner_admin'));

-- Conversations and messages: staff only. Coaches and evaluators never read chats.
create policy conversations_staff on public.conversations for select to authenticated using (public.is_staff());
create policy messages_staff_read on public.messages for select to authenticated using (public.is_staff());
create policy messages_staff_release on public.messages for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy moderation_staff on public.moderation_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Published stories: the public site reads what is live; admins publish.
create policy stories_public on public.published_stories for select to anon, authenticated
  using (published_at is not null and unpublished_at is null);
create policy stories_admin on public.published_stories for all to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

create policy retention_read on public.retention_rules for select to authenticated using (public.is_staff());
create policy retention_admin on public.retention_rules for update to authenticated
  using (public.has_role('admin')) with check (public.has_role('admin'));

-- ---------------------------------------------------------------------------
-- Reporting views (respect the caller's access rules)
-- ---------------------------------------------------------------------------

-- The impact funnel by month, country and organization.
create view public.funnel_by_month with (security_invoker = true) as
select
  date_trunc('month', e.occurred_at)::date as month,
  p.country,
  t.org_id,
  count(distinct p.id) filter (where e.kind = 'registered') as registered,
  count(distinct p.id) filter (where e.kind = 'plan_approved') as plan_approved,
  count(distinct p.id) filter (where e.kind = 'first_action') as launched,
  count(distinct p.id) filter (where e.kind = 'verified') as verified,
  count(distinct p.id) filter (where e.kind = 'published') as published
from public.project_events e
join public.projects p on p.id = e.project_id
join public.teams t on t.id = p.team_id
group by 1, 2, 3;

-- Girls turning 18 in the next 60 days, who need to be asked to re-consent
-- for themselves (and for future contact, for the alumni study).
create view public.reconsent_due with (security_invoker = true) as
select p.id as participant_id, p.team_id,
       make_date(p.birth_year + 18, p.birth_month, 1) as turns_18_by
from public.participants p
where p.status in ('active', 'alumna')
  and make_date(p.birth_year + 18, p.birth_month, 1) between current_date and current_date + 60;

grant select on public.funnel_by_month, public.reconsent_due to authenticated;

-- ---------------------------------------------------------------------------
-- Retention (run daily by a scheduled job using the service role)
-- ---------------------------------------------------------------------------

create or replace function private.apply_retention()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cleared int; demo int; ids int;
begin
  update public.messages m set body_redacted = null
    where body_redacted is not null
      and created_at < now() - (select keep_for from public.retention_rules where data = 'message_text');
  get diagnostics cleared = row_count;

  delete from public.conversations c
    where c.channel = 'web_demo'
      and c.started_at < now() - (select keep_for from public.retention_rules where data = 'web_demo_conversations');
  get diagnostics demo = row_count;

  delete from private.participant_identity i
    using public.participants p
    where p.id = i.participant_id and p.status = 'withdrawn'
      and p.updated_at < now() - (select keep_for from public.retention_rules where data = 'withdrawn_participant_identity');
  get diagnostics ids = row_count;

  insert into private.access_log (action, detail)
    values ('retention', jsonb_build_object('messages_cleared', cleared, 'demo_deleted', demo, 'identities_deleted', ids));
  return jsonb_build_object('messages_cleared', cleared, 'demo_deleted', demo, 'identities_deleted', ids);
end $$;
