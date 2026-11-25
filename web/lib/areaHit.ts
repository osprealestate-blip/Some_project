/** Which community area is under a map click. The areas are plain GeoJSON (outline plus label point), so a tap on empty ground
 *  inside an outline can pick the community without a map layer query. Pure, so it is tested. */
type Ring = number[][];

function inRing(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(poly: Ring[], x: number, y: number): boolean {
  if (!poly[0] || !inRing(poly[0], x, y)) return false;
  return !poly.slice(1).some((hole) => inRing(hole, x, y));
}

export function pointInGeometry(g: GeoJSON.Geometry, x: number, y: number): boolean {
  if (g.type === "Polygon") return inPolygon(g.coordinates as Ring[], x, y);
  if (g.type === "MultiPolygon") return (g.coordinates as Ring[][]).some((p) => inPolygon(p, x, y));
  return false;
}

type Bboxed = { bbox: [number, number, number, number] };

/** The smallest area (by bounding box) that contains the point, so a community inside a bigger one wins. */
export function areaAt<P extends Bboxed>(features: GeoJSON.Feature<GeoJSON.Geometry, P>[], lng: number, lat: number): GeoJSON.Feature<GeoJSON.Geometry, P> | null {
  let best: GeoJSON.Feature<GeoJSON.Geometry, P> | null = null;
  let bestSize = Infinity;
  for (const f of features) {
    const [w, s, e, n] = f.properties.bbox;
    if (lng < w || lng > e || lat < s || lat > n) continue;
    if (!pointInGeometry(f.geometry, lng, lat)) continue;
    const size = (e - w) * (n - s);
    if (size < bestSize) { best = f; bestSize = size; }
  }
  return best;
}
