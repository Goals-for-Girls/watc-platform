import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/portal/store";
import { addGirl } from "../../../actions";
import styles from "../../../portal.module.css";

export const metadata: Metadata = { title: "Add a girl" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default async function AddGirlPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error } = await searchParams;
  const store = await getStore();
  const detail = await store.team(id);
  if (!detail) notFound();
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => thisYear - 11 - i);

  return (
    <>
      <p className={styles.crumbs}>
        <Link href={`/portal/teams/${id}/`}>{detail.team.name}</Link>
      </p>
      <h1 className={styles.h1}>Add a girl</h1>
      <p className={styles.sub}>
        Only what we need: her first name, birth month and year, and a parent or guardian to contact.
      </p>
      {error && <p className={styles.error}>{error}</p>}

      <form action={addGirl} className={styles.form} style={{ marginTop: 24 }}>
        <input type="hidden" name="teamId" value={id} />
        <label className={styles.field}>
          <span>First name</span>
          <input type="text" name="firstName" required maxLength={40} autoComplete="off" />
          <span className={styles.hint}>First name only. Never shown publicly.</span>
        </label>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span>Birth month</span>
            <select name="birthMonth" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Birth year</span>
            <select name="birthYear" required defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className={styles.choices}>
          <legend className={styles.legend}>How should the bot reach her?</legend>
          <label className={styles.choice}>
            <input type="radio" name="contactMode" value="via_coach" defaultChecked />
            <span>
              Through me
              <span className={styles.hint} style={{ display: "block" }}>
                Required for girls under 13. The team chats through your phone.
              </span>
            </span>
          </label>
          <label className={styles.choice}>
            <input type="radio" name="contactMode" value="own_whatsapp" />
            <span>
              On her own WhatsApp (13 and over)
              <span className={styles.hint} style={{ display: "block" }}>
                Only with her parent&apos;s permission.
              </span>
            </span>
          </label>
        </fieldset>

        <label className={styles.field}>
          <span>Her WhatsApp number (only if she uses her own)</span>
          <input type="tel" name="whatsapp" placeholder="+91 98765 43210" autoComplete="off" />
        </label>

        <label className={styles.field}>
          <span>Parent or guardian&apos;s name</span>
          <input type="text" name="guardianName" required maxLength={60} autoComplete="off" />
        </label>
        <div className={styles.pair}>
          <label className={styles.field}>
            <span>Relationship</span>
            <input type="text" name="guardianRelation" required maxLength={30} placeholder="Mother" />
          </label>
          <label className={styles.field}>
            <span>Their phone (optional)</span>
            <input type="tel" name="guardianPhone" placeholder="+91 ..." autoComplete="off" />
          </label>
        </div>

        <div>
          <button type="submit" className="button">
            Add her, then record consent
          </button>
        </div>
      </form>
    </>
  );
}
