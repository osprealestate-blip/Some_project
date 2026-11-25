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

/** Basemap building pieces that make up the tower, as GeoJSON features with `h` (top, m) and `b` (base, m). Each is
 *  grown 1.5% round its own centre and 1 m taller, so the highlight sits just outside the grey piece (no flicker). */
export function burjParts(tileFeatures: GeoJSON.Feature[]): GeoJSON.Feature[] {
  const kx = 111_320 * Math.cos((BURJ_CENTRE.lat * Math.PI) / 180);
  const out: GeoJSON.Feature[] = [];
  const seen = new Set<string>();
  for (const f of tileFeatures) {
    const h = Number(f.properties?.render_height ?? 0);
    if (h < MIN_PART_HEIGHT_M) continue;
    const b = Number(f.properties?.render_min_height ?? 0);
    for (const poly of polygonsOf(f.geometry)) {
      const ring = poly[0];
      if (!ring?.length) continue;
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      if (Math.hypot((cx - BURJ_CENTRE.lng) * kx, (cy - BURJ_CENTRE.lat) * 110_574) > RADIUS_M) continue;
      const key = `${cx.toFixed(6)}|${cy.toFixed(6)}|${h}|${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const grown = poly.map((r) => r.map(([x, y]) => [cx + (x - cx) * 1.015, cy + (y - cy) * 1.015]));
      out.push({ type: "Feature", geometry: { type: "Polygon", coordinates: grown }, properties: { h: h + 1, b } });
    }
  }
  return out;
}
