import Link from "next/link";
import { getStore } from "@/lib/portal/store";
import styles from "./portal.module.css";

const TODO_TAG = { consent: "Consent", plan: "Plan", checkin: "Check-in", reconsent: "Turning 18" };

export default async function PortalHome() {
  const store = await getStore();
  const me = await store.me();
  const { teams, todos } = await store.dashboard();

  return (
    <>
      <h1 className={styles.h1}>Hello{me ? `, ${me.displayName.split(" ")[0]}` : ""}</h1>
      <p className={styles.sub}>
        {todos.length
          ? `${todos.length} thing${todos.length > 1 ? "s need" : " needs"} your attention.`
          : "Nothing needs your attention right now."}
      </p>

      {todos.length > 0 && (
        <>
          <h2 className={styles.h2}>To do</h2>
          <ul className={styles.todos}>
            {todos.map((t, i) => (
              <li key={i}>
                <Link href={t.href}>
                  <span className={`${styles.tag} ${styles[`tag_${t.kind}`]}`}>{TODO_TAG[t.kind]}</span>
                  {t.text}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.row}>
        <h2 className={styles.h2}>Your teams</h2>
        <Link href="/portal/teams/new/" className="button quiet">
          Add a team
        </Link>
      </div>
      {teams.length === 0 ? (
        <p className={styles.empty}>
          You have no teams yet. Add your first team, then add the girls in it and record their parents&apos;
          consent.
        </p>
      ) : (
        <ul className={styles.teams}>
          {teams.map((t) => (
            <li key={t.id}>
              <Link href={`/portal/teams/${t.id}/`} className={styles.team}>
                <h3>{t.name}</h3>
                <span className="muted">
                  {t.place}
                  {t.isSolo ? ", working on her own" : ""}
                </span>
                <div className={styles.stats}>
                  <span>
                    <strong>{t.active}</strong>active
                  </span>
                  <span>
                    <strong>{t.pendingConsent}</strong>waiting for consent
                  </span>
                  <span>
                    <strong>{t.projects}</strong>project{t.projects === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
