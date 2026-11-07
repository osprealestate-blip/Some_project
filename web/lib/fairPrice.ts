/** M5 fair-price checker. Compares an asking price with counted DLD sales of the same bedroom type.
 *  The result is an estimate, never a valuation. */

export type Comparables = {
  scope: "building" | "community";
  count: number;
  p25Psf: number;
  medianPsf: number;
  p75Psf: number;
  from: string; // first sale date in the window
  to: string; // last sale date in the window
};

export type Verdict = "well_below" | "below" | "in_line" | "above" | "well_above";

export type FairPriceResult = {
  estimate: number;
  low: number;
  high: number;
  askingPsf: number | null;
  diff: number | null; // asking vs estimate, as a fraction
  verdict: Verdict | null;
  confidence: "good" | "limited";
  comps: Comparables;
};

export const MIN_COMPS = 5;
export const GOOD_COMPS = 15;

export function verdictFor(rawDiff: number): Verdict {
  const diff = Math.round(rawDiff * 10000) / 10000; // 0.0500000001 is still 5%
  if (diff <= -0.15) return "well_below";
  if (diff < -0.05) return "below";
  if (diff <= 0.05) return "in_line";
  if (diff <= 0.15) return "above";
  return "well_above";
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  well_below: "Well below recent sales",
  below: "Below recent sales",
  in_line: "In line with recent sales",
  above: "Above recent sales",
  well_above: "Well above recent sales",
};

/** Returns null when there are too few comparable sales to say anything. */
export function assessPrice(sizeSqft: number, asking: number | null, comps: Comparables | null): FairPriceResult | null {
  if (!comps || comps.count < MIN_COMPS || !(sizeSqft > 0)) return null;
  const r = (n: number) => Math.round(n / 1000) * 1000; // no false precision
  const estimate = r(comps.medianPsf * sizeSqft);
  const low = r(Math.min(comps.p25Psf, comps.medianPsf) * sizeSqft);
  const high = r(Math.max(comps.p75Psf, comps.medianPsf) * sizeSqft);
  const hasAsking = asking != null && asking > 0;
  const diff = hasAsking ? asking / estimate - 1 : null;
  return {
    estimate,
    low,
    high,
    askingPsf: hasAsking ? asking / sizeSqft : null,
    diff,
    verdict: diff == null ? null : verdictFor(diff),
    confidence: comps.count >= GOOD_COMPS && comps.scope === "building" ? "good" : "limited",
    comps,
  };
}
