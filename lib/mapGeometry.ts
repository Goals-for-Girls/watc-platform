/**
 * Shared map geometry. The base map (country shapes) is rendered once per
 * view into a static SVG file (/maps/<view>.svg) that browsers cache across
 * pages; the pins are drawn inline over it with the same projection.
 */
import { geoEqualEarth, geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry, MultiPoint } from "geojson";
import countriesTopo from "world-atlas/countries-110m.json";
import { activeCountries, type CountryCode } from "./content";

export type MapViewKey = "world" | CountryCode;

export const MAP_VIEWS: MapViewKey[] = ["world", "IN", "ZA", "US"];

export const MAP_SIZE: Record<MapViewKey, { width: number; height: number }> = {
  world: { width: 960, height: 420 },
  IN: { width: 960, height: 560 },
  ZA: { width: 960, height: 560 },
  US: { width: 960, height: 560 },
};

/** ISO 3166 numeric ids used by world-atlas. */
const NUMERIC: Record<CountryCode, string> = { IN: "356", ZA: "710", US: "840" };

/** What each view frames. The U.S. view frames the lower 48, not Alaska. */
const FRAMES: Record<MapViewKey, [number, number][]> = {
  world: [
    [-125, 52],
    [100, -36],
  ],
  IN: [
    [68, 36],
    [97, 7],
  ],
  ZA: [
    [16, -22],
    [33, -35],
  ],
  US: [
    [-125, 49],
    [-67, 25],
  ],
};

export function projectionFor(view: MapViewKey): GeoProjection {
  const { width, height } = MAP_SIZE[view];
  const corners: MultiPoint = { type: "MultiPoint", coordinates: FRAMES[view] };
  const base = view === "world" ? geoEqualEarth() : geoMercator();
  return base.fitExtent(
    [
      [16, 16],
      [width - 16, height - 16],
    ],
    corners,
  );
}

const COLORS = { sea: "#eef0eb", land: "#dfe3da", active: "#c6cfc0" };

/** The base map for one view as a standalone SVG document. */
export function baseMapSvg(view: MapViewKey): string {
  const topo = countriesTopo as unknown as Topology<{ countries: GeometryCollection }>;
  const countries = feature(topo, topo.objects.countries) as FeatureCollection<Geometry>;
  const { width, height } = MAP_SIZE[view];
  const projection = projectionFor(view);
  const path = geoPath(projection).digits(1);
  const active = new Set(activeCountries().map((c) => NUMERIC[c]));

  const land: string[] = [];
  const highlighted: string[] = [];
  for (const f of countries.features) {
    const d = path(f);
    if (!d) continue;
    (active.has(String(f.id)) ? highlighted : land).push(d);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect width="${width}" height="${height}" fill="${COLORS.sea}"/>`,
    `<path d="${land.join("")}" fill="${COLORS.land}" stroke="${COLORS.sea}" stroke-width="0.75"/>`,
    `<path d="${highlighted.join("")}" fill="${COLORS.active}" stroke="${COLORS.sea}" stroke-width="0.75"/>`,
    `</svg>`,
  ].join("");
}
