"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/portal/store";
import { supabaseConfigured, supabaseForRequest } from "@/lib/portal/supabase-server";
import {
  PortalError,
  type ConsentGiver,
  type ConsentKind,
  type ConsentMethod,
  type ContactMode,
} from "@/lib/portal/types";

const CONSENT_KINDS: ConsentKind[] = ["participation", "media", "future_contact", "research"];
const GIVERS: ConsentGiver[] = ["parent_or_guardian", "participant_adult"];
const METHODS: ConsentMethod[] = ["paper_form", "whatsapp_confirmation", "web_form"];

function text(form: FormData, key: string, max = 120): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

function required(form: FormData, key: string, label: string, max = 120): string {
  const v = text(form, key, max);
  if (!v) throw new PortalError(`Please fill in ${label}.`);
  return v;
}

function oneOf<T extends string>(value: string, allowed: T[], label: string): T {
  if (!allowed.includes(value as T)) throw new PortalError(`Please choose ${label}.`);
  return value as T;
}

function phone(value: string, label: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    throw new PortalError(`${label} must start with + and the country code, for example +91 98765 43210.`);
  }
  return cleaned;
}

/**
 * Run a change, then go to `next`. Rule violations come back to `back` as a
 * readable message instead of an error page.
 */
async function run(back: string, next: string | ((result: string | void) => string), change: () => Promise<string | void>) {
  let result: string | void = undefined;
  let message: string | null = null;
  try {
    result = await change();
  } catch (e) {
    message = e instanceof PortalError ? e.message : "Something went wrong. Please try again.";
    if (!(e instanceof PortalError)) console.error("Portal action failed:", e instanceof Error ? e.name : "unknown");
  }
  if (message) redirect(`${back}?error=${encodeURIComponent(message)}`);
  revalidatePath("/portal", "layout");
  redirect(typeof next === "function" ? next(result) : next);
}

export async function createTeam(form: FormData) {
  await run("/portal/teams/new/", (id) => `/portal/teams/${id}/`, async () => {
    const store = await getStore();
    return store.createTeam({
      name: required(form, "name", "the team name", 60),
      place: required(form, "place", "the town or district", 60),
      isSolo: form.get("isSolo") === "on",
    });
  });
}

export async function addGirl(form: FormData) {
  const teamId = required(form, "teamId", "the team");
  await run(`/portal/teams/${teamId}/add/`, (id) => `/portal/girls/${id}/?added=1`, async () => {
    const contactMode = oneOf(text(form, "contactMode"), ["own_whatsapp", "via_coach"] as ContactMode[], "how we contact her");
    const store = await getStore();
    return store.addGirl(teamId, {
      firstName: required(form, "firstName", "her first name", 40),
      birthYear: Number(required(form, "birthYear", "her birth year")),
      birthMonth: Number(required(form, "birthMonth", "her birth month")),
      contactMode,
      whatsapp: contactMode === "own_whatsapp" ? phone(required(form, "whatsapp", "her WhatsApp number"), "Her WhatsApp number") : undefined,
      guardianName: required(form, "guardianName", "the parent or guardian's name", 60),
      guardianRelation: required(form, "guardianRelation", "how they are related", 30),
      guardianPhone: phone(text(form, "guardianPhone"), "The guardian's phone number"),
    });
  });
}

export async function recordConsent(form: FormData) {
  const participantId = required(form, "participantId", "the girl");
  const back = `/portal/girls/${participantId}/`;
  await run(back, back, async () => {
    if (form.get("confirm") !== "on") throw new PortalError("Please confirm you have the signed form or message on file.");
    const store = await getStore();
    await store.recordConsent(participantId, {
      kind: oneOf(text(form, "kind"), CONSENT_KINDS, "the type of consent"),
      givenBy: oneOf(text(form, "givenBy"), GIVERS, "who gave consent"),
      method: oneOf(text(form, "method"), METHODS, "how consent was given"),
      policyVersion: required(form, "policyVersion", "the form version", 20),
      evidenceRef: text(form, "evidenceRef", 120) || undefined,
    });
  });
}

export async function withdrawConsent(form: FormData) {
  const participantId = required(form, "participantId", "the girl");
  const back = `/portal/girls/${participantId}/`;
  await run(back, back, async () => {
    const store = await getStore();
    await store.withdrawConsent(participantId, oneOf(text(form, "kind"), CONSENT_KINDS, "the type of consent"));
  });
}

export async function approvePlan(form: FormData) {
  const projectId = required(form, "projectId", "the project");
  const back = `/portal/projects/${projectId}/`;
  await run(back, back, async () => {
    const store = await getStore();
    await store.approvePlan(projectId, required(form, "planId", "the plan"));
  });
}

export async function logMilestone(form: FormData) {
  const projectId = required(form, "projectId", "the project");
  const back = `/portal/projects/${projectId}/`;
  await run(back, back, async () => {
    const kind = oneOf(text(form, "kind"), ["first_action", "completed"] as ("first_action" | "completed")[], "a milestone");
    const store = await getStore();
    await store.logMilestone(projectId, kind, text(form, "note", 280) || undefined);
  });
}

/* ---------------- sign-in (live mode only) ---------------- */

/** Supabase's answers when an address has no account; shown as "check your email" like any other. */
const NOT_REGISTERED = new Set(["signup_disabled", "otp_disabled", "user_not_found"]);

export async function sendSignInLink(form: FormData) {
  if (!supabaseConfigured()) redirect("/portal/");
  const email = text(form, "email", 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`/portal/login/?error=${encodeURIComponent("Please enter a valid email address.")}`);
  }
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const supabase = await supabaseForRequest();
  // shouldCreateUser: false — only people Goals for Girls has invited can sign in.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/portal/auth/callback/` },
  });
  if (error) {
    // Logged without the address, for diagnosing delivery problems.
    console.error("[portal] sign-in link not sent:", error.code ?? error.status, error.message);
    // Rate limits and outages are worth telling the person about. "Not
    // registered" is not: the page shows the same message either way, so it
    // cannot be used to find out who is a coach.
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      redirect(`/portal/login/?error=${encodeURIComponent("Too many sign-in emails have been sent in the last hour. Please wait a few minutes and try again.")}`);
    }
    if (!NOT_REGISTERED.has(error.code ?? "")) {
      redirect(`/portal/login/?error=${encodeURIComponent("We couldn't send the sign-in email just now. Please try again in a few minutes.")}`);
    }
  }
  redirect("/portal/login/?sent=1");
}

export async function signOut() {
  if (supabaseConfigured()) {
    const supabase = await supabaseForRequest();
    await supabase.auth.signOut();
  }
  redirect("/portal/login/");
}
