import Link from "next/link";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <p className={styles.mission}>
          We Are the Change is the community project program of{" "}
          <a href="https://www.goalsforgirls.org">Goals for Girls</a>, which has helped girls lead change
          in their communities for nearly 20 years.
        </p>
        <nav aria-label="Footer" className={styles.links}>
          <Link href="/projects/">All projects</Link>
          <Link href="/map/">Project map</Link>
          <Link href="/demo/">Try the bot</Link>
          <Link href="/safety/">Safety and reporting a concern</Link>
          <Link href="/start/">Start a project</Link>
        </nav>
      </div>
    </footer>
  );
}
