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

/** Change from `before` to `now` as a fraction (0.05 = +5%), or null when either side is missing. */
export function change(now: number | null | undefined, before: number | null | undefined): number | null {
  if (now == null || before == null || before === 0) return null;
  return now / before - 1;
}
