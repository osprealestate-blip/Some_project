/** Burj Khalifa gets its own look on the map: silver-blue glass, stepped tiers that narrow upward, dark bands at
 *  the setbacks and a thin spire, at its true height (828 m to the tip, published Emaar / CTBUH figure).
 *  The tiers are the building's own footprint shrunk towards its centre: an indicative shape, not a survey. */
export const GLASS = "#b4c6d4";
export const GLASS_HOVER = "#d3e2ee";
export const BAND = "#6c8296";
export const SPIRE = "#e2e9ef";
export const BURJ_TIP_M = 828;
/** Height of the full-footprint base tier: the building's own (clickable) feature is drawn this tall. */
export const BURJ_BASE_M = 190;

/** [base, top, scale of the footprint] */
const TIERS: [number, number, number][] = [
  [190, 330, 0.86], [330, 440, 0.72], [440, 520, 0.58], [520, 585, 0.44], [585, 660, 0.26],
];
const BAND_M = 10;
const MAST_RADIUS_M = 2.5;

export function isBurjKhalifa(p: { slug: string; name: string }): boolean {
  return p.slug === "burj-khalifa" || p.name.trim().toLowerCase() === "burj khalifa";
}

type Ring = number[][];
const scaleRing = (ring: Ring, c: [number, number], k: number): Ring => ring.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);

/** Extra extruded pieces (tiers, bands, mast) for one building. Each carries `lb` (base m), `lh` (top m) and `_c`. */
export function landmarkPieces(
  geometry: GeoJSON.Geometry, props: Record<string, unknown> & { lng: number; lat: number },
): GeoJSON.Feature[] {
  const polys = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  if (!polys.length) return [];
  const all = polys.flatMap((p) => p[0]);
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const c: [number, number] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const out: GeoJSON.Feature[] = [];
  const add = (geom: GeoJSON.Geometry, lb: number, lh: number, col: string) =>
    out.push({ type: "Feature", geometry: geom, properties: { ...props, lb, lh, _c: col } });
  const shrunk = (k: number): GeoJSON.Geometry => ({ type: "MultiPolygon", coordinates: polys.map((p) => [scaleRing(p[0], c, k)]) });
  for (const [b, t, k] of TIERS) {
    add(shrunk(k), b, t, GLASS);
    add(shrunk(k * 1.015), t - BAND_M, t, BAND);
  }
  const d = MAST_RADIUS_M;
  const dLat = d / 111_320, dLng = d / (111_320 * Math.cos((c[1] * Math.PI) / 180));
  add({ type: "Polygon", coordinates: [[[c[0] - dLng, c[1] - dLat], [c[0] + dLng, c[1] - dLat], [c[0] + dLng, c[1] + dLat], [c[0] - dLng, c[1] + dLat], [c[0] - dLng, c[1] - dLat]]] }, 660, BURJ_TIP_M, SPIRE);
  return out;
}

/** The basemap's own grey Burj Khalifa (its full footprint at full height) would poke out around the narrower tiers,
 *  so tall basemap pieces inside this small box are not drawn. Our tiered tower replaces them. */
export const BURJ_BOX_HALF_M = 70;
export function burjBasemapHole(lng: number, lat: number): unknown[] {
  const dLat = BURJ_BOX_HALF_M / 111_320, dLng = BURJ_BOX_HALF_M / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring = [[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]];
  return ["all", [">", ["coalesce", ["get", "render_height"], 0], 150], ["within", { type: "Polygon", coordinates: [ring] }]];
}
