-- =============================================================================
-- Tests: access rules and safety gates.
-- Run on a scratch database after the shim and the migrations:
--   psql -v ON_ERROR_STOP=1 -f 00_local_supabase_shim.sql -f ../migrations/*.sql -f 10_access_and_gates_test.sql
-- Every check raises an exception on failure, so the run stops at the first problem.
-- =============================================================================

create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok  %', what;
end $$;

create function tests.fails(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok  % (blocked: %)', what, sqlerrm;
    return;
  end;
  raise exception 'FAILED: % (statement was allowed)', what;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

create function tests.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', u::text, false);
  execute 'set role authenticated';
end $$;

-- ---------------------------------------------------------------------------
-- Seed (as the database owner, bypassing access rules)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test'),
  ('00000000-0000-0000-0000-00000000000b', 'safeguarding@test'),
  ('00000000-0000-0000-0000-00000000000c', 'moderator@test'),
  ('00000000-0000-0000-0000-00000000000d', 'coach.a@test'),
  ('00000000-0000-0000-0000-00000000000e', 'coach.b@test'),
  ('00000000-0000-0000-0000-00000000000f', 'partner.a@test'),
  ('00000000-0000-0000-0000-000000000010', 'evaluator@test');

insert into public.organizations (id, name, country) values
  ('10000000-0000-0000-0000-00000000000a', 'Partner A (India)', 'IN'),
  ('10000000-0000-0000-0000-00000000000b', 'Partner B (South Africa)', 'ZA');

insert into public.members (id, user_id, role, org_id, display_name) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'admin', null, 'Admin'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'safeguarding_lead', null, 'Safeguarding lead'),
  ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'moderator', null, 'Moderator'),
  ('20000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', 'coach', '10000000-0000-0000-0000-00000000000a', 'Coach A'),
  ('20000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e', 'coach', '10000000-0000-0000-0000-00000000000b', 'Coach B'),
  ('20000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'partner_admin', '10000000-0000-0000-0000-00000000000a', 'Partner admin A'),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'evaluator', null, 'Evaluator');

insert into public.teams (id, org_id, coach_member_id, name, country, place) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000d', 'Team A', 'IN', 'Hyderabad'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000e', 'Team B', 'ZA', 'Johannesburg');

-- Ages are computed from today, so the seed stays valid over time.
insert into public.participants (id, team_id, birth_year, birth_month, country, contact_mode) values
  ('40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a',
     extract(year from current_date)::int - 15, 1, 'IN', 'own_whatsapp'),
  ('40000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-00000000000a',
     extract(year from current_date)::int - 12, 1, 'IN', 'via_coach'),  -- always 12
  ('40000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-00000000000b',
     extract(year from current_date)::int - 16, 1, 'ZA', 'via_coach');

insert into private.participant_identity (participant_id, first_name, whatsapp_e164, guardian_name) values
  ('40000000-0000-0000-0000-0000000000a1', 'Asha', '+919800000001', 'Parent A1'),
  ('40000000-0000-0000-0000-0000000000a2', 'Divya', null, 'Parent A2'),
  ('40000000-0000-0000-0000-0000000000b1', 'Naledi', null, 'Parent B1');

insert into public.consents (participant_id, kind, given_by, method, policy_version) values
  ('40000000-0000-0000-0000-0000000000a1', 'participation', 'parent_or_guardian', 'paper_form', 'v1'),
  ('40000000-0000-0000-0000-0000000000b1', 'participation', 'parent_or_guardian', 'paper_form', 'v1');
update public.participants set status = 'active'
  where id in ('40000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000b1');

insert into public.projects (id, team_id, title, sdg, country, place) values
  ('50000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Bins for the field', 12, 'IN', 'Hyderabad'),
  ('50000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b', 'Pads at school', 5, 'ZA', 'Johannesburg');
insert into public.project_events (project_id, kind) values
  ('50000000-0000-0000-0000-00000000000a', 'registered'),
  ('50000000-0000-0000-0000-00000000000a', 'plan_approved'),
  ('50000000-0000-0000-0000-00000000000b', 'registered');

insert into public.conversations (id, participant_id, team_id, channel) values
  ('60000000-0000-0000-0000-0000000000a1', '40000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a', 'whatsapp'),
  ('60000000-0000-0000-0000-0000000000a2', '40000000-0000-0000-0000-0000000000a2', '30000000-0000-0000-0000-00000000000a', 'whatsapp');
insert into public.messages (conversation_id, direction, body_redacted, screen_category) values
  ('60000000-0000-0000-0000-0000000000a1', 'inbound', 'There is plastic everywhere near our field', 'ok'),
  ('60000000-0000-0000-0000-0000000000a1', 'outbound', 'That connects to goal 12.', null);

insert into public.published_stories (slug, title, team_display_name, place, country, sdg, summary, story, media_consent_checked, published_at) values
  ('live-story', 'Live story', 'Team A', 'Hyderabad', 'IN', 12, 'Summary', 'Story', true, now()),
  ('draft-story', 'Draft story', 'Team A', 'Hyderabad', 'IN', 12, 'Summary', 'Story', false, null);

-- ---------------------------------------------------------------------------
-- Coach A: sees her own team only, and names only through the logged roster
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000d');
select tests.ok((select count(*) from public.teams) = 1, 'coach sees only her own team');
select tests.ok((select count(*) from public.participants) = 2, 'coach sees only her team''s girls');
select tests.ok((select count(*) from public.projects) = 1, 'coach sees only her team''s projects');
select tests.ok((select count(*) from public.messages) = 0, 'coach cannot read chat messages');
select tests.ok((select count(*) from public.team_roster('30000000-0000-0000-0000-00000000000a')) = 2, 'coach can open her team roster with names');
select tests.fails($$select * from public.team_roster('30000000-0000-0000-0000-00000000000b')$$, 'coach cannot open another team''s roster');
select tests.fails($$select * from private.participant_identity$$, 'coach cannot read the identity table directly');
select public.set_participant_identity('40000000-0000-0000-0000-0000000000a2', 'Divya', null, 'Parent A2', 'mother', '+919800000003');
select tests.ok(true, 'coach can update her own girl''s details through the logged function');
select tests.fails($$select public.set_participant_identity('40000000-0000-0000-0000-0000000000b1', 'Changed')$$,
  'coach cannot change another team''s girl''s details');
select tests.fails($$insert into public.participants (team_id, birth_year, birth_month, country) values ('30000000-0000-0000-0000-00000000000b', 2012, 1, 'ZA')$$,
  'coach cannot add a girl to another team');
insert into public.teams (org_id, coach_member_id, name, country, place) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000d', 'Team A2', 'IN', 'Hyderabad');
select tests.ok((select count(*) from public.teams) = 2, 'coach can create a team for herself');
select tests.fails($$insert into public.teams (org_id, coach_member_id, name, country, place) values
  ('10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000d', 'Sneaky', 'ZA', 'Johannesburg')$$,
  'coach cannot create a team in another organization');
select tests.fails($$insert into public.teams (org_id, coach_member_id, name, country, place) values
  ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000e', 'Not mine', 'IN', 'Hyderabad')$$,
  'coach cannot create a team assigned to another coach');
reset role;

-- ---------------------------------------------------------------------------
-- Partner admin A: her organization's teams only
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000f');
select tests.ok((select count(*) from public.participants) = 2, 'partner admin sees her organization''s girls only');
select tests.ok((select count(*) from public.members) >= 2, 'partner admin sees her organization''s members');
reset role;

-- ---------------------------------------------------------------------------
-- Moderator: messages yes, girls' records and names no
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000c');
select tests.ok((select count(*) from public.messages) = 2, 'moderator reads messages');
select tests.ok((select count(*) from public.participants) = 0, 'moderator sees no participant records');
select tests.fails($$select * from public.team_roster('30000000-0000-0000-0000-00000000000a')$$, 'moderator cannot see names');
select tests.ok(public.raise_concern('Possible disclosure in chat', 'urgent', 'moderator',
  '40000000-0000-0000-0000-0000000000a1') is not null, 'moderator can raise a safeguarding concern');
select tests.fails($$select * from public.my_safeguarding_cases()$$, 'moderator cannot read safeguarding cases');
reset role;

-- ---------------------------------------------------------------------------
-- Evaluator: pseudonymous data across all teams, nothing identifying
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-000000000010');
select tests.ok((select count(*) from public.participants) = 3, 'evaluator sees all participants, pseudonymously');
select tests.ok((select count(*) from public.messages) = 0, 'evaluator cannot read messages');
select tests.fails($$select * from public.team_roster('30000000-0000-0000-0000-00000000000a')$$, 'evaluator cannot see names');
select tests.ok((select sum(registered) from public.funnel_by_month) = 2, 'evaluator sees the whole funnel');
reset role;

-- ---------------------------------------------------------------------------
-- Safeguarding lead: reads cases
-- ---------------------------------------------------------------------------
select tests.as_user('00000000-0000-0000-0000-00000000000b');
select tests.ok((select count(*) from public.my_safeguarding_cases()) = 1, 'safeguarding lead reads cases');
reset role;

-- ---------------------------------------------------------------------------
-- The public: published stories only
-- ---------------------------------------------------------------------------
set role anon;
select tests.ok((select count(*) from public.published_stories) = 1, 'public sees only published stories');
select tests.fails($$select count(*) from public.participants$$, 'public cannot read participants');
reset role;

-- ---------------------------------------------------------------------------
-- Safety gates (enforced by the database for everyone, even the owner)
-- ---------------------------------------------------------------------------
select tests.fails($$insert into public.participants (team_id, birth_year, birth_month, country) values
  ('30000000-0000-0000-0000-00000000000a', extract(year from current_date)::int - 10, 1, 'IN')$$,
  'a 10-year-old cannot be registered');
select tests.fails($$update public.participants set contact_mode = 'own_whatsapp' where id = '40000000-0000-0000-0000-0000000000a2'$$,
  'a 12-year-old cannot be contacted on her own WhatsApp');
select tests.fails($$update private.participant_identity set whatsapp_e164 = '+919800000002' where participant_id = '40000000-0000-0000-0000-0000000000a2'$$,
  'no own phone number stored for a girl contacted through her coach');
select tests.fails($$update public.participants set status = 'active' where id = '40000000-0000-0000-0000-0000000000a2'$$,
  'a girl cannot be made active without consent');
select tests.fails($$insert into public.messages (conversation_id, direction, body_redacted) values ('60000000-0000-0000-0000-0000000000a2', 'outbound', 'Hi')$$,
  'no outbound WhatsApp message without consent');
select tests.fails($$delete from public.consents where participant_id = '40000000-0000-0000-0000-0000000000a1'$$,
  'consent records cannot be deleted');
select tests.fails($$update public.consents set policy_version = 'v2' where participant_id = '40000000-0000-0000-0000-0000000000a1'$$,
  'consent records cannot be edited');
select tests.fails($$update public.published_stories set published_at = now() where slug = 'draft-story'$$,
  'a story cannot be published without media consent');

update public.consents set withdrawn_at = now()
  where participant_id = '40000000-0000-0000-0000-0000000000a1' and kind = 'participation';
select tests.ok((select status from public.participants where id = '40000000-0000-0000-0000-0000000000a1') = 'withdrawn',
  'withdrawing consent withdraws the girl');
select tests.fails($$insert into public.messages (conversation_id, direction, body_redacted) values ('60000000-0000-0000-0000-0000000000a1', 'outbound', 'Hi')$$,
  'no more messages after consent is withdrawn');

-- ---------------------------------------------------------------------------
-- Audit and retention
-- ---------------------------------------------------------------------------
select tests.ok((select count(*) from private.access_log where action = 'team_roster') = 1,
  'every roster view is logged (blocked attempts never reach the data)');
select tests.ok((select count(*) from private.access_log where action = 'set_identity') = 1,
  'every change to a girl''s details is logged');
select tests.ok((private.apply_retention() ->> 'messages_cleared') is not null, 'retention job runs');

select 'ALL TESTS PASSED' as result;
