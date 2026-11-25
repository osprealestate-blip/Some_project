/** Burj Khalifa on the map. Its own footprint is a single Y-plan prism, which looks nothing like the tower. The basemap
 *  (OpenStreetMap building parts) already holds the real stepped, tapering shape, so when the tower is hovered or
 *  selected we redraw exactly those parts in the highlight colour. Nothing here is invented geometry. */
export const BURJ_CENTRE = { lng: 55.27439, lat: 25.1972 };
/** Parts whose centre is within this distance of the tower's centre (metres) belong to it. */
const RADIUS_M = 60;
const MIN_PART_HEIGHT_M = 40;

export function isBurjKhalifa(p: { slug?: string; name?: string }): boolean {
  return p.slug === "burj-khalifa" || (p.name ?? "").trim().toLowerCase() === "burj khalifa";
}

type Ring = number[][];

function polygonsOf(g: GeoJSON.Geometry): Ring[][] {
  return g.type === "Polygon" ? [g.coordinates as Ring[]] : g.type === "MultiPolygon" ? (g.coordinates as Ring[][]) : [];
}

export type BurjParts = {
  features: GeoJSON.Feature[];
  /** [top, base] pairs the basemap layer should stop drawing, because the highlight redraws that exact piece. */
  hide: [number, number][];
};

/** Basemap building pieces that make up the tower, as GeoJSON features with `h` (top, m) and `b` (base, m).
 *  A piece whose [top, base] heights no other loaded building shares is hidden from the grey layer and redrawn exactly.
 *  A piece that shares them with a far-away building cannot be told apart by height, so it stays in the grey layer and
 *  its highlight is grown a little and 1 m taller, to sit just outside it. */
export function burjParts(tileFeatures: GeoJSON.Feature[]): BurjParts {
  const kx = 111_320 * Math.cos((BURJ_CENTRE.lat * Math.PI) / 180);
  const mine: { key: string; poly: Ring[]; cx: number; cy: number; h: number; b: number }[] = [];
  const elsewhere = new Set<string>();
  for (const f of tileFeatures) {
    const h = Number(f.properties?.render_height ?? 0);
    if (h < MIN_PART_HEIGHT_M) continue;
    const b = Number(f.properties?.render_min_height ?? 0);
    for (const poly of polygonsOf(f.geometry)) {
      const ring = poly[0];
      if (!ring?.length) continue;
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const key = `${h}/${b}`;
      const near = Math.hypot((cx - BURJ_CENTRE.lng) * kx, (cy - BURJ_CENTRE.lat) * 110_574) <= RADIUS_M;
      // A whole-complex outline (hide_3d) is not drawn by the basemap either: its separate parts are. Drawing it as well
      // is what made the highlight a full-height slab with the Y footprint.
      if (f.properties?.hide_3d) continue;
      if (near) mine.push({ key, poly, cx, cy, h, b }); else elsewhere.add(key);
    }
  }
  const features: GeoJSON.Feature[] = [];
  const hide = new Map<string, [number, number]>();
  const seen = new Set<string>();
  for (const m of mine) {
    const exact = !elsewhere.has(m.key);
    const id = `${m.cx.toFixed(6)}|${m.cy.toFixed(6)}|${m.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    if (exact) hide.set(m.key, [m.h, m.b]);
    const k = exact ? 1 : 1.06;
    const grown = m.poly.map((r) => r.map(([x, y]) => [m.cx + (x - m.cx) * k, m.cy + (y - m.cy) * k]));
    features.push({ type: "Feature", geometry: { type: "Polygon", coordinates: grown }, properties: { h: m.h + (exact ? 0 : 2), b: m.b } });
  }
  return { features, hide: [...hide.values()] };
}
