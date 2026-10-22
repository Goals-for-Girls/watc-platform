import type { Metadata } from "next";
import styles from "../inner.module.css";

export const metadata: Metadata = {
  title: "Safety",
  description: "How We Are the Change keeps girls safe, and how to report a concern.",
};

/** Set NEXT_PUBLIC_SAFEGUARDING_EMAIL to a monitored Goals for Girls inbox before launch. */
const REPORT_EMAIL = process.env.NEXT_PUBLIC_SAFEGUARDING_EMAIL;

export default function SafetyPage() {
  return (
    <div className={`page ${styles.inner}`}>
      <header className={styles.head}>
        <h1>Keeping girls safe</h1>
        <p className={styles.lead}>
          For parents, teachers, coaches and partner organizations: how We Are the Change protects the girls
          who take part.
        </p>
      </header>

      <section className={`${styles.section} ${styles.prose} prose`} aria-labelledby="report">
        <h2 id="report">Report a concern</h2>
        <p>
          If you are worried about a girl&apos;s safety, or about anything you have seen on this site or in a
          We Are the Change conversation, tell us. Our safeguarding lead reads every report.
        </p>
        {REPORT_EMAIL ? (
          <p>
            Email <a href={`mailto:${REPORT_EMAIL}`}>{REPORT_EMAIL}</a>.
          </p>
        ) : (
          <p>
            <strong>[Safeguarding contact to be added before launch.]</strong>
          </p>
        )}
        <p>If a child is in immediate danger, contact your local emergency services first.</p>
      </section>

      <section className={`${styles.section} ${styles.prose} prose`} aria-labelledby="rules">
        <h2 id="rules">Our rules</h2>
        <ul>
          <li>
            Every girl takes part with a trusted adult who knows her: a coach, teacher or parent. We ask a
            parent or guardian for permission before we keep any of her information.
          </li>
          <li>
            No adult ever contacts a girl privately through We Are the Change. When girls talk to mentors or
            other teams, a member of our staff is always in the conversation.
          </li>
          <li>
            Nothing a girl writes is shown to anyone else until a person on our team has checked it.
          </li>
          <li>
            We never show girls&apos; names, phone numbers, schools or home locations. Projects are named by
            team, and the map shows only the town or district.
          </li>
          <li>Photos of girls appear only with separate permission from a parent or guardian.</li>
        </ul>
      </section>

      <section className={`${styles.section} ${styles.prose} prose`} aria-labelledby="age">
        <h2 id="age">Who can take part</h2>
        <p>
          We Are the Change is for girls aged 12 to 18. Girls aged 13 and over can join through WhatsApp with
          their coach. Girls aged 12 take part as members of a team whose coach manages the conversation.
        </p>
      </section>
    </div>
  );
}
