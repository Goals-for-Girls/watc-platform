/** Types shared by the coach portal pages and its two data stores. */

export type ParticipantStatus = "pending_consent" | "active" | "paused" | "withdrawn" | "alumna";
export type ContactMode = "own_whatsapp" | "via_coach";
export type ConsentKind = "participation" | "media" | "future_contact" | "research";
export type ConsentGiver = "parent_or_guardian" | "participant_adult";
export type ConsentMethod = "paper_form" | "whatsapp_confirmation" | "web_form";
export type ProjectStatus =
  | "draft"
  | "plan_submitted"
  | "plan_approved"
  | "active"
  | "completed"
  | "verified"
  | "abandoned";
export type EventKind =
  | "registered"
  | "goal_confirmed"
  | "plan_submitted"
  | "plan_approved"
  | "first_action"
  | "check_in"
  | "completed"
  | "verified"
  | "published"
  | "abandoned";

export interface Me {
  displayName: string;
  roles: string[];
  orgName?: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  place: string;
  country: string;
  isSolo: boolean;
  girls: number;
  active: number;
  pendingConsent: number;
  projects: number;
}

export interface RosterRow {
  participantId: string;
  firstName: string;
  age: number;
  status: ParticipantStatus;
  contactMode: ContactMode;
  participation: boolean;
  media: boolean;
}

export interface ProjectSummary {
  id: string;
  title: string;
  sdg: number | null;
  status: ProjectStatus;
  updatedAt: string;
}

export interface TeamDetail {
  team: TeamSummary;
  roster: RosterRow[];
  projects: ProjectSummary[];
}

export interface ConsentRow {
  id: string;
  kind: ConsentKind;
  givenBy: ConsentGiver;
  method: ConsentMethod;
  policyVersion: string;
  evidenceRef?: string;
  grantedAt: string;
  withdrawnAt?: string;
}

export interface GirlDetail {
  row: RosterRow;
  teamId: string;
  teamName: string;
  consents: ConsentRow[];
}

export interface PlanContent {
  problem: string;
  goal: string;
  whoToTalkTo: string;
  firstStep: string;
  checkIn: string;
}

export interface PlanRow {
  id: string;
  version: number;
  content: PlanContent;
  draftedBy: string;
  submittedAt: string;
  approvedAt?: string;
}

export interface EventRow {
  kind: EventKind;
  occurredAt: string;
  note?: string;
}

export interface CheckInRow {
  wave: string;
  dueOn: string;
  respondedAt?: string;
}

export interface ProjectDetail {
  id: string;
  title: string;
  sdg: number | null;
  status: ProjectStatus;
  place: string;
  country: string;
  teamId: string;
  teamName: string;
  issueSummary?: string;
  plans: PlanRow[];
  events: EventRow[];
  checkIns: CheckInRow[];
}

export interface Todo {
  kind: "consent" | "plan" | "checkin" | "reconsent";
  text: string;
  href: string;
}

export interface NewGirl {
  firstName: string;
  birthYear: number;
  birthMonth: number;
  contactMode: ContactMode;
  whatsapp?: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone?: string;
}

export interface NewConsent {
  kind: ConsentKind;
  givenBy: ConsentGiver;
  method: ConsentMethod;
  policyVersion: string;
  evidenceRef?: string;
}

export interface PortalStore {
  readonly mode: "demo" | "live";
  me(): Promise<Me | null>;
  dashboard(): Promise<{ teams: TeamSummary[]; todos: Todo[] }>;
  team(id: string): Promise<TeamDetail | null>;
  createTeam(input: { name: string; place: string; isSolo: boolean }): Promise<string>;
  addGirl(teamId: string, input: NewGirl): Promise<string>;
  girl(participantId: string): Promise<GirlDetail | null>;
  recordConsent(participantId: string, input: NewConsent): Promise<void>;
  withdrawConsent(participantId: string, kind: ConsentKind): Promise<void>;
  project(id: string): Promise<ProjectDetail | null>;
  approvePlan(projectId: string, planId: string): Promise<void>;
  logMilestone(projectId: string, kind: "first_action" | "completed", note?: string): Promise<void>;
}

/** A rule the user broke; shown to them as-is. */
export class PortalError extends Error {}

export function ageFrom(birthYear: number, birthMonth: number, at = new Date()): number {
  return at.getFullYear() - birthYear - (at.getMonth() + 1 < birthMonth ? 1 : 0);
}
