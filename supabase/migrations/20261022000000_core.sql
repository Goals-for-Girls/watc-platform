-- =============================================================================
-- We Are the Change: core data model
--
-- Design rules (see docs/data-model.md):
--   1. Identity is separate. Names and phone numbers live only in the
--      `private` schema, which the API does not expose. Everything else refers
--      to a girl by a random participant id.
--   2. Every read of identity goes through a checked function that writes an
--      access log entry.
--   3. Consent is append-only and gates contact: no outbound WhatsApp message
--      can be stored for a girl without active participation consent.
--   4. Each role sees only what its job needs (row-level security below).
--   5. Places are city or district level. No addresses, schools or exact
--      locations anywhere in the database.
-- =============================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'admin',              -- Goals for Girls staff who run the platform
  'safeguarding_lead',  -- the designated safeguarding lead and deputy
  'moderator',          -- staff who review flagged messages
  'coach',              -- a coach or teacher responsible for teams
  'partner_admin',      -- a partner organization's program lead
  'evaluator'           -- M&E staff or an external evaluator: pseudonymous data only
);

create type public.participant_status as enum ('pending_consent', 'active', 'paused', 'withdrawn', 'alumna');
create type public.contact_mode as enum ('own_whatsapp', 'via_coach');
create type public.consent_kind as enum ('participation', 'media', 'future_contact', 'research');
create type public.consent_giver as enum ('parent_or_guardian', 'participant_adult');
create type public.consent_method as enum ('paper_form', 'whatsapp_confirmation', 'web_form');
create type public.project_status as enum (
  'draft', 'plan_submitted', 'plan_approved', 'active', 'completed', 'verified', 'abandoned'
);
create type public.project_event_kind as enum (
  'registered', 'goal_confirmed', 'plan_submitted', 'plan_approved', 'first_action',
  'check_in', 'completed', 'verified', 'published', 'abandoned'
);
create type public.check_in_wave as enum ('m3', 'm6', 'm12', 'annual', 'ad_hoc');
create type public.survey_wave as enum ('pre', 'post', 'followup');
create type public.channel as enum ('whatsapp', 'web_demo');
create type public.direction as enum ('inbound', 'outbound');
create type public.screen_category as enum ('ok', 'personal_info', 'distress_or_disclosure', 'inappropriate', 'off_topic');
create type public.message_visibility as enum ('private', 'held', 'released');
create type public.moderation_level as enum ('flag', 'urgent');
create type public.moderation_status as enum ('open', 'resolved', 'escalated');
create type public.case_status as enum ('open', 'referred', 'closed');

-- ---------------------------------------------------------------------------
-- Organizations, staff and coaches
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country char(2) not null,                      -- ISO 3166-1 alpha-2
  kind text not null default 'partner',          -- partner, school, goals_for_girls
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per role a signed-in person holds. A person can hold several.
create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  org_id uuid references public.organizations (id),
  display_name text not null,
  background_check_on date,                      -- when the screening was last done
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, role, org_id),
  constraint org_roles_need_org check (role not in ('coach', 'partner_admin') or org_id is not null)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id),
  coach_member_id uuid not null references public.members (id),
  name text not null,
  country char(2) not null,
  place text not null,                           -- city or district only
  is_solo boolean not null default false,        -- a girl working alone, with a trusted adult as "coach"
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Participants (pseudonymous) and their identity (private)
-- ---------------------------------------------------------------------------

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  birth_year smallint not null check (birth_year between 1990 and 2030),
  birth_month smallint not null check (birth_month between 1 and 12),
  country char(2) not null,
  status public.participant_status not null default 'pending_consent',
  contact_mode public.contact_mode not null default 'via_coach',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.participants (team_id);

-- Names and phone numbers. Not reachable through the API.
create table private.participant_identity (
  participant_id uuid primary key references public.participants (id) on delete cascade,
  first_name text not null,
  whatsapp_e164 text check (whatsapp_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  guardian_name text,
  guardian_relation text,
  guardian_phone_e164 text check (guardian_phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  updated_at timestamptz not null default now()
);

create table private.access_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                                    -- auth user id, null for the system
  action text not null,
  participant_id uuid,
  detail jsonb
);

-- Append-only consent records.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  kind public.consent_kind not null,
  given_by public.consent_giver not null,
  method public.consent_method not null,
  policy_version text not null,                  -- which consent text was agreed to
  evidence_ref text,                             -- where the signed form is filed
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  recorded_by uuid references public.members (id),
  check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create index on public.consents (participant_id, kind);

-- ---------------------------------------------------------------------------
-- Projects and the impact funnel
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  title text,
  issue_summary text,                            -- as stored after redaction
  sdg smallint check (sdg between 1 and 17),
  other_sdgs smallint[] not null default '{}',
  status public.project_status not null default 'draft',
  country char(2) not null,
  place text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.projects (team_id);

-- Every milestone is an event, so the funnel and timelines come from one table.
create table public.project_events (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind public.project_event_kind not null,
  occurred_at timestamptz not null default now(),
  recorded_by uuid references public.members (id),
  note text
);

create index on public.project_events (project_id, kind);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null default 1,
  content jsonb not null,                        -- problem, goal, who to talk to, first step, check-in question
  drafted_by text not null check (drafted_by in ('ai', 'participant', 'coach')),
  submitted_at timestamptz not null default now(),
  approved_by uuid references public.members (id),
  approved_at timestamptz,
  unique (project_id, version)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade,
  wave public.check_in_wave not null,
  due_on date not null,
  sent_at timestamptz,
  responded_at timestamptz,
  answers jsonb
);

-- Leadership and confidence surveys (the strategic plan's 75% target).
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  instrument text not null,                      -- e.g. 'leadership_confidence_v1'
  wave public.survey_wave not null,
  answers jsonb not null,
  collected_at timestamptz not null default now()
);

-- Teachers and community leaders reporting change they observe. No identity stored.
create table public.community_observations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id),
  country char(2) not null,
  place text not null,
  respondent_kind text not null check (respondent_kind in ('teacher', 'community_leader', 'parent', 'other')),
  question_code text not null,
  answer jsonb not null,
  collected_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conversations, moderation and safeguarding
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participants (id) on delete cascade,
  team_id uuid references public.teams (id),
  channel public.channel not null,
  started_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  direction public.direction not null,
  body_redacted text,                            -- contact details already removed; nulled by retention
  created_at timestamptz not null default now(),
  screen_category public.screen_category,
  screen_reason text,
  visibility public.message_visibility not null default 'private',
  released_by uuid references public.members (id),
  released_at timestamptz
);

create index on public.messages (conversation_id, created_at);

create table public.moderation_items (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.messages (id) on delete cascade,
  level public.moderation_level not null,
  status public.moderation_status not null default 'open',
  assigned_to uuid references public.members (id),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

-- Safeguarding cases: readable only by the safeguarding lead role.
create table private.safeguarding_cases (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.participants (id),
  message_id bigint references public.messages (id),
  source text not null check (source in ('bot_screen', 'moderator', 'coach', 'report_form', 'other')),
  severity public.moderation_level not null,
  status public.case_status not null default 'open',
  summary text not null,
  referral_to text,
  notes text,
  opened_by uuid,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Publishing to the public library
-- ---------------------------------------------------------------------------

create table public.published_stories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique references public.projects (id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  team_display_name text not null,               -- a team or organization name, never a girl's name
  place text not null,
  country char(2) not null,
  sdg smallint not null check (sdg between 1 and 17),
  summary text not null,
  story text not null,
  outcome text,
  media_consent_checked boolean not null default false,
  published_by uuid references public.members (id),
  published_at timestamptz,
  unpublished_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Retention rules (proposed; to be approved by the board)
-- ---------------------------------------------------------------------------

create table public.retention_rules (
  data text primary key,
  keep_for interval not null,
  action text not null,
  basis text not null,
  approved boolean not null default false
);

insert into public.retention_rules (data, keep_for, action, basis) values
  ('message_text', interval '12 months', 'clear body_redacted', 'Needed for moderation and support only'),
  ('web_demo_conversations', interval '1 day', 'delete', 'Demo conversations are not part of the program'),
  ('withdrawn_participant_identity', interval '30 days', 'delete identity', 'Consent withdrawn; keep pseudonymous impact data only'),
  ('closed_safeguarding_cases', interval '7 years', 'review, then delete', 'Typical safeguarding record practice; confirm per country');
