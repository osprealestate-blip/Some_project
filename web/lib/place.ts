/** Helpers for the "no data yet" card: a building on the map that has an outline but no record in our database. */

/** A point inside Dubai's bounds, rounded to ~11 m so identical clicks share a cache entry. Null when not a valid point. */
export function parsePoint(lng: string | null, lat: string | null): { lng: number; lat: number } | null {
  if (lng == null || lat == null || lng.trim() === "" || lat.trim() === "") return null;
  const x = Number(lng), y = Number(lat);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (x < 54.5 || x > 56.5 || y < 24.5 || y > 25.6) return null;
  return { lng: Math.round(x * 1e4) / 1e4, lat: Math.round(y * 1e4) / 1e4 };
}

/** Height in whole metres from a basemap tile's render_height, or null when it is missing or not a sensible number. */
export function tileHeight(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n < 1000 ? Math.round(n) : null;
}
