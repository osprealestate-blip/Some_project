import { GOOD_COMPS, MIN_COMPS } from "@/lib/fairPrice";

/** How much weight the headline figures can bear, from the number of counted sales in the last 12 months.
 *  Same thresholds as the fair-price checker (lib/fairPrice.ts), so the two never disagree. */
export type Confidence = { level: "good" | "limited" | "low"; label: string; detail: string };

export function dataConfidence(saleCount: number | null | undefined): Confidence {
  const n = saleCount ?? 0;
  if (n >= GOOD_COMPS) return { level: "good", label: "Good", detail: `${n} sales in 12 months` };
  if (n >= MIN_COMPS) return { level: "limited", label: "Limited", detail: `${n} sales in 12 months, so treat figures as a rough guide` };
  return { level: "low", label: "Low", detail: n === 0 ? "no counted sales in 12 months" : `only ${n} sale${n === 1 ? "" : "s"} in 12 months, too few for a reliable median` };
}
