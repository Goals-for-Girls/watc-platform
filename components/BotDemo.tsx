"use client";

import { useEffect, useRef, useState } from "react";
import type { BotMessage, BotState, BotTurn, ReplyButton, StaffEvent } from "@/lib/bot/types";
import { SDGS } from "@/lib/sdgs";
import styles from "./BotDemo.module.css";

type Line = { from: "bot"; msg: BotMessage } | { from: "girl"; text: string };

const goalOf = (n: number) => SDGS.find((g) => g.n === n) ?? SDGS[0];

const STAFF_LABEL: Record<StaffEvent["level"], string> = {
  ok: "Checked",
  flag: "Flagged",
  urgent: "Urgent",
  info: "Note",
};

export function BotDemo() {
  const [lines, setLines] = useState<Line[]>([]);
  const [replies, setReplies] = useState<ReplyButton[]>([]);
  const [staff, setStaff] = useState<StaffEvent[]>([]);
  const [state, setState] = useState<BotState | undefined>();
  const [mode, setMode] = useState<BotTurn["mode"] | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  async function send(input: { type: "start" } | { type: "button"; id: string } | { type: "text"; text: string }) {
    setBusy(true);
    setError(null);
    setReplies([]);
    try {
      const res = await fetch("/api/bot/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: input.type === "start" ? undefined : state, input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The bot couldn't answer. Try again.");
      const turn = data as BotTurn;
      setLines((l) => [...l, ...turn.messages.map((msg) => ({ from: "bot" as const, msg }))]);
      setReplies(turn.replies);
      setStaff((s) => [...s, ...turn.staff]);
      setState(turn.state);
      setMode(turn.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The bot couldn't answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send({ type: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [lines, busy, replies]);

  function tap(r: ReplyButton) {
    if (busy) return;
    if (r.id === "restart") {
      setLines([]);
      setStaff([]);
      setState(undefined);
      void send({ type: "start" });
      return;
    }
    setLines((l) => [...l, { from: "girl", text: r.label }]);
    void send({ type: "button", id: r.id });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setLines((l) => [...l, { from: "girl", text }]);
    void send({ type: "text", text });
  }

  return (
    <div className={styles.layout}>
      <section className={styles.phone} aria-label="Chat with the We Are the Change bot">
        <header className={styles.bar}>
          <span className={styles.avatar} aria-hidden="true">
            W
          </span>
          <span>
            <strong>We Are the Change</strong>
            <span className={styles.barNote}>Checked by the Goals for Girls team</span>
          </span>
        </header>

        <div className={styles.chat} ref={scroller} aria-live="polite">
          {lines.map((line, i) =>
            line.from === "girl" ? (
              <p key={i} className={`${styles.bubble} ${styles.girl}`}>
                {line.text}
              </p>
            ) : (
              <BotLine key={i} msg={line.msg} />
            ),
          )}
          {busy && (
            <p className={`${styles.bubble} ${styles.bot} ${styles.typing}`} aria-label="The bot is typing">
              <span />
              <span />
              <span />
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {replies.length > 0 && (
          <div className={styles.replies}>
            {replies.map((r) => (
              <button key={r.id} type="button" onClick={() => tap(r)} disabled={busy}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        <form className={styles.compose} onSubmit={submit}>
          <label htmlFor="bot-input" className="visually-hidden">
            Your message
          </label>
          <input
            id="bot-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={400}
            placeholder="Type a message"
            autoComplete="off"
          />
          <button type="submit" disabled={busy || !draft.trim()}>
            Send
          </button>
        </form>
      </section>

      <aside className={styles.staff} aria-labelledby="staff-heading">
        <h2 id="staff-heading">What our team sees</h2>
        <p className={styles.staffLead}>
          Every message is checked before anything else happens. Concerns go straight to a person.
        </p>
        {mode && (
          <p className={styles.mode}>
            {mode === "ai"
              ? "Running on Claude AI for checking, goal matching and plan drafts."
              : "Offline demo mode: answers come from simple keyword rules. Add an Anthropic API key to run the AI version."}
          </p>
        )}
        {staff.length === 0 ? (
          <p className={styles.empty}>Checks on each message will appear here as you chat.</p>
        ) : (
          <ol className={styles.events}>
            {staff.map((ev, i) => (
              <li key={i} className={styles[ev.level]}>
                <span className={styles.badge}>{STAFF_LABEL[ev.level]}</span>
                {ev.text}
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}

function BotLine({ msg }: { msg: BotMessage }) {
  switch (msg.kind) {
    case "text":
      return <p className={`${styles.bubble} ${styles.bot}`}>{msg.text}</p>;
    case "notice":
      return <p className={styles.notice}>{msg.text}</p>;
    case "goals":
      return (
        <div className={styles.cards}>
          {msg.goals.map((g) => {
            const goal = goalOf(g.n);
            return (
              <div key={g.n} className={styles.goal} style={{ background: goal.color, color: goal.ink }}>
                <span className={styles.goalNumber}>{goal.n}</span>
                <span>
                  <strong>{goal.name}</strong>
                  <span className={styles.goalWhy}>{g.why}</span>
                </span>
              </div>
            );
          })}
        </div>
      );
    case "projects":
      return (
        <div className={styles.cards}>
          {msg.items.map((p) => {
            const goal = goalOf(p.sdg);
            return (
              <a
                key={p.slug}
                href={`/projects/${p.slug}/`}
                target="_blank"
                rel="noreferrer"
                className={styles.project}
                style={{ ["--goal" as string]: goal.color }}
              >
                <strong>{p.title}</strong>
                <span className={styles.projectMeta}>
                  {p.place}, {p.country}
                </span>
                <span>{p.why}</span>
                <span className={styles.projectLink}>Read their story</span>
              </a>
            );
          })}
        </div>
      );
    case "plan":
      return (
        <div className={styles.plan}>
          <strong className={styles.planTitle}>Draft plan</strong>
          <dl>
            <dt>The problem</dt>
            <dd>{msg.plan.problem}</dd>
            <dt>What will change</dt>
            <dd>{msg.plan.goal}</dd>
            <dt>Who to talk to</dt>
            <dd>{msg.plan.whoToTalkTo}</dd>
            <dt>Your first step</dt>
            <dd>{msg.plan.firstStep}</dd>
            <dt>Your coach will ask</dt>
            <dd>{msg.plan.checkIn}</dd>
          </dl>
        </div>
      );
  }
}
