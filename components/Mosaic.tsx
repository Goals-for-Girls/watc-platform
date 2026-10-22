/**
 * The project mosaic: one tile per real project, colored by its SDG, with the
 * goal number set large like a shirt number. It grows as projects are added,
 * so it doubles as a picture of the movement's size.
 */
import Link from "next/link";
import type { Project } from "@/lib/content";
import { sdg } from "@/lib/sdgs";
import styles from "./Mosaic.module.css";

export function Mosaic({ projects }: { projects: Project[] }) {
  return (
    <ul className={styles.mosaic} aria-label="Projects, colored by UN goal">
      {projects.map((p) => {
        const g = sdg(p.sdg);
        return (
          <li key={p.slug}>
            <Link
              href={`/projects/${p.slug}/`}
              className={styles.tile}
              style={{ background: g.color, color: g.ink }}
              title={`${p.title}: ${p.place}. Goal ${g.n}, ${g.name.toLowerCase()}.`}
            >
              <span className={styles.number} aria-hidden="true">
                {g.n}
              </span>
              <span className={styles.name}>{p.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
