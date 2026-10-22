import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/portal/supabase-server";
import { sendSignInLink } from "../actions";
import styles from "../portal.module.css";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (!supabaseConfigured()) redirect("/portal/");
  const { sent, error } = await searchParams;
  return (
    <>
      <h1 className={styles.h1}>Sign in</h1>
      <p className={styles.sub}>For coaches and partner organizations working with Goals for Girls.</p>
      {error && <p className={styles.error}>{error}</p>}
      {sent ? (
        <p className={styles.success}>
          If that email belongs to a registered coach, a sign-in link is on its way. It works once and
          expires after an hour.
        </p>
      ) : (
        <form action={sendSignInLink} className={styles.form} style={{ marginTop: 24 }}>
          <label className={styles.field}>
            <span>Email address</span>
            <input type="email" name="email" required autoComplete="email" />
            <span className={styles.hint}>We&apos;ll email you a link. No password needed.</span>
          </label>
          <div>
            <button type="submit" className="button">
              Email me a sign-in link
            </button>
          </div>
        </form>
      )}
      <p className={`${styles.hint}`} style={{ marginTop: 24, maxWidth: 560 }}>
        New coach? Goals for Girls adds coaches after a background check. Contact your partner organization or
        the Goals for Girls team.
      </p>
    </>
  );
}
