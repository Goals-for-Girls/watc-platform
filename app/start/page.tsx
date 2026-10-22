import type { Metadata } from "next";
import Link from "next/link";
import styles from "../inner.module.css";
import own from "./start.module.css";

export const metadata: Metadata = {
  title: "Start a project",
  description: "How girls will start their own We Are the Change projects.",
};

export default function StartPage() {
  return (
    <div className={`page ${styles.inner}`}>
      <header className={styles.head}>
        <h1>Start a project</h1>
        <p className={styles.lead}>
          From 2027, girls will be able to start a project on WhatsApp with their team and coach, using the
          same steps taught at Goals for Girls Leadership Summits.
        </p>
      </header>

      <section className={`${styles.section} ${own.how}`} aria-labelledby="how">
        <h2 id="how">How it will work</h2>
        <ol className={own.steps}>
          <li>
            <h3>Your coach signs your team up</h3>
            <p>
              A coach, teacher or partner organization registers the team and asks parents for permission.
            </p>
          </li>
          <li>
            <h3>Tell us what you care about</h3>
            <p>Your team chats with the We Are the Change bot on WhatsApp about a problem in your community.</p>
          </li>
          <li>
            <h3>See your UN goal and similar projects</h3>
            <p>The bot shows which UN goal your problem connects to and how other girls tackled it.</p>
          </li>
          <li>
            <h3>Build your plan, step by step</h3>
            <p>Guides and reminders help your team plan, act and check in with your coach.</p>
          </li>
          <li>
            <h3>Share what changed</h3>
            <p>Your story joins the library, after our team checks it, so other girls can learn from you.</p>
          </li>
        </ol>
      </section>

      <section className={`${styles.section} ${own.orgs}`} aria-labelledby="orgs">
        <h2 id="orgs">Run a girls&apos; program?</h2>
        <p>
          We are looking for partner organizations, schools and coaches to be the first to bring We Are the
          Change to their girls in 2027.
        </p>
        <a className="button" href="https://www.goalsforgirls.org">
          Contact Goals for Girls
        </a>
      </section>

      <p className={`${styles.section} muted`}>
        In the meantime, <Link href="/projects/">browse the projects</Link> to see what girls have already
        done.
      </p>
    </div>
  );
}
