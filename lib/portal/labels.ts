import type { ConsentGiver, ConsentKind, ConsentMethod, EventKind, ParticipantStatus, ProjectStatus } from "./types";

export const STATUS_LABEL: Record<ParticipantStatus, string> = {
  pending_consent: "Waiting for consent",
  active: "Active",
  paused: "Paused",
  withdrawn: "Withdrawn",
  alumna: "Alumna",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Getting started",
  plan_submitted: "Plan waiting for you",
  plan_approved: "Plan approved",
  active: "Under way",
  completed: "Completed",
  verified: "Verified",
  abandoned: "Stopped",
};

export const EVENT_LABEL: Record<EventKind, string> = {
  registered: "Project started",
  goal_confirmed: "UN goal chosen",
  plan_submitted: "Plan sent for approval",
  plan_approved: "Plan approved",
  first_action: "First action taken",
  check_in: "Check-in",
  completed: "Project completed",
  verified: "Verified by Goals for Girls",
  published: "Story published",
  abandoned: "Project stopped",
};

export const CONSENT_LABEL: Record<ConsentKind, string> = {
  participation: "Taking part",
  media: "Photos and stories",
  future_contact: "Contact after the project",
  research: "Research and evaluation",
};

export const CONSENT_HELP: Record<ConsentKind, string> = {
  participation: "Required before she can take part or receive any message.",
  media: "Required before her photo or her team's story is published.",
  future_contact: "Lets Goals for Girls contact her later, for alumni programs and follow-up studies.",
  research: "Lets her survey answers be used in program evaluation.",
};

export const GIVER_LABEL: Record<ConsentGiver, string> = {
  parent_or_guardian: "Parent or guardian",
  participant_adult: "She gave it herself (18 or over)",
};

export const METHOD_LABEL: Record<ConsentMethod, string> = {
  paper_form: "Signed paper form",
  whatsapp_confirmation: "WhatsApp confirmation from the guardian's number",
  web_form: "Online form",
};

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
