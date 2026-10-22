import type { Metadata } from "next";
import { ProjectFinder } from "@/components/ProjectFinder";
import { activeCountries, countryName, getProjects, sdgCounts } from "@/lib/content";
import styles from "../inner.module.css";

export const metadata: Metadata = {
  title: "Projects",
  description: "Browse community change projects led by girls, by UN goal and country.",
};

export default function ProjectsPage() {
  const projects = getProjects();
  return (
    <div className={`page ${styles.inner}`}>
      <header className={styles.head}>
        <h1>Projects</h1>
        <p className={styles.lead}>
          Every project here was designed and led by girls. Pick the goal closest to your idea and see how
          others went about it.
        </p>
      </header>
      <ProjectFinder
        projects={projects}
        goals={sdgCounts()}
        countries={activeCountries().map((code) => ({ code, name: countryName(code) }))}
      />
    </div>
  );
}
