import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/portal/store";
import { signOut } from "./actions";
import styles from "./portal.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Coach portal", template: "%s | Coach portal" },
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const store = await getStore();
  const me = await store.me();
  return (
    <>
      <div className={styles.bar}>
        <div className={`page ${styles.barInner}`}>
          <Link href="/portal/" className={styles.barTitle}>
            Coach portal
          </Link>
          {me && (
            <div className={styles.who}>
              <span>
                {me.displayName}
                {me.orgName ? `, ${me.orgName}` : ""}
              </span>
              {store.mode === "live" && (
                <form action={signOut}>
                  <button type="submit">Sign out</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      {store.mode === "demo" && (
        <div className={styles.demo}>
          <p className="page">
            Preview with made-up teams and girls. Changes you make are kept only until the server restarts.
            Real coaches will sign in with their email once the database is connected.
          </p>
        </div>
      )}
      <div className={`page ${styles.main}`}>{children}</div>
    </>
  );
}
