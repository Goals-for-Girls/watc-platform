import Link from "next/link";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`page ${styles.inner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.wordmark}>We Are the Change</span>
          <span className={styles.byline}>a Goals for Girls program</span>
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <Link href="/projects/">Projects</Link>
          <Link href="/map/">Map</Link>
          <Link href="/safety/">Safety</Link>
          <Link href="/start/" className={styles.start}>
            Start a project
          </Link>
        </nav>
      </div>
    </header>
  );
}
