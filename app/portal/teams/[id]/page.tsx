import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECT_STATUS_LABEL, STATUS_LABEL, shortDate } from "@/lib/portal/labels";
import { getStore } from "@/lib/portal/store";
import { sdg } from "@/lib/sdgs";
import styles from "../../portal.module.css";

export const metadata: Metadata = { title: "Team" };

type Props = { params: Promise<{ id: string }> };

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const store = await getStore();
  const detail = await store.team(id);
  if (!detail) notFound();
  const { team, roster, projects } = detail;

  return (
    <>
      <p className={styles.crumbs}>
        <Link href="/portal/">Your teams</Link>
      </p>
      <div className={styles.row}>
        <div>
          <h1 className={styles.h1}>{team.name}</h1>
          <p className={styles.sub}>
            {team.place}. {team.active} active, {team.pendingConsent} waiting for consent.
          </p>
        </div>
        <Link href={`/portal/teams/${team.id}/add/`} className="button">
          Add a girl
        </Link>
      </div>

      <h2 className={styles.h2}>Girls</h2>
      {roster.length === 0 ? (
        <p className={styles.empty}>No girls on this team yet. Add each girl, then record her parent&apos;s consent.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Status</th>
                <th>Taking part</th>
                <th>Photos and stories</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((g) => (
                <tr key={g.participantId}>
                  <td>
                    <Link href={`/portal/girls/${g.participantId}/`}>{g.firstName}</Link>
                  </td>
                  <td>{g.age}</td>
                  <td>
                    <span className={`${styles.pill} ${styles[`pill_${g.status}`]}`}>{STATUS_LABEL[g.status]}</span>
                  </td>
                  <td className={g.participation ? styles.yes : styles.no}>{g.participation ? "Consent on file" : "Needed"}</td>
                  <td className={g.media ? styles.yes : "muted"}>{g.media ? "Consent on file" : "Not given"}</td>
                  <td>{g.contactMode === "own_whatsapp" ? "Her WhatsApp" : "Through you"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.hint} style={{ marginTop: 10 }}>
        Names are shown only to you and Goals for Girls staff. Each time this list opens, it is logged.
      </p>

      <h2 className={styles.h2}>Projects</h2>
      {projects.length === 0 ? (
        <p className={styles.empty}>
          No projects yet. Projects start when the team chats with the We Are the Change bot on WhatsApp.
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project</th>
                <th>UN goal</th>
                <th>Stage</th>
                <th>Last change</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/portal/projects/${p.id}/`}>{p.title}</Link>
                  </td>
                  <td>{p.sdg ? `${p.sdg}. ${sdg(p.sdg).name}` : "Not chosen yet"}</td>
                  <td>
                    <span className={`${styles.pill} ${styles[`pill_${p.status}`]}`}>{PROJECT_STATUS_LABEL[p.status]}</span>
                  </td>
                  <td>{shortDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
