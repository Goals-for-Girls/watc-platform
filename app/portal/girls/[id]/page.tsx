import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CONSENT_HELP,
  CONSENT_LABEL,
  GIVER_LABEL,
  METHOD_LABEL,
  STATUS_LABEL,
  shortDate,
} from "@/lib/portal/labels";
import { getStore } from "@/lib/portal/store";
import type { ConsentKind } from "@/lib/portal/types";
import { recordConsent, withdrawConsent } from "../../actions";
import styles from "../../portal.module.css";

export const metadata: Metadata = { title: "Consent" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; added?: string }> };

const KINDS: ConsentKind[] = ["participation", "media", "future_contact", "research"];

export default async function GirlPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, added } = await searchParams;
  const store = await getStore();
  const girl = await store.girl(id);
  if (!girl) notFound();
  const { row } = girl;
  const active = girl.consents.filter((c) => !c.withdrawnAt);
  const missing = KINDS.filter((k) => !active.some((c) => c.kind === k));

  return (
    <>
      <p className={styles.crumbs}>
        <Link href={`/portal/teams/${girl.teamId}/`}>{girl.teamName}</Link>
      </p>
      <h1 className={styles.h1}>{row.firstName}</h1>
      {added && (
        <p className={styles.success}>
          {row.firstName} is added. She can take part once her parent or guardian&apos;s consent is recorded below.
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <dl className={styles.facts}>
        <dt>Age</dt>
        <dd>{row.age}</dd>
        <dt>Status</dt>
        <dd>
          <span className={`${styles.pill} ${styles[`pill_${row.status}`]}`}>{STATUS_LABEL[row.status]}</span>
        </dd>
        <dt>Contact</dt>
        <dd>{row.contactMode === "own_whatsapp" ? "Her own WhatsApp" : "Through her coach"}</dd>
      </dl>

      <div className={styles.split}>
        <section>
          <h2 className={styles.h2}>Consent on record</h2>
          {girl.consents.length === 0 ? (
            <p className={styles.empty}>Nothing recorded yet. She cannot take part until consent to take part is recorded.</p>
          ) : (
            <ul className={styles.consents}>
              {girl.consents.map((c) => (
                <li key={c.id}>
                  <span>
                    <strong>{CONSENT_LABEL[c.kind]}</strong>
                    <span className={styles.consentMeta} style={{ display: "block" }}>
                      {GIVER_LABEL[c.givenBy]}, {METHOD_LABEL[c.method].toLowerCase()}, form {c.policyVersion}, {shortDate(c.grantedAt)}
                      {c.evidenceRef ? `. Filed: ${c.evidenceRef}` : ""}
                      {c.withdrawnAt ? `. Withdrawn ${shortDate(c.withdrawnAt)}` : ""}
                    </span>
                  </span>
                  {!c.withdrawnAt && (
                    <form action={withdrawConsent}>
                      <input type="hidden" name="participantId" value={id} />
                      <input type="hidden" name="kind" value={c.kind} />
                      <button type="submit" className={styles.linkButton}>
                        Record withdrawal
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className={styles.hint} style={{ marginTop: 10, maxWidth: 640 }}>
            Consent records can&apos;t be edited or deleted. If a parent changes their mind, record a withdrawal.
            Withdrawing consent to take part stops all messages to her.
          </p>
        </section>

        {missing.length > 0 && row.status !== "withdrawn" && (
          <aside className={styles.side} aria-labelledby="record">
            <h2 id="record" className={styles.h2} style={{ marginTop: 0 }}>
              Record consent
            </h2>
            <form action={recordConsent} className={styles.form}>
              <input type="hidden" name="participantId" value={id} />
              <fieldset className={styles.choices}>
                <legend className={styles.legend}>Consent to</legend>
                {missing.map((k, i) => (
                  <label key={k} className={styles.choice}>
                    <input type="radio" name="kind" value={k} defaultChecked={i === 0} />
                    <span>
                      {CONSENT_LABEL[k]}
                      <span className={styles.hint} style={{ display: "block" }}>
                        {CONSENT_HELP[k]}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label className={styles.field}>
                <span>Given by</span>
                <select name="givenBy" defaultValue={row.age >= 18 ? "participant_adult" : "parent_or_guardian"}>
                  {Object.entries(GIVER_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>How</span>
                <select name="method" defaultValue="paper_form">
                  {Object.entries(METHOD_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <div className={styles.pair}>
                <label className={styles.field}>
                  <span>Form version</span>
                  <input type="text" name="policyVersion" defaultValue="v1" required maxLength={20} />
                </label>
                <label className={styles.field}>
                  <span>Where it is filed</span>
                  <input type="text" name="evidenceRef" maxLength={120} placeholder="Partner office folder" />
                </label>
              </div>
              <label className={styles.check}>
                <input type="checkbox" name="confirm" required />
                <span>I have the signed form or message, and it covers what I selected above.</span>
              </label>
              <div>
                <button type="submit" className="button">
                  Record consent
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </>
  );
}
