/**
 * The conversation flow: a small state machine. Each call takes the current
 * state and what the girl just did, and returns the bot's reply plus the new
 * state. It stores nothing; the caller keeps the state.
 */
import { countryName, getProject } from "@/lib/content";
import { sdg } from "@/lib/sdgs";
import type { Brain } from "./brain";
import type { BotInput, BotMessage, BotState, BotTurn, ReplyButton, StaffEvent, Step } from "./types";

const QUESTIONS: Partial<Record<Step, string>> = {
  team_name: "What's your team called?",
  issue: "What's a problem in your community that you want to change? Tell me in your own words.",
  affected: "Who is affected most by this problem?",
  action: "What's one small thing your team could do in the next two weeks to get started?",
};

const START_OVER: ReplyButton = { id: "restart", label: "Start over" };

class Turn {
  messages: BotMessage[] = [];
  replies: ReplyButton[] = [];
  staff: StaffEvent[] = [];
  constructor(public state: BotState) {}
  say(text: string) {
    this.messages.push({ kind: "text", text });
  }
  note(text: string) {
    this.messages.push({ kind: "notice", text });
  }
  ask(step: Step) {
    this.state.step = step;
    const q = QUESTIONS[step];
    if (q) this.say(q);
  }
}

function welcome(t: Turn) {
  t.state = { step: "track" };
  t.say(
    "Hi! I'm the We Are the Change bot from Goals for Girls. I help girls turn something they care about into a project for their community.",
  );
  t.note("A real person on our team checks this chat to keep it safe.");
  t.say("Are you working with a team, or on your own?");
  t.replies = [
    { id: "team", label: "We're a team" },
    { id: "solo", label: "I'm on my own" },
  ];
}

export async function handle(state: BotState | undefined, input: BotInput, brain: Brain): Promise<BotTurn> {
  const t = new Turn(state ? { ...state } : { step: "welcome" });
  const done = (): BotTurn => finish(t, brain);

  if (input.type === "start" || !state || (input.type === "button" && input.id === "restart")) {
    welcome(t);
    return done();
  }

  // Once a safety concern is raised, the bot stops the project flow.
  if (t.state.step === "paused") {
    t.say("Someone from the Goals for Girls safety team will follow up with you soon, through an adult you can trust. You can start over at any time.");
    t.replies = [START_OVER];
    return done();
  }

  /* ---------------- buttons ---------------- */
  if (input.type === "button") {
    switch (t.state.step) {
      case "track":
        if (input.id === "team") {
          t.state.track = "team";
          t.ask("team_name");
        } else {
          t.state.track = "solo";
          t.note(
            "In the full version, a trusted adult (a coach, teacher or parent) joins you before you start. For this demo, let's keep going.",
          );
          t.ask("issue");
        }
        return done();

      case "confirm_goal":
        if (input.id === "yes") return showMatches(t, brain);
        {
          const others = (t.state.candidates ?? []).slice(1, 3);
          t.state.step = "pick_goal";
          t.say(others.length ? "Which of these fits better?" : "No problem. Tell me a bit more about the problem.");
          if (others.length) {
            t.messages.push({ kind: "goals", goals: others });
            t.replies = [
              ...others.map((g) => ({ id: `goal-${g.n}`, label: `Goal ${g.n}` })),
              { id: "describe", label: "Something else" },
            ];
          } else {
            t.state.step = "issue";
          }
        }
        return done();

      case "pick_goal":
        if (input.id.startsWith("goal-")) {
          t.state.goal = Number(input.id.slice(5));
          return showMatches(t, brain);
        }
        t.ask("issue");
        return done();

      case "matched":
        if (input.id === "plan") {
          t.ask("affected");
          return done();
        }
        break;
    }
    // A button that does not belong to this step: repeat where we are.
    return repeat(t, brain);
  }

  /* ---------------- typed text ---------------- */
  const raw = input.text.trim().slice(0, 400);
  if (!raw) return repeat(t, brain);

  const question = QUESTIONS[t.state.step] ?? "Please choose one of the buttons.";
  const check = await brain.screen(raw, question);
  // Moderators see the message as stored: contact details already hidden.
  const quote = `"${check.cleaned.length > 70 ? `${check.cleaned.slice(0, 70)}…` : check.cleaned}"`;

  if (check.category === "distress_or_disclosure") {
    t.state = { step: "paused" };
    t.say(
      "Thank you for telling me. What you shared matters, and you don't have to deal with it alone. I'm a bot, so I've passed your message to the Goals for Girls safety team. Someone from the team will follow up with you soon, through an adult you can trust.",
    );
    t.say(
      "If you are in danger right now, please tell an adult you trust, or contact your local emergency number or child helpline.",
    );
    t.staff.push({ level: "urgent", text: `${quote} Possible safeguarding concern, sent to the safeguarding lead. ${check.reason}` });
    t.replies = [START_OVER];
    return done();
  }

  if (check.category === "inappropriate") {
    t.staff.push({ level: "flag", text: `Message held back, not shown to anyone. ${check.reason}` });
    t.say("Let's keep this chat kind and about your project.");
    return repeat(t, brain, false);
  }

  if (check.category === "personal_info") {
    t.staff.push({ level: "flag", text: `${quote} Personal details hidden before saving. ${check.reason}` });
    t.note("Please don't share phone numbers, addresses, school names or full names here. I've hidden them.");
  } else if (check.category === "off_topic") {
    t.staff.push({ level: "info", text: `${quote} Off-topic reply. ${check.reason}` });
    t.say("I can only help with your community project.");
    return repeat(t, brain, false);
  } else {
    t.staff.push({ level: "ok", text: `${quote} Nothing to flag.` });
  }

  const text = check.cleaned;

  switch (t.state.step) {
    case "team_name":
      if (check.category === "personal_info") {
        t.say("Just your team's name is perfect.");
        t.ask("team_name");
        return done();
      }
      t.state.team = text.slice(0, 40);
      t.say(`Nice to meet you, ${t.state.team}!`);
      t.note("In the full version, your coach signs your team up first and a parent or guardian gives permission.");
      t.ask("issue");
      return done();

    case "issue":
    case "pick_goal": {
      t.state.issue = text;
      const mapped = await brain.mapGoals(text);
      if (!mapped.understood) {
        t.state.step = "issue";
        t.say(mapped.clarify ?? "Can you tell me a bit more?");
        return done();
      }
      t.state.candidates = mapped.goals;
      t.state.goal = mapped.goals[0].n;
      t.state.step = "confirm_goal";
      t.say("That connects to this UN goal:");
      t.messages.push({ kind: "goals", goals: mapped.goals.slice(0, 1) });
      t.say(`Does goal ${t.state.goal}, ${sdg(t.state.goal).name.toLowerCase()}, sound right?`);
      t.replies = [
        { id: "yes", label: "Yes, that's it" },
        { id: "no", label: "Not quite" },
      ];
      return done();
    }

    case "affected":
      t.state.affected = text;
      t.ask("action");
      return done();

    case "action": {
      t.state.action = text;
      const plan = await brain.draftPlan({
        team: t.state.team,
        issue: t.state.issue ?? "",
        goal: t.state.goal ?? 0,
        affected: t.state.affected ?? "",
        action: text,
      });
      t.say("Here's a first draft of your plan:");
      t.messages.push({ kind: "plan", plan });
      t.note("This draft goes to your coach to review before you start. Nothing happens until they say yes.");
      t.staff.push({ level: "info", text: "Plan draft sent to the team's coach for approval." });
      t.state.step = "done";
      t.replies = [START_OVER];
      return done();
    }

    default:
      return repeat(t, brain, false);
  }
}

async function showMatches(t: Turn, brain: Brain): Promise<BotTurn> {
  const goal = t.state.goal ?? 0;
  const found = await brain.match(t.state.issue ?? "", goal);
  const items = found.flatMap((m) => {
    const p = getProject(m.slug);
    return p
      ? [{ slug: p.slug, title: p.title, place: p.place, country: countryName(p.country), sdg: p.sdg, why: m.why }]
      : [];
  });
  t.say(items.length ? "Here are girls who worked on something similar:" : "I couldn't find a close match yet, but you could be the first!");
  if (items.length) t.messages.push({ kind: "projects", items });
  t.say("Want to start planning your own project?");
  t.state.step = "matched";
  t.replies = [{ id: "plan", label: "Start planning" }, START_OVER];
  return finish(t, brain);
}

function finish(t: Turn, brain: Brain): BotTurn {
  if (brain.degraded) {
    t.staff.push({ level: "info", text: "AI service unavailable for part of this turn, so keyword rules were used." });
  }
  return { messages: t.messages, replies: t.replies, staff: t.staff, state: t.state, mode: brain.mode };
}

/** Repeat the current question, with its buttons. */
async function repeat(t: Turn, brain: Brain, prefix = true): Promise<BotTurn> {
  const step = t.state.step;
  if (step === "track") {
    if (prefix) t.say("Please choose one:");
    t.replies = [
      { id: "team", label: "We're a team" },
      { id: "solo", label: "I'm on my own" },
    ];
  } else if (step === "confirm_goal") {
    if (prefix) t.say("Please choose one:");
    t.replies = [
      { id: "yes", label: "Yes, that's it" },
      { id: "no", label: "Not quite" },
    ];
  } else if (step === "matched") {
    if (prefix) t.say("Please choose one:");
    t.replies = [{ id: "plan", label: "Start planning" }, START_OVER];
  } else if (step === "done") {
    t.say("Your plan is with your coach. You can start over to try another idea.");
    t.replies = [START_OVER];
  } else if (QUESTIONS[step]) {
    t.say(QUESTIONS[step] as string);
  } else {
    t.replies = [START_OVER];
  }
  return finish(t, brain);
}
