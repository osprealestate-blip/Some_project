/** "What changed" for saved buildings, kept in this browser only. For each saved building we remember the figures as they were
 *  at the previous data date, and describe the difference to the current ones. No account, nothing sent anywhere.
 *  Differences are described, not judged. */
export type Snap = { periodEnd: string; sales12m: number | null; psf: number | null; rent: number | null };
export type Record = { base: Snap | null; cur: Snap };
export type Store = { [slug: string]: Record };

export const SNAP_KEY = "dpi-snapshots";

/** Adds the current figures. A new data date moves the old "current" to "base"; the same date changes nothing. */
export function update(rec: Record | undefined, cur: Snap): Record {
  if (!rec) return { base: null, cur };
  if (rec.cur.periodEnd === cur.periodEnd) return { base: rec.base, cur };
  return { base: rec.cur, cur };
}

const pctChange = (a: number | null, b: number | null) => (a == null || b == null || a === 0 ? null : b / a - 1);
const signed = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;

/** Plain sentences, or null when there is no earlier data date to compare with. */
export function describeChange(rec: Record | undefined): string[] | null {
  if (!rec?.base || rec.base.periodEnd === rec.cur.periodEnd) return null;
  const { base, cur } = rec;
  const out: string[] = [];
  if (base.sales12m != null && cur.sales12m != null) out.push(`Sales in 12 months: ${base.sales12m} then, ${cur.sales12m} now.`);
  const p = pctChange(base.psf, cur.psf);
  if (p != null) out.push(`Median price per sq ft ${signed(p)}.`);
  const r = pctChange(base.rent, cur.rent);
  if (r != null) out.push(`Median rent ${signed(r)}.`);
  if (!out.length) out.push("Not enough figures on both dates to compare.");
  return out;
}

export function readStore(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Store) : {};
  } catch { return {}; }
}

export function writeStore(s: Store): void {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(s)); } catch { /* storage blocked or full: skip */ }
}
