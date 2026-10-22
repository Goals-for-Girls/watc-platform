/**
 * Project map: a cached base-map image with the pins drawn over it.
 *
 * Why not a tile map (MapLibre, Mapbox)? Every pin is city-level and there
 * are three countries, so a drawn map is lighter (no map library, no tile
 * requests) and sends no visitor data to a third-party tile server.
 * Switch to MapLibre when street-level zoom is genuinely needed.
 */
import { countryName, getPlaces, type Place } from "@/lib/content";
import { MAP_SIZE, projectionFor, type MapViewKey } from "@/lib/mapGeometry";
import styles from "./ProjectMap.module.css";

interface Props {
  view: MapViewKey;
  /** Draw pins as links to #place anchors on the same page. */
  linkPins?: boolean;
  /** Where pins link when not on the map page, e.g. "/map/". */
  pinHref?: string;
  title: string;
}

export function ProjectMap({ view, linkPins = false, pinHref, title }: Props) {
  const { width, height } = MAP_SIZE[view];
  const projection = projectionFor(view);
  const places = getPlaces(view === "world" ? undefined : view);
  const radius = (p: Place) => 7 + Math.sqrt(p.projects.length) * 5;

  return (
    <div className={styles.wrap} style={{ aspectRatio: `${width} / ${height}` }}>
      <img
        className={styles.base}
        src={`/maps/${view.toLowerCase()}.svg`}
        alt=""
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
      />
      <svg className={styles.pins} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <title>{title}</title>
        {places.map((p) => {
          const xy = projection([p.lon, p.lat]);
          if (!xy) return null;
          const [x, y] = xy.map((v) => Math.round(v * 10) / 10);
          const r = Math.round(radius(p) * 10) / 10;
          const n = p.projects.length;
          const label = `${p.name}, ${countryName(p.country)}: ${n} project${n > 1 ? "s" : ""}`;
          const pin = (
            <g className={styles.pin}>
              <title>{label}</title>
              <circle cx={x} cy={y} r={r} />
              {n > 1 && (
                <text x={x} y={y} dy="0.35em" textAnchor="middle">
                  {n}
                </text>
              )}
            </g>
          );
          const href = linkPins ? `#${p.key}` : pinHref;
          return href ? (
            <a key={p.key} href={href} aria-label={label}>
              {pin}
            </a>
          ) : (
            <g key={p.key}>{pin}</g>
          );
        })}
      </svg>
    </div>
  );
}
