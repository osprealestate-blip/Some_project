/** Filtering and a plain summary for the anonymous list of recent sales in one building. Rows carry market fields only. */
import { median, quantile } from "./stats";

export type CompRow = { txn_date: string; rooms: number | null; size_sqft: number; price: number; price_psf: number; off_plan: boolean | null };
export type CompFilter = { rooms: "all" | 0 | 1 | 2 | 3; status: "all" | "ready" | "offplan" };

export const DEFAULT_FILTER: CompFilter = { rooms: "all", status: "all" };

export function filterComps(rows: CompRow[], f: CompFilter): CompRow[] {
  return rows.filter((r) => {
    if (f.rooms !== "all") {
      if (r.rooms == null) return false;
      if (f.rooms === 3 ? r.rooms < 3 : r.rooms !== f.rooms) return false;
    }
    if (f.status === "ready" && r.off_plan !== false) return false;
    if (f.status === "offplan" && r.off_plan !== true) return false;
    return true;
  });
}

export type CompSummary = { count: number; medianPsf: number | null; lowPsf: number | null; highPsf: number | null; from: string | null; to: string | null };

/** Median and middle-half range need 5 or more sales; below that only the count and dates are given. */
export function summariseComps(rows: CompRow[]): CompSummary {
  const dates = rows.map((r) => r.txn_date).sort();
  const base = { count: rows.length, from: dates[0] ?? null, to: dates[dates.length - 1] ?? null };
  if (rows.length < 5) return { ...base, medianPsf: null, lowPsf: null, highPsf: null };
  const psf = rows.map((r) => r.price_psf).sort((a, b) => a - b);
  return { ...base, medianPsf: median(psf), lowPsf: quantile(psf, 0.25), highPsf: quantile(psf, 0.75) };
}
