/**
 * Bot endpoint for the web demo.
 *
 * Privacy: this route stores nothing and logs no message text. The
 * conversation state lives in the visitor's browser and is sent back with
 * each turn. The real WhatsApp version will store conversations in the data
 * core under the consent and retention rules in the build recommendation.
 */
import { getBrain } from "@/lib/bot/brain";
import { handle } from "@/lib/bot/flow";
import type { BotInput, BotState, Step } from "@/lib/bot/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STEPS: Step[] = [
  "welcome", "track", "team_name", "issue", "confirm_goal", "pick_goal",
  "matched", "affected", "action", "done", "paused",
];

/* A small per-instance limit to protect the AI budget during public demos. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === "string" ? v.slice(0, max) : undefined;
}

/** Accept only the fields we know, with sane lengths. */
function parseState(v: unknown): BotState | undefined {
  if (!v || typeof v !== "object") return undefined;
  const s = v as Record<string, unknown>;
  if (!STEPS.includes(s.step as Step)) return undefined;
  const goal = typeof s.goal === "number" && s.goal >= 1 && s.goal <= 17 ? Math.round(s.goal) : undefined;
  const candidates = Array.isArray(s.candidates)
    ? s.candidates
        .filter((c): c is { n: number; why: string } => !!c && typeof c.n === "number" && typeof c.why === "string")
        .slice(0, 3)
        .map((c) => ({ n: Math.min(17, Math.max(1, Math.round(c.n))), why: c.why.slice(0, 200) }))
    : undefined;
  return {
    step: s.step as Step,
    track: s.track === "team" || s.track === "solo" ? s.track : undefined,
    team: str(s.team, 40),
    issue: str(s.issue, 400),
    candidates,
    goal,
    affected: str(s.affected, 400),
    action: str(s.action, 400),
  };
}

function parseInput(v: unknown): BotInput | undefined {
  if (!v || typeof v !== "object") return undefined;
  const i = v as Record<string, unknown>;
  if (i.type === "start") return { type: "start" };
  if (i.type === "button" && typeof i.id === "string") return { type: "button", id: i.id.slice(0, 40) };
  if (i.type === "text" && typeof i.text === "string") return { type: "text", text: i.text.slice(0, 400) };
  return undefined;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) {
    return Response.json({ error: "Too many messages. Please wait a minute and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const input = parseInput(b.input);
  if (!input) return Response.json({ error: "Invalid request." }, { status: 400 });

  const turn = await handle(parseState(b.state), input, getBrain());
  return Response.json(turn, { headers: { "Cache-Control": "no-store" } });
}
