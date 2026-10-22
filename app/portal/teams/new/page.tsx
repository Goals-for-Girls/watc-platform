import type { Metadata } from "next";
import Link from "next/link";
import { createTeam } from "../../actions";
import styles from "../../portal.module.css";

export const metadata: Metadata = { title: "Add a team" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewTeamPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <>
      <p className={styles.crumbs}>
        <Link href="/portal/">Your teams</Link>
      </p>
      <h1 className={styles.h1}>Add a team</h1>
      {error && <p className={styles.error}>{error}</p>}
      <form action={createTeam} className={styles.form} style={{ marginTop: 24 }}>
        <label className={styles.field}>
          <span>Team name</span>
          <input type="text" name="name" required maxLength={60} />
          <span className={styles.hint}>The name the girls chose. It may appear on the public map later.</span>
        </label>
        <label className={styles.field}>
          <span>Town or district</span>
          <input type="text" name="place" required maxLength={60} />
          <span className={styles.hint}>Town or district only. Never a school, street or meeting place.</span>
        </label>
        <label className={styles.check}>
          <input type="checkbox" name="isSolo" />
          <span>This is one girl working on her own, with me as her trusted adult</span>
        </label>
        <div>
          <button type="submit" className="button">
            Add team
          </button>
        </div>
      </form>
    </>
  );
}
