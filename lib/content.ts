/**
 * The only module that reads project content. Pages call these functions,
 * never the data file directly, so moving content into Sanity later means
 * rewriting this file alone.
 */
import { projects, type CountryCode, type Project } from "@/content/projects";

export type { Project, CountryCode };

export const COUNTRIES: Record<CountryCode, { name: string; slug: string }> = {
  IN: { name: "India", slug: "india" },
  ZA: { name: "South Africa", slug: "south-africa" },
  US: { name: "United States", slug: "united-states" },
};

export function getProjects(): Project[] {
  return [...projects];
}

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function countryName(code: CountryCode): string {
  return COUNTRIES[code].name;
}

/** The country name as it reads mid-sentence: "the United States". */
export function countryInSentence(code: CountryCode): string {
  return code === "US" ? "the United States" : COUNTRIES[code].name;
}

export function countryBySlug(slug: string): CountryCode | undefined {
  return (Object.keys(COUNTRIES) as CountryCode[]).find((c) => COUNTRIES[c].slug === slug);
}

/** Countries that have at least one project, largest first. */
export function activeCountries(): CountryCode[] {
  const counts = new Map<CountryCode, number>();
  for (const p of projects) counts.set(p.country, (counts.get(p.country) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}

export interface Place {
  key: string;
  name: string;
  country: CountryCode;
  lat: number;
  lon: number;
  projects: Project[];
}

/** Projects grouped by place, for the map. */
export function getPlaces(country?: CountryCode): Place[] {
  const byKey = new Map<string, Place>();
  for (const p of projects) {
    if (country && p.country !== country) continue;
    const key = `${p.country}-${p.place}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = byKey.get(key);
    if (existing) existing.projects.push(p);
    else byKey.set(key, { key, name: p.place, country: p.country, lat: p.lat, lon: p.lon, projects: [p] });
  }
  return [...byKey.values()].sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
}

/** SDGs that have at least one project, with counts, in goal order. */
export function sdgCounts(): { n: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const p of projects) counts.set(p.sdg, (counts.get(p.sdg) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([n, count]) => ({ n, count }));
}

export function relatedProjects(project: Project, limit = 3): Project[] {
  return projects.filter((p) => p.slug !== project.slug && p.sdg === project.sdg).slice(0, limit);
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
