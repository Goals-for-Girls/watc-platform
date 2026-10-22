/**
 * Bot message and state types.
 *
 * Message kinds deliberately mirror what WhatsApp can show: text, up to three
 * reply buttons, and simple cards. The same flow can therefore drive the web
 * demo now and the WhatsApp provider (Turn.io or Glific) later.
 */

export type Step =
  | "welcome"
  | "track"
  | "team_name"
  | "issue"
  | "confirm_goal"
  | "pick_goal"
  | "matched"
  | "affected"
  | "action"
  | "done"
  | "paused";

export interface BotState {
  step: Step;
  track?: "team" | "solo";
  team?: string;
  issue?: string;
  /** Candidate goals from the mapping step, best first. */
  candidates?: { n: number; why: string }[];
  goal?: number;
  affected?: string;
  action?: string;
}

export type BotInput = { type: "start" } | { type: "button"; id: string } | { type: "text"; text: string };

export interface ProjectCard {
  slug: string;
  title: string;
  place: string;
  country: string;
  sdg: number;
  why: string;
}

export interface PlanDraft {
  problem: string;
  goal: string;
  whoToTalkTo: string;
  firstStep: string;
  checkIn: string;
}

export type BotMessage =
  | { kind: "text"; text: string }
  | { kind: "notice"; text: string }
  | { kind: "goals"; goals: { n: number; why: string }[] }
  | { kind: "projects"; items: ProjectCard[] }
  | { kind: "plan"; plan: PlanDraft };

export interface ReplyButton {
  id: string;
  label: string;
}

/** What a moderator would see in the staff inbox for this turn. */
export interface StaffEvent {
  level: "ok" | "flag" | "urgent" | "info";
  text: string;
}

export interface BotTurn {
  messages: BotMessage[];
  /** At most three, matching WhatsApp's reply-button limit. */
  replies: ReplyButton[];
  staff: StaffEvent[];
  state: BotState;
  mode: "ai" | "offline";
}

export type ScreenCategory = "ok" | "personal_info" | "distress_or_disclosure" | "inappropriate" | "off_topic";

export interface ScreenResult {
  category: ScreenCategory;
  reason: string;
  /** The text with phone numbers, emails and links removed. */
  cleaned: string;
}
