"use client";

/**
 * Library filters. Runs in the browser on data already in the page, so
 * filtering works instantly, even offline once the page has loaded.
 */
import { useMemo, useState } from "react";
import type { Project, CountryCode } from "@/lib/content";
import { sdg } from "@/lib/sdgs";
import { ProjectRow } from "./ProjectRow";
import styles from "./ProjectFinder.module.css";

interface Props {
  projects: Project[];
  goals: { n: number; count: number }[];
  countries: { code: CountryCode; name: string }[];
}

export function ProjectFinder({ projects, goals, countries }: Props) {
  const [goal, setGoal] = useState<number | null>(null);
  const [country, setCountry] = useState<CountryCode | "">("");

  const shown = useMemo(
    () => projects.filter((p) => (goal === null || p.sdg === goal) && (!country || p.country === country)),
    [projects, goal, country],
  );

  return (
    <div>
      <fieldset className={styles.goals}>
        <legend className={styles.legend}>Filter by UN goal</legend>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={goal === null}
          onClick={() => setGoal(null)}
        >
          All goals
        </button>
        {goals.map(({ n, count }) => {
          const g = sdg(n);
          return (
            <button
              key={n}
              type="button"
              className={styles.chip}
              aria-pressed={goal === n}
              onClick={() => setGoal(goal === n ? null : n)}
              style={{ ["--goal" as string]: g.color, ["--goal-ink" as string]: g.ink }}
            >
              <span className={styles.swatch} aria-hidden="true">
                {n}
              </span>
              {g.name} <span className={styles.count}>({count})</span>
            </button>
          );
        })}
      </fieldset>

      <div className={styles.bar}>
        <label className={styles.select}>
          <span>Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value as CountryCode | "")}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.result} aria-live="polite">
          {shown.length === projects.length
            ? `Showing all ${projects.length} projects`
            : `Showing ${shown.length} of ${projects.length} projects`}
        </p>
      </div>

      {shown.length > 0 ? (
        <ul className={styles.list}>
          {shown.map((p) => (
            <ProjectRow key={p.slug} project={p} />
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>No projects match both filters yet.</p>
          <button
            type="button"
            className="button quiet"
            onClick={() => {
              setGoal(null);
              setCountry("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
