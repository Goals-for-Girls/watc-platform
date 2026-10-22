import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectRow } from "@/components/ProjectRow";
import { countryName, getProject, getProjects, relatedProjects } from "@/lib/content";
import { sdg } from "@/lib/sdgs";
import styles from "./project.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const g = sdg(project.sdg);
  const related = relatedProjects(project);

  return (
    <article>
      <header className={styles.band} style={{ background: g.color, color: g.ink }}>
        <div className={`page ${styles.bandInner}`}>
          <Link href="/projects/" className={styles.back} style={{ color: g.ink }}>
            All projects
          </Link>
          <div className={styles.bandGrid}>
            <span className={styles.number} aria-hidden="true">
              {g.n}
            </span>
            <div>
              <p className={styles.goal}>
                UN goal {g.n}: {g.name}
              </p>
              <h1 className={styles.title}>{project.title}</h1>
              <p className={styles.who}>
                {project.team}, {project.place}, {countryName(project.country)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className={`page ${styles.body}`}>
        <div className={styles.story}>
          <p className={styles.summary}>{project.summary}</p>
          <h2 className={styles.h2}>What they did</h2>
          <p>{project.story}</p>
          {project.outcome && (
            <>
              <h2 className={styles.h2}>What changed</h2>
              <p>{project.outcome}</p>
            </>
          )}
          {project.support && (
            <p className={`${styles.support} muted`}>Supported by {project.support}.</p>
          )}
        </div>

        <aside className={styles.cta} aria-labelledby="your-turn">
          <h2 id="your-turn" className={styles.h2}>
            Have an idea like this?
          </h2>
          <p>
            Girls will be able to start their own projects here, with a coach, from 2027. See how it will
            work.
          </p>
          <Link href="/start/" className="button">
            How to start a project
          </Link>
        </aside>
      </div>

      {related.length > 0 && (
        <section className={`page ${styles.related}`} aria-labelledby="related">
          <h2 id="related" className={styles.h2}>
            More projects on goal {g.n}
          </h2>
          <ul className={styles.list}>
            {related.map((p) => (
              <ProjectRow key={p.slug} project={p} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
