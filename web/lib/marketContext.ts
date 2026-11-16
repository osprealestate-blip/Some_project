/** Helpers for the market-context page. Values are shown as published or as a plain index; nothing is projected. */

/** Each year as a percentage of the first year in the series (first = 100). Missing years stay missing. */
export function indexToFirst(series: Record<string, number>): { year: string; index: number }[] {
  const years = Object.keys(series).sort();
  const base = series[years[0]];
  if (!years.length || !base) return [];
  return years.map((year) => ({ year, index: Math.round((series[year] / base) * 1000) / 10 }));
}

/** Quarter keys like "2026 Q1" in time order, with gaps listed so the page can say so. */
export function quarterGaps(keys: string[]): string[] {
  const set = new Set(keys);
  const sorted = [...keys].sort();
  if (!sorted.length) return [];
  const [fy, fq] = sorted[0].split(" Q").map(Number);
  const [ly, lq] = sorted[sorted.length - 1].split(" Q").map(Number);
  const gaps: string[] = [];
  for (let y = fy, q = fq; y < ly || (y === ly && q <= lq); q === 4 ? (y++, (q = 1)) : q++) {
    const k = `${y} Q${q}`;
    if (!set.has(k)) gaps.push(k);
  }
  return gaps;
}
