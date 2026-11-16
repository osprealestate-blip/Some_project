/** Counts of KHDA-listed schools near a building, by KHDA rating. Facts only: no "family friendly" label.
 *  KHDA positions are rounded to about 1 km, so only wide radii are offered. */
export type SchoolRatingRow = { rating: string | null; within_2km: number; within_5km: number };

export const SCHOOL_RADII = [2, 5] as const;

const ORDER = ["outstanding", "very good", "good", "acceptable", "weak", "very weak"];

const rank = (r: string | null) => {
  const i = r ? ORDER.indexOf(r.trim().toLowerCase()) : -1;
  return i === -1 ? ORDER.length : i;
};

export function labelRating(r: string | null): string {
  const s = r?.trim();
  if (!s) return "Not rated";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Rows sorted best rating first, unrated last, empty rows dropped, plus totals. */
export function summariseSchools(rows: SchoolRatingRow[]) {
  const list = rows
    .filter((r) => r.within_2km > 0 || r.within_5km > 0)
    .map((r) => ({ label: labelRating(r.rating), within2: r.within_2km, within5: r.within_5km, rank: rank(r.rating) }))
    .sort((a, b) => a.rank - b.rank);
  return {
    rows: list,
    total2: list.reduce((s, r) => s + r.within2, 0),
    total5: list.reduce((s, r) => s + r.within5, 0),
  };
}
