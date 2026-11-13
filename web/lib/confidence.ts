import { GOOD_COMPS, MIN_COMPS } from "@/lib/fairPrice";
import { makeT, type T } from "@/lib/i18n";

/** How much weight the headline figures can bear, from the number of counted sales in the last 12 months.
 *  Same thresholds as the fair-price checker (lib/fairPrice.ts), so the two never disagree. */
export type Confidence = { level: "good" | "limited" | "low"; label: string; detail: string };

export function dataConfidence(saleCount: number | null | undefined, t: T = makeT("en")): Confidence {
  const n = saleCount ?? 0;
  if (n >= GOOD_COMPS) return { level: "good", label: t("Good"), detail: t("{n} sales in 12 months", { n }) };
  if (n >= MIN_COMPS) return { level: "limited", label: t("Limited"), detail: t("{n} sales in 12 months, so treat figures as a rough guide", { n }) };
  return { level: "low", label: t("Low"), detail: n === 0 ? t("no counted sales in 12 months") : t(n === 1 ? "only {n} sale in 12 months, too few for a reliable median" : "only {n} sales in 12 months, too few for a reliable median", { n }) };
}
