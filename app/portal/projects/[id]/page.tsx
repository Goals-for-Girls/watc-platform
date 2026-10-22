import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EVENT_LABEL, PROJECT_STATUS_LABEL, shortDate } from "@/lib/portal/labels";
import { getStore } from "@/lib/portal/store";
import { sdg } from "@/lib/sdgs";
import { approvePlan, logMilestone } from "../../actions";
import styles from "../../portal.module.css";

export const metadata: Metadata = { title: "Project" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function ProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const store = await getStore();
  const p = await store.project(id);
  if (!p) notFound();
  const latest = p.plans[0];
  const goal = p.sdg ? sdg(p.sdg) : null;
  const started = p.events.some((e) => e.kind === "first_action");
  const finished = p.events.some((e) => e.kind === "completed");

  return (
    <>
      <p className={styles.crumbs}>
        <Link href={`/portal/teams/${p.teamId}/`}>{p.teamName}</Link>
      </p>
      <div className={styles.row}>
        <div>
          <h1 className={styles.h1}>{p.title}</h1>
          <p className={styles.sub}>
            {goal ? `UN goal ${goal.n}: ${goal.name}` : "UN goal not chosen yet"}. {p.place}.
          </p>
        </div>
        <span className={`${styles.pill} ${styles[`pill_${p.status}`]}`}>{PROJECT_STATUS_LABEL[p.status]}</span>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.split}>
        <section>
          <h2 className={styles.h2}>
            {latest ? `Plan, version ${latest.version}` : "Plan"}
          </h2>
          {!latest ? (
            <p className={styles.empty}>The team hasn&apos;t sent a plan yet.</p>
          ) : (
            <div className={styles.plan}>
              <dl>
                <dt>The problem</dt>
                <dd>{latest.content.problem}</dd>
                <dt>What will change</dt>
                <dd>{latest.content.goal}</dd>
                <dt>Who to talk to</dt>
                <dd>{latest.content.whoToTalkTo}</dd>
                <dt>First step</dt>
                <dd>{latest.content.firstStep}</dd>
                <dt>Your first check-in question</dt>
                <dd>{latest.content.checkIn}</dd>
              </dl>
              <div className={styles.planFoot}>
                <span className={styles.hint}>
                  Drafted {latest.draftedBy === "ai" ? "with the bot" : `by the ${latest.draftedBy}`}, sent{" "}
                  {shortDate(latest.submittedAt)}
                  {latest.approvedAt ? `. Approved ${shortDate(latest.approvedAt)}.` : "."}
                </span>
                {!latest.approvedAt && (
                  <form action={approvePlan}>
                    <input type="hidden" name="projectId" value={p.id} />
                    <input type="hidden" name="planId" value={latest.id} />
                    <button type="submit" className="button">
                      Approve this plan
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
          {latest && !latest.approvedAt && (
            <p className={styles.hint} style={{ marginTop: 10, maxWidth: 640 }}>
              Check the first step is safe and that an adult will be there. If it needs changes, talk it through
              with the team; they can send a new version through the bot.
            </p>
          )}

          {p.checkIns.length > 0 && (
            <>
              <h2 className={styles.h2}>Check-ins</h2>
              <ul className={styles.consents}>
                {p.checkIns.map((c, i) => (
                  <li key={i}>
                    <span>
                      <strong>{c.wave === "m3" ? "3-month" : c.wave === "m6" ? "6-month" : c.wave === "m12" ? "12-month" : "Check-in"}</strong>{" "}
                      due {shortDate(c.dueOn)}
                    </span>
                    <span className={c.respondedAt ? styles.yes : styles.no}>
                      {c.respondedAt ? `Answered ${shortDate(c.respondedAt)}` : "Not answered yet"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside>
          {latest?.approvedAt && !finished && (
            <div className={styles.side}>
              <h2 className={styles.h2} style={{ marginTop: 0 }}>
                Log progress
              </h2>
              <form action={logMilestone} className={styles.form}>
                <input type="hidden" name="projectId" value={p.id} />
                <input type="hidden" name="kind" value={started ? "completed" : "first_action"} />
                <label className={styles.field}>
                  <span>{started ? "What did the project achieve?" : "What did the team do first?"}</span>
                  <textarea name="note" rows={3} maxLength={280} />
                  <span className={styles.hint}>No names, schools or addresses.</span>
                </label>
                <div>
                  <button type="submit" className="button">
                    {started ? "Mark project completed" : "Log first action"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <h2 className={styles.h2}>Timeline</h2>
          <ol className={styles.timeline}>
            {p.events.map((e, i) => (
              <li key={i}>
                <strong>{EVENT_LABEL[e.kind]}</strong>
                {e.note && <span style={{ display: "block" }}>{e.note}</span>}
                <span className={styles.when}>{shortDate(e.occurredAt)}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
