/** Types and query-string parsing for the latest-sales list. No database import, so client components can use it. */
export type LatestSale = {
  txn_date: string; building: string; slug: string; area: string; rooms: number | null;
  size_sqft: number; price: number; price_psf: number; off_plan: boolean | null;
};

export type LatestScope = { kind: "master"; value: string } | { kind: "area"; value: string };

export const LATEST_DEFAULT = 15;
export const LATEST_MAX = 45;

/** Reads the query string: ?master=Dubai Marina or ?area=392, plus an optional limit kept between 1 and LATEST_MAX. */
export function parseLatest(sp: URLSearchParams): { scope: LatestScope; limit: number } | null {
  const master = sp.get("master")?.trim();
  const area = sp.get("area")?.trim();
  const scope: LatestScope | null = master ? { kind: "master", value: master.slice(0, 120) } : area && /^\d{1,4}$/.test(area) ? { kind: "area", value: area } : null;
  if (!scope) return null;
  const n = Math.floor(Number(sp.get("limit") ?? LATEST_DEFAULT));
  return { scope, limit: Number.isFinite(n) ? Math.min(LATEST_MAX, Math.max(1, n)) : LATEST_DEFAULT };
}

