import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapView } from "@/components/MapView";
import { COUNTRIES, activeCountries, countryBySlug, countryInSentence } from "@/lib/content";
import styles from "../../inner.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return activeCountries().map((c) => ({ country: COUNTRIES[c].slug }));
}

type Params = { params: Promise<{ country: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const code = countryBySlug((await params).country);
  return code ? { title: `Projects in ${countryInSentence(code)}` } : {};
}

export default async function CountryMapPage({ params }: Params) {
  const code = countryBySlug((await params).country);
  if (!code) notFound();
  return (
    <div className={`page ${styles.inner}`}>
      <header className={styles.head}>
        <h1>Projects in {countryInSentence(code)}</h1>
      </header>
      <MapView view={code} />
    </div>
  );
}
