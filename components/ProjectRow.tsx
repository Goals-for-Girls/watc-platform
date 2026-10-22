import Link from "next/link";
import { countryName, type Project } from "@/lib/content";
import { sdg } from "@/lib/sdgs";
import styles from "./ProjectRow.module.css";

export function ProjectRow({ project }: { project: Project }) {
  const g = sdg(project.sdg);
  return (
    <li className={styles.row} style={{ ["--goal" as string]: g.color }}>
      <Link href={`/projects/${project.slug}/`} className={styles.link}>
        <span className={styles.goal} style={{ color: g.ink }} aria-hidden="true">
          {g.n}
        </span>
        <span className={styles.body}>
          <span className={styles.title}>{project.title}</span>
          <span className={styles.meta}>
            {project.team}, {project.place}, {countryName(project.country)}
          </span>
          <span className={styles.summary}>{project.summary}</span>
          <span className={styles.goalName}>
            Goal {g.n}: {g.name}
          </span>
        </span>
      </Link>
    </li>
  );
}
