import type { T } from "@/lib/i18n";

export type CompareInput = { name: string; psf: number | null; yield: number | null; sales: number | null; change: number | null };

/** Plain-language differences between 2 to 4 buildings. Only states facts the figures show; never a verdict on which is better.
 *  A gap under 3% (price) or 0.3 points (yield) is not mentioned. */
export function compareDifferences(items: CompareInput[], t: T): string[] {
  const out: string[] = [];
  const pick = (get: (i: CompareInput) => number | null) => {
    const v = items.filter((i) => get(i) != null);
    if (v.length < 2) return null;
    const sorted = [...v].sort((a, b) => (get(a) as number) - (get(b) as number));
    return { lo: sorted[0], hi: sorted[sorted.length - 1] };
  };
  const p = pick((i) => i.psf);
  if (p && (p.hi.psf as number) / (p.lo.psf as number) - 1 >= 0.03) {
    out.push(t("{a} has the highest price per sq ft, {pct}% above {b}, the lowest.", { a: p.hi.name, b: p.lo.name, pct: Math.round(((p.hi.psf as number) / (p.lo.psf as number) - 1) * 100) }));
  }
  const y = pick((i) => i.yield);
  if (y && ((y.hi.yield as number) - (y.lo.yield as number)) * 100 >= 0.3) {
    out.push(t("{a} shows the highest estimated rent return ({hi}%), {b} the lowest ({lo}%).", { a: y.hi.name, b: y.lo.name, hi: ((y.hi.yield as number) * 100).toFixed(1), lo: ((y.lo.yield as number) * 100).toFixed(1) }));
  }
  const s = pick((i) => i.sales);
  if (s && s.hi.sales !== s.lo.sales) {
    out.push(t("{a} has the most recorded sales in 12 months ({hi}) and {b} the fewest ({lo}), so its figures rest on more data.", { a: s.hi.name, b: s.lo.name, hi: s.hi.sales as number, lo: s.lo.sales as number }));
  }
  return out;
}
