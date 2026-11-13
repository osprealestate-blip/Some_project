/** Small number helpers shared by pages and tools. Medians, never means. */

export function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function median(values: number[]): number | null {
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

export type Bin = { from: number; to: number; count: number };

/** Equal-width bins between the smallest and largest value. Needs at least `min` values, else null (too few to draw). */
export function histogram(values: number[], bins = 8, min = 8): Bin[] | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < min) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  if (lo === hi) return null;
  const w = (hi - lo) / bins;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({ from: lo + i * w, to: lo + (i + 1) * w, count: 0 }));
  for (const x of v) out[Math.min(bins - 1, Math.floor((x - lo) / w))].count++;
  return out;
}

/** Change from `before` to `now` as a fraction (0.05 = +5%), or null when either side is missing. */
export function change(now: number | null | undefined, before: number | null | undefined): number | null {
  if (now == null || before == null || before === 0) return null;
  return now / before - 1;
}
