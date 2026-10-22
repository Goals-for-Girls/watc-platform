/**
 * Live store: reads and writes the Supabase database as the signed-in user.
 * The database's row-level security decides what each person can see; this
 * file never filters for permissions itself. Girls' names come only from the
 * logged team_roster function.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { shortDate } from "./labels";
import { supabaseForRequest } from "./supabase-server";
import {
  PortalError,
  type ConsentKind,
  type ConsentRow,
  type Me,
  type NewConsent,
  type NewGirl,
  type PlanRow,
  type PortalStore,
  type ProjectDetail,
  type RosterRow,
  type TeamSummary,
  type Todo,
} from "./types";

type Row = Record<string, unknown>;

function fail(error: { message: string } | null): void {
  if (!error) return;
  // Database rule violations carry a readable message; pass those through.
  throw new PortalError(error.message.replace(/^.*?: /, ""));
}

function teamSummary(t: Row): TeamSummary {
  const girls = (t.participants as { status: string }[] | null) ?? [];
  return {
    id: t.id as string,
    name: t.name as string,
    place: t.place as string,
    country: t.country as string,
    isSolo: t.is_solo as boolean,
    girls: girls.length,
    active: girls.filter((g) => g.status === "active").length,
    pendingConsent: girls.filter((g) => g.status === "pending_consent").length,
    projects: ((t.projects as unknown[] | null) ?? []).length,
  };
}

function rosterRow(r: Row): RosterRow {
  return {
    participantId: r.participant_id as string,
    firstName: (r.first_name as string) ?? "(name not recorded)",
    age: r.age as number,
    status: r.status as RosterRow["status"],
    contactMode: r.contact_mode as RosterRow["contactMode"],
    participation: r.participation_consent as boolean,
    media: r.media_consent as boolean,
  };
}

export class SupabaseStore implements PortalStore {
  readonly mode = "live" as const;
  private constructor(private db: SupabaseClient) {}

  static async create() {
    return new SupabaseStore(await supabaseForRequest());
  }

  /** The member row used to sign records (coach first, then other roles). */
  private async memberId(): Promise<string> {
    const { data: auth } = await this.db.auth.getUser();
    if (!auth.user) throw new PortalError("Please sign in again.");
    const { data, error } = await this.db
      .from("members")
      .select("id, role")
      .eq("user_id", auth.user.id)
      .eq("active", true);
    fail(error);
    const rows = (data ?? []) as { id: string; role: string }[];
    const pick = rows.find((r) => r.role === "coach") ?? rows.find((r) => r.role === "partner_admin") ?? rows[0];
    if (!pick) throw new PortalError("Your account has no role yet. Ask Goals for Girls to add you.");
    return pick.id;
  }

  async me(): Promise<Me | null> {
    const { data: auth } = await this.db.auth.getUser();
    if (!auth.user) return null;
    const { data } = await this.db
      .from("members")
      .select("role, display_name, organizations(name)")
      .eq("user_id", auth.user.id)
      .eq("active", true);
    const rows = (data ?? []) as unknown as { role: string; display_name: string; organizations: { name: string } | null }[];
    if (!rows.length) return { displayName: auth.user.email ?? "Signed in", roles: [] };
    return {
      displayName: rows[0].display_name,
      roles: rows.map((r) => r.role),
      orgName: rows.find((r) => r.organizations)?.organizations?.name,
    };
  }

  async dashboard() {
    const { data: teams, error } = await this.db
      .from("teams")
      .select("id, name, place, country, is_solo, participants(status), projects(id)")
      .eq("active", true)
      .order("name");
    fail(error);

    const todos: Todo[] = [];
    const { data: pending } = await this.db.from("participants").select("id, team_id").eq("status", "pending_consent");
    for (const p of (pending ?? []) as Row[]) {
      todos.push({ kind: "consent", text: "A girl is waiting for consent to be recorded", href: `/portal/girls/${p.id}/` });
    }
    const { data: plans } = await this.db
      .from("plans")
      .select("project_id, projects(title)")
      .is("approved_at", null);
    for (const p of (plans ?? []) as unknown as { project_id: string; projects: { title: string } | null }[]) {
      todos.push({ kind: "plan", text: `Review the plan for "${p.projects?.title ?? "a project"}"`, href: `/portal/projects/${p.project_id}/` });
    }
    const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const { data: checks } = await this.db
      .from("check_ins")
      .select("project_id, due_on, projects(title)")
      .is("responded_at", null)
      .lte("due_on", soon);
    for (const c of (checks ?? []) as unknown as { project_id: string; due_on: string; projects: { title: string } | null }[]) {
      todos.push({ kind: "checkin", text: `Check-in for "${c.projects?.title ?? "a project"}" due ${shortDate(c.due_on)}`, href: `/portal/projects/${c.project_id}/` });
    }
    const { data: reconsent } = await this.db.from("reconsent_due").select("participant_id, turns_18_by");
    for (const r of (reconsent ?? []) as Row[]) {
      todos.push({ kind: "reconsent", text: `A girl turns 18 by ${shortDate(r.turns_18_by as string)}: ask her to consent for herself`, href: `/portal/girls/${r.participant_id}/` });
    }

    return { teams: ((teams ?? []) as Row[]).map(teamSummary), todos };
  }

  async team(id: string) {
    const { data: t, error } = await this.db
      .from("teams")
      .select("id, name, place, country, is_solo, participants(status), projects(id)")
      .eq("id", id)
      .maybeSingle();
    fail(error);
    if (!t) return null;
    const { data: roster, error: rErr } = await this.db.rpc("team_roster", { t: id });
    fail(rErr);
    const { data: projects } = await this.db
      .from("projects")
      .select("id, title, sdg, status, updated_at")
      .eq("team_id", id)
      .order("updated_at", { ascending: false });
    return {
      team: teamSummary(t as Row),
      roster: ((roster ?? []) as Row[]).map(rosterRow),
      projects: ((projects ?? []) as Row[]).map((p) => ({
        id: p.id as string,
        title: (p.title as string) ?? "Untitled project",
        sdg: p.sdg as number | null,
        status: p.status as ProjectDetail["status"],
        updatedAt: p.updated_at as string,
      })),
    };
  }

  async createTeam(input: { name: string; place: string; isSolo: boolean }) {
    const { data: auth } = await this.db.auth.getUser();
    if (!auth.user) throw new PortalError("Please sign in again.");
    const { data: coach } = await this.db
      .from("members")
      .select("id, org_id, organizations(country)")
      .eq("user_id", auth.user.id)
      .eq("role", "coach")
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    const c = coach as unknown as { id: string; org_id: string; organizations: { country: string } } | null;
    if (!c) throw new PortalError("Only coaches can create teams here.");
    const { data, error } = await this.db
      .from("teams")
      .insert({
        org_id: c.org_id,
        coach_member_id: c.id,
        name: input.name,
        place: input.place,
        country: c.organizations.country,
        is_solo: input.isSolo,
      })
      .select("id")
      .single();
    fail(error);
    return (data as Row).id as string;
  }

  async addGirl(teamId: string, input: NewGirl) {
    const { data: team } = await this.db.from("teams").select("country").eq("id", teamId).single();
    if (!team) throw new PortalError("Team not found.");
    const { data, error } = await this.db
      .from("participants")
      .insert({
        team_id: teamId,
        birth_year: input.birthYear,
        birth_month: input.birthMonth,
        country: (team as Row).country,
        contact_mode: input.contactMode,
      })
      .select("id")
      .single();
    fail(error);
    const id = (data as Row).id as string;
    const { error: idErr } = await this.db.rpc("set_participant_identity", {
      p: id,
      first_name: input.firstName,
      whatsapp_e164: input.contactMode === "own_whatsapp" ? input.whatsapp || null : null,
      guardian_name: input.guardianName,
      guardian_relation: input.guardianRelation,
      guardian_phone_e164: input.guardianPhone || null,
    });
    fail(idErr);
    return id;
  }

  async girl(participantId: string) {
    const { data: p } = await this.db
      .from("participants")
      .select("id, team_id, teams(name)")
      .eq("id", participantId)
      .maybeSingle();
    if (!p) return null;
    const part = p as unknown as { id: string; team_id: string; teams: { name: string } };
    const { data: roster, error } = await this.db.rpc("team_roster", { t: part.team_id });
    fail(error);
    const row = ((roster ?? []) as Row[]).map(rosterRow).find((r) => r.participantId === participantId);
    if (!row) return null;
    const { data: consents } = await this.db
      .from("consents")
      .select("id, kind, given_by, method, policy_version, evidence_ref, granted_at, withdrawn_at")
      .eq("participant_id", participantId)
      .order("granted_at", { ascending: false });
    return {
      row,
      teamId: part.team_id,
      teamName: part.teams.name,
      consents: ((consents ?? []) as Row[]).map(
        (c): ConsentRow => ({
          id: c.id as string,
          kind: c.kind as ConsentKind,
          givenBy: c.given_by as ConsentRow["givenBy"],
          method: c.method as ConsentRow["method"],
          policyVersion: c.policy_version as string,
          evidenceRef: (c.evidence_ref as string) ?? undefined,
          grantedAt: c.granted_at as string,
          withdrawnAt: (c.withdrawn_at as string) ?? undefined,
        }),
      ),
    };
  }

  async recordConsent(participantId: string, input: NewConsent) {
    const recordedBy = await this.memberId();
    const { error } = await this.db.from("consents").insert({
      participant_id: participantId,
      kind: input.kind,
      given_by: input.givenBy,
      method: input.method,
      policy_version: input.policyVersion,
      evidence_ref: input.evidenceRef || null,
      recorded_by: recordedBy,
    });
    fail(error);
    if (input.kind === "participation") {
      const { error: upErr } = await this.db
        .from("participants")
        .update({ status: "active" })
        .eq("id", participantId)
        .eq("status", "pending_consent");
      fail(upErr);
    }
  }

  async withdrawConsent(participantId: string, kind: ConsentKind) {
    const { error } = await this.db
      .from("consents")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("participant_id", participantId)
      .eq("kind", kind)
      .is("withdrawn_at", null);
    fail(error);
  }

  async project(id: string) {
    const { data: p, error } = await this.db
      .from("projects")
      .select("id, title, sdg, status, place, country, team_id, issue_summary, teams(name)")
      .eq("id", id)
      .maybeSingle();
    fail(error);
    if (!p) return null;
    const row = p as unknown as Row & { teams: { name: string } };
    const [{ data: plans }, { data: events }, { data: checks }] = await Promise.all([
      this.db.from("plans").select("id, version, content, drafted_by, submitted_at, approved_at").eq("project_id", id).order("version", { ascending: false }),
      this.db.from("project_events").select("kind, occurred_at, note").eq("project_id", id).order("occurred_at", { ascending: false }),
      this.db.from("check_ins").select("wave, due_on, responded_at").eq("project_id", id).order("due_on"),
    ]);
    return {
      id: row.id as string,
      title: (row.title as string) ?? "Untitled project",
      sdg: row.sdg as number | null,
      status: row.status as ProjectDetail["status"],
      place: row.place as string,
      country: row.country as string,
      teamId: row.team_id as string,
      teamName: row.teams.name,
      issueSummary: (row.issue_summary as string) ?? undefined,
      plans: ((plans ?? []) as Row[]).map(
        (pl): PlanRow => ({
          id: pl.id as string,
          version: pl.version as number,
          content: pl.content as PlanRow["content"],
          draftedBy: pl.drafted_by as string,
          submittedAt: pl.submitted_at as string,
          approvedAt: (pl.approved_at as string) ?? undefined,
        }),
      ),
      events: ((events ?? []) as Row[]).map((e) => ({
        kind: e.kind as ProjectDetail["events"][number]["kind"],
        occurredAt: e.occurred_at as string,
        note: (e.note as string) ?? undefined,
      })),
      checkIns: ((checks ?? []) as Row[]).map((c) => ({
        wave: c.wave as string,
        dueOn: c.due_on as string,
        respondedAt: (c.responded_at as string) ?? undefined,
      })),
    };
  }

  async approvePlan(projectId: string, planId: string) {
    const approvedBy = await this.memberId();
    const { error } = await this.db
      .from("plans")
      .update({ approved_by: approvedBy, approved_at: new Date().toISOString() })
      .eq("id", planId)
      .eq("project_id", projectId);
    fail(error);
    fail((await this.db.from("project_events").insert({ project_id: projectId, kind: "plan_approved", recorded_by: approvedBy })).error);
    fail((await this.db.from("projects").update({ status: "plan_approved" }).eq("id", projectId)).error);
  }

  async logMilestone(projectId: string, kind: "first_action" | "completed", note?: string) {
    const by = await this.memberId();
    fail((await this.db.from("project_events").insert({ project_id: projectId, kind, note: note || null, recorded_by: by })).error);
    fail(
      (await this.db
        .from("projects")
        .update({ status: kind === "first_action" ? "active" : "completed" })
        .eq("id", projectId)).error,
    );
  }
}
