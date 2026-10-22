import Link from "next/link";
import { ProjectMap } from "./ProjectMap";
import { COUNTRIES, activeCountries, countryInSentence, countryName, getPlaces, type CountryCode } from "@/lib/content";
import { sdg } from "@/lib/sdgs";
import styles from "./MapView.module.css";

export function MapView({ view }: { view: "world" | CountryCode }) {
  const places = getPlaces(view === "world" ? undefined : view);
  const total = places.reduce((n, p) => n + p.projects.length, 0);
  const where = view === "world" ? "around the world" : `in ${countryInSentence(view)}`;

  return (
    <div>
      <nav aria-label="Map views" className={styles.tabs}>
        <Link href="/map/" aria-current={view === "world" ? "page" : undefined}>
          Everywhere
        </Link>
        {activeCountries().map((c) => (
          <Link key={c} href={`/map/${COUNTRIES[c].slug}/`} aria-current={view === c ? "page" : undefined}>
            {countryName(c)}
          </Link>
        ))}
      </nav>

      <ProjectMap view={view} linkPins title={`Map of ${total} projects ${where}`} />
      <p className={styles.note}>
        Pins mark the town or district only. Numbers show how many projects started in the same place.
      </p>

      <h2 className={styles.h2}>
        {total} projects in {places.length} places {where}
      </h2>
      <ul className={styles.places}>
        {places.map((place) => (
          <li key={place.key} id={place.key} className={styles.place}>
            <h3>
              {place.name}
              {view === "world" && <span className="muted">, {countryName(place.country)}</span>}
            </h3>
            <ul className={styles.projects}>
              {place.projects.map((p) => {
                const g = sdg(p.sdg);
                return (
                  <li key={p.slug}>
                    <span
                      className={styles.dot}
                      style={{ background: g.color, color: g.ink }}
                      title={`Goal ${g.n}: ${g.name}`}
                    >
                      {g.n}
                    </span>
                    <Link href={`/projects/${p.slug}/`}>{p.title}</Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
