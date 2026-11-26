/** Villa and townhouse clusters. Pure helpers (tested); the database reads are in villaClusterQueries.ts.
 *  A cluster is ONE map point for a whole villa or townhouse project, never one point per villa. */

export type ClusterKind = "villa" | "townhouse" | "mixed";

export const CLUSTER_KIND_LABEL: Record<ClusterKind, string> = {
  villa: "Villa cluster",
  townhouse: "Townhouse cluster",
  mixed: "Villa and townhouse cluster",
};

/** One bedroom row as stored (rooms -1 = all types). Only aggregates, never a single villa. */
export type ClusterRoomRow = {
  rooms: number;
  sale_count_12m: number;
  sale_median_psf_12m: number | null;
  sale_median_price_12m: number | null;
  sale_median_size_12m: number | null;
  rent_count_12m: number;
  rent_median_12m: number | null;
};

export type MixPart = { rooms: number; label: string; sales: number; share: number };

/** Bedroom mix of the last 12 months of sales: each bedroom count with its sales and share of the whole.
 *  4 means 4 or more. Empty when there are no sales. Shares add up to 100 (largest remainder). */
export function bedroomMix(rows: ClusterRoomRow[]): MixPart[] {
  const parts = rows.filter((r) => r.rooms >= 0 && r.sale_count_12m > 0).sort((a, b) => a.rooms - b.rooms);
  const total = parts.reduce((s, r) => s + r.sale_count_12m, 0);
  if (!total) return [];
  const raw = parts.map((r) => (r.sale_count_12m / total) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - floor[i], i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) floor[i]++; });
  return parts.map((r, i) => ({ rooms: r.rooms, label: bedLabel(r.rooms), sales: r.sale_count_12m, share: floor[i] }));
}

export function bedLabel(rooms: number): string {
  return rooms === 0 ? "Studio" : rooms >= 4 ? "4+ bed" : `${rooms} bed`;
}

/** The plain "what is this dot" sentence, shown on every card and page. */
export const CLUSTER_POINT_NOTE = "The dot marks the middle of the project, not a single villa.";

export const CLUSTER_SOURCE_LABEL: Record<string, string> = {
  "2gis": "2GIS map lookup",
  google: "Google Maps lookup",
  osm: "OpenStreetMap",
  manual: "Placed by hand",
};

/** Villa area on the map. The data holds ONE point per project, so "the villas of this project" is drawn as a circle around
 *  that point. Its size is an estimate from the plot count (about 450 m² of land per plot with its share of streets, 300 m²
 *  for townhouses), kept between 90 m and 450 m. It is an area guess, never a boundary, and the card says so. */
export function clusterRadiusM(plots: number | null | undefined, kind: ClusterKind = "villa"): number {
  const n = plots && plots > 0 ? plots : 0;
  if (!n) return 150;
  const per = kind === "townhouse" ? 300 : 450;
  return Math.min(450, Math.max(90, Math.round(Math.sqrt((n * per) / Math.PI))));
}

export type ClusterArea = { slug: string; kind: ClusterKind; lng: number; lat: number; plots?: number | null };

/** Metres between two points, good enough at Dubai's latitude. */
export function metresBetween(lng1: number, lat1: number, lng2: number, lat2: number): number {
  return Math.hypot((lng1 - lng2) * 100_900, (lat1 - lat2) * 110_574);
}

/** The cluster whose area contains this point. When areas overlap, the one the point sits deepest inside (distance
 *  relative to its radius) wins. Null when the point is inside none. */
export function clusterAt<T extends ClusterArea>(clusters: T[], lng: number, lat: number): T | null {
  let best: T | null = null, bestRatio = Infinity;
  for (const c of clusters) {
    const r = clusterRadiusM(c.plots, c.kind);
    const ratio = metresBetween(lng, lat, c.lng, c.lat) / r;
    if (ratio <= 1 && ratio < bestRatio) { best = c; bestRatio = ratio; }
  }
  return best;
}
