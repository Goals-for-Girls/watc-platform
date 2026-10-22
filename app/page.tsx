import Link from "next/link";
import { Mosaic } from "@/components/Mosaic";
import { ProjectMap } from "@/components/ProjectMap";
import { activeCountries, countryInSentence, getPlaces, getProjects, joinNames } from "@/lib/content";
import styles from "./home.module.css";

const STEPS = [
  {
    title: "Name the problem",
    text: "Talk to people in your community, listen for what keeps coming up, and choose one problem to work on.",
  },
  {
    title: "Connect it to a UN goal",
    text: "See which of the 17 Sustainable Development Goals your problem belongs to, and who else is working on it.",
  },
  {
    title: "Learn from girls who did it",
    text: "Read how other teams tackled the same goal: what they tried, who they convinced, what changed.",
  },
  {
    title: "Make your plan",
    text: "Decide who does what, by when, and the first small step you can take this week.",
  },
  {
    title: "Act and share your story",
    text: "Run your project, check in with your coach, and add your story so the next girl can learn from you.",
  },
];

export default function Home() {
  const projects = getProjects();
  const places = getPlaces();
  const countries = activeCountries().map(countryInSentence);

  return (
    <>
      <section className={`page ${styles.hero}`}>
        <div className={styles.heroText}>
          <h1>Girls are already changing their communities.</h1>
          <p className={styles.lead}>
            {projects.length} projects led by girls in {places.length} places across {joinNames(countries)}. Each
            one started with a girl who noticed a problem and decided to fix it. Find one like the idea you
            have.
          </p>
          <div className={styles.actions}>
            <Link href="/projects/" className="button">
              Browse the projects
            </Link>
            <Link href="/map/" className="button quiet">
              See the map
            </Link>
          </div>
        </div>
        <div className={styles.heroMosaic}>
          <Mosaic projects={projects} />
          <p className={styles.caption}>
            Every square is a real project. The number and color show which UN goal it serves.
          </p>
        </div>
      </section>

      <section className={`page ${styles.section}`} aria-labelledby="how">
        <h2 id="how">How a project comes together</h2>
        <p className={`${styles.sectionLead} muted`}>
          The same five steps girls learn at our Leadership Summits, now open to any girl with an idea.
        </p>
        <ol className={styles.steps}>
          {STEPS.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`page ${styles.section} ${styles.mapSection}`} aria-labelledby="where">
        <div className={styles.mapText}>
          <h2 id="where">Where girls are leading change</h2>
          <p className="muted">
            Most projects so far come from India, where girls have led change in {getPlaces("IN").length} places,
            from Punjab to Manipur.
          </p>
          <Link href="/map/" className="button quiet">
            Open the full map
          </Link>
        </div>
        <ProjectMap view="world" pinHref="/map/" title="World map of We Are the Change projects" />
      </section>

      <section className={`page ${styles.section}`} aria-labelledby="safe">
        <div className={styles.safety}>
          <h2 id="safe">Built to keep girls safe</h2>
          <p>
            When projects open to new girls, each girl will take part through a coach, teacher or parent who
            knows her. Nothing a girl writes will be shown to anyone else until a person on our team has
            checked it. This site never shows names, phone numbers, schools or home locations.
          </p>
          <Link href="/safety/">How we keep girls safe, and how to report a concern</Link>
        </div>
      </section>
    </>
  );
}
