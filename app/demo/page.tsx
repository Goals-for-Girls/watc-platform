import type { Metadata } from "next";
import { BotDemo } from "@/components/BotDemo";
import styles from "../inner.module.css";

export const metadata: Metadata = {
  title: "Try the bot",
  description: "A working demo of the We Are the Change WhatsApp bot.",
};

export default function DemoPage() {
  return (
    <div className={`page ${styles.inner}`}>
      <header className={styles.head}>
        <h1>Try the bot</h1>
        <p className={styles.lead}>
          This is how girls will start a project on WhatsApp. Describe a problem in your own words and see
          which UN goal it connects to, which girls already worked on it, and a first plan.
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          Demo only: nothing you type is saved. Please don&apos;t type real names or contact details.
        </p>
      </header>
      <BotDemo />
    </div>
  );
}
