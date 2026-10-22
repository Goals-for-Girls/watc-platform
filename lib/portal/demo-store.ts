/**
 * Demo store: made-up records kept in server memory, so the portal can be
 * seen and tried before the real database is connected. It applies the same
 * rules as the database (ages, consent before activation), resets whenever
 * the server restarts, and holds no real data.
 */
import { shortDate } from "./labels";
import {
  ageFrom,
  PortalError,
  type ConsentKind,
  type ConsentRow,
  type EventRow,
  type NewConsent,
  type NewGirl,
  type PlanRow,
  type PortalStore,
  type ProjectDetail,
  type ProjectStatus,
  type RosterRow,
  type TeamSummary,
  type Todo,
} from "./types";

interface Girl {
  id: string;
  teamId: string;
  firstName: string;
  birthYear: number;
  birthMonth: number;
  status: RosterRow["status"];
  contactMode: RosterRow["contactMode"];
  consents: ConsentRow[];
}

interface Team {
  id: string;
  name: string;
  place: string;
  country: string;
  isSolo: boolean;
}

interface Project extends Omit<ProjectDetail, "teamName"> {
  updatedAt: string;
}

const year = new Date().getFullYear();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
let counter = 100;
const newId = (prefix: string) => `${prefix}-${++counter}`;

function consent(kind: ConsentKind, days: number): ConsentRow {
  return {
    id: newId("c"),
    kind,
    givenBy: "parent_or_guardian",
    method: "paper_form",
    policyVersion: "v1",
    evidenceRef: "Filed with Demo Partner",
    grantedAt: daysAgo(days),
  };
}

function seed() {
  const teams: Team[] = [
    { id: "t-hawks", name: "Hyderabad Hawks", place: "Hyderabad", country: "IN", isSolo: false },
    { id: "t-strikers", name: "Old City Strikers", place: "Hyderabad", country: "IN", isSolo: false },
  ];
  const g = (
    id: string,
    teamId: string,
    firstName: string,
    age: number,
    status: RosterRow["status"],
    consents: ConsentRow[],
  ): Girl => ({
    id,
    teamId,
    firstName,
    birthYear: year - age,
    birthMonth: 1,
    status,
    contactMode: age >= 13 ? "own_whatsapp" : "via_coach",
    consents,
  });
  const girls: Girl[] = [
    g("g-1", "t-hawks", "Asha", 15, "active", [consent("participation", 40), consent("media", 40)]),
    g("g-2", "t-hawks", "Divya", 12, "active", [consent("participation", 40)]),
    g("g-3", "t-hawks", "Meera", 14, "active", [consent("participation", 38), consent("media", 38)]),
    g("g-4", "t-hawks", "Sana", 16, "pending_consent", []),
    g("g-5", "t-strikers", "Kavya", 17, "active", [consent("participation", 60), consent("future_contact", 60)]),
    g("g-6", "t-strikers", "Zoya", 13, "active", [consent("participation", 60)]),
    g("g-7", "t-strikers", "Lakshmi", 15, "pending_consent", []),
  ];
  const plan = (version: number, approved: boolean, content: PlanRow["content"]): PlanRow => ({
    id: newId("p"),
    version,
    content,
    draftedBy: "ai",
    submittedAt: daysAgo(2),
    approvedAt: approved ? daysAgo(20) : undefined,
  });
  const projects: Project[] = [
    {
      id: "pr-bins",
      teamId: "t-hawks",
      title: "Bins for the field",
      sdg: 12,
      status: "plan_submitted",
      place: "Hyderabad",
      country: "IN",
      issueSummary: "Plastic trash piles up around our football field and nobody recycles it.",
      plans: [
        plan(1, false, {
          problem: "Plastic trash piles up around our football field and nobody recycles it.",
          goal: "A clean field, with families and shopkeepers recycling bottles every week.",
          whoToTalkTo: "Our coach, the shopkeeper next to the field, and parents at Saturday practice.",
          firstStep: "Put out two collection bins at the field with our coach's help.",
          checkIn: "How many bottles did you collect in the first two weeks?",
        }),
      ],
      events: [
        { kind: "registered", occurredAt: daysAgo(6) },
        { kind: "goal_confirmed", occurredAt: daysAgo(6) },
        { kind: "plan_submitted", occurredAt: daysAgo(2) },
      ],
      checkIns: [],
      updatedAt: daysAgo(2),
    },
    {
      id: "pr-walk",
      teamId: "t-strikers",
      title: "Safe walk to practice",
      sdg: 5,
      status: "active",
      place: "Hyderabad",
      country: "IN",
      issueSummary: "Girls stop coming to practice because the walk home after dark feels unsafe.",
      plans: [
        plan(1, true, {
          problem: "Girls stop coming to practice because the walk home after dark feels unsafe.",
          goal: "Every girl walks home in a group, and practice ends before dark.",
          whoToTalkTo: "Parents, the coach, and the ward councillor about street lights.",
          firstStep: "Set up walking groups by neighborhood with parents' agreement.",
          checkIn: "How many girls walked home in a group this month?",
        }),
      ],
      events: [
        { kind: "registered", occurredAt: daysAgo(70) },
        { kind: "plan_approved", occurredAt: daysAgo(55) },
        { kind: "first_action", occurredAt: daysAgo(40), note: "First walking groups started" },
      ],
      checkIns: [
        { wave: "m3", dueOn: inDays(5) },
      ],
      updatedAt: daysAgo(40),
    },
  ];
  return { teams, girls, projects };
}

// One shared copy per server process.
const db = ((globalThis as unknown as { __watcDemo?: ReturnType<typeof seed> }).__watcDemo ??= seed());

const has = (girl: Girl, kind: ConsentKind) => girl.consents.some((c) => c.kind === kind && !c.withdrawnAt);

function rosterRow(girl: Girl): RosterRow {
  return {
    participantId: girl.id,
    firstName: girl.firstName,
    age: ageFrom(girl.birthYear, girl.birthMonth),
    status: girl.status,
    contactMode: girl.contactMode,
    participation: has(girl, "participation"),
    media: has(girl, "media"),
  };
}

function summary(team: Team): TeamSummary {
  const girls = db.girls.filter((g) => g.teamId === team.id);
  return {
    ...team,
    girls: girls.length,
    active: girls.filter((g) => g.status === "active").length,
    pendingConsent: girls.filter((g) => g.status === "pending_consent").length,
    projects: db.projects.filter((p) => p.teamId === team.id).length,
  };
}

export class DemoStore implements PortalStore {
  readonly mode = "demo" as const;

  async me() {
    return { displayName: "Demo Coach", roles: ["coach"], orgName: "Demo Partner, Hyderabad" };
  }

  async dashboard() {
    const todos: Todo[] = [];
    for (const g of db.girls.filter((x) => x.status === "pending_consent")) {
      todos.push({ kind: "consent", text: `Record consent for ${g.firstName}`, href: `/portal/girls/${g.id}/` });
    }
    for (const p of db.projects) {
      const latest = p.plans.at(-1);
      if (latest && !latest.approvedAt) {
        todos.push({ kind: "plan", text: `Review the plan for "${p.title}"`, href: `/portal/projects/${p.id}/` });
      }
      for (const c of p.checkIns.filter((c) => !c.respondedAt)) {
        todos.push({ kind: "checkin", text: `Check-in for "${p.title}" due ${shortDate(c.dueOn)}`, href: `/portal/projects/${p.id}/` });
      }
    }
    return { teams: db.teams.map(summary), todos };
  }

  async team(id: string) {
    const team = db.teams.find((t) => t.id === id);
    if (!team) return null;
    return {
      team: summary(team),
      roster: db.girls.filter((g) => g.teamId === id).map(rosterRow).sort((a, b) => a.firstName.localeCompare(b.firstName)),
      projects: db.projects
        .filter((p) => p.teamId === id)
        .map((p) => ({ id: p.id, title: p.title, sdg: p.sdg, status: p.status, updatedAt: p.updatedAt })),
    };
  }

  async createTeam(input: { name: string; place: string; isSolo: boolean }) {
    const id = newId("t");
    db.teams.push({ id, name: input.name, place: input.place, country: "IN", isSolo: input.isSolo });
    return id;
  }

  async addGirl(teamId: string, input: NewGirl) {
    const age = ageFrom(input.birthYear, input.birthMonth);
    if (age < 12 || age > 18) throw new PortalError(`Girls must be 12 to 18 when they join. This date of birth makes her ${age}.`);
    if (input.contactMode === "own_whatsapp" && age < 13) {
      throw new PortalError("Girls under 13 are contacted through you, not on their own WhatsApp.");
    }
    const id = newId("g");
    db.girls.push({
      id,
      teamId,
      firstName: input.firstName,
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      status: "pending_consent",
      contactMode: input.contactMode,
      consents: [],
    });
    return id;
  }

  async girl(participantId: string) {
    const girl = db.girls.find((g) => g.id === participantId);
    if (!girl) return null;
    const team = db.teams.find((t) => t.id === girl.teamId);
    return { row: rosterRow(girl), teamId: girl.teamId, teamName: team?.name ?? "", consents: girl.consents };
  }

  async recordConsent(participantId: string, input: NewConsent) {
    const girl = db.girls.find((g) => g.id === participantId);
    if (!girl) throw new PortalError("Girl not found.");
    if (has(girl, input.kind)) throw new PortalError("This consent is already on record.");
    girl.consents.push({ id: newId("c"), ...input, grantedAt: new Date().toISOString() });
    if (input.kind === "participation" && girl.status === "pending_consent") girl.status = "active";
  }

  async withdrawConsent(participantId: string, kind: ConsentKind) {
    const girl = db.girls.find((g) => g.id === participantId);
    if (!girl) throw new PortalError("Girl not found.");
    for (const c of girl.consents) if (c.kind === kind && !c.withdrawnAt) c.withdrawnAt = new Date().toISOString();
    if (kind === "participation") girl.status = "withdrawn";
  }

  async project(id: string) {
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    const team = db.teams.find((t) => t.id === p.teamId);
    return { ...p, teamName: team?.name ?? "", plans: [...p.plans].reverse(), events: [...p.events].reverse() };
  }

  async approvePlan(projectId: string, planId: string) {
    const p = db.projects.find((x) => x.id === projectId);
    const plan = p?.plans.find((x) => x.id === planId);
    if (!p || !plan) throw new PortalError("Plan not found.");
    plan.approvedAt = new Date().toISOString();
    p.events.push({ kind: "plan_approved", occurredAt: plan.approvedAt });
    p.status = "plan_approved";
    p.updatedAt = plan.approvedAt;
  }

  async logMilestone(projectId: string, kind: "first_action" | "completed", note?: string) {
    const p = db.projects.find((x) => x.id === projectId);
    if (!p) throw new PortalError("Project not found.");
    const at = new Date().toISOString();
    const ev: EventRow = { kind, occurredAt: at, note: note || undefined };
    p.events.push(ev);
    p.status = (kind === "first_action" ? "active" : "completed") as ProjectStatus;
    p.updatedAt = at;
  }
}
