/** One-line plain-English read of a building against its own community. Rules only, no scoring model, and only
 *  figures we already show (12-month DLD medians). It describes; it never says "buy" or "good deal". */
import { GOOD_COMPS, MIN_COMPS } from "@/lib/fairPrice";
import { makeT, type T } from "@/lib/i18n";

export type VerdictInput = {
  psf: number | null;
  yield: number | null; // fraction, 0.065 = 6.5%
  sales: number;
  communityName: string;
  communityPsf: number | null;
  communityYield: number | null;
};

export type Verdict = { text: string; tone: "good" | "neutral" | "caution" };

const PSF_BAND = 0.1; // within 10% of the community median counts as "in line"
const YIELD_BAND = 0.005; // within 0.5 percentage points counts as "similar"

const pc = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;

export function buildingVerdict(v: VerdictInput, t: T = makeT("en")): Verdict | null {
  if (v.sales < MIN_COMPS || v.psf == null) {
    return { text: v.sales === 1 ? t("Only {n} counted sale in 12 months, too few to compare with {name}.", { n: v.sales, name: v.communityName }) : t("Only {n} counted sales in 12 months, too few to compare with {name}.", { n: v.sales, name: v.communityName }), tone: "caution" };
  }
  const parts: string[] = [];
  let tone: Verdict["tone"] = "neutral";
  const name = v.communityName;
  if (v.communityPsf) {
    const d = v.psf / v.communityPsf - 1;
    if (d > PSF_BAND) parts.push(t("Priced {pct} above the {name} median", { pct: pc(d), name }));
    else if (d < -PSF_BAND) parts.push(t("Priced {pct} below the {name} median", { pct: pc(d), name }));
    else parts.push(t("Priced in line with {name}", { name }));
  } else {
    parts.push(t("Median price per sq ft {n} AED", { n: Math.round(v.psf).toLocaleString("en-US") }));
  }
  if (v.yield != null && v.communityYield != null) {
    const d = v.yield - v.communityYield;
    if (d > YIELD_BAND) { parts.push(t("with a higher rent return than the area")); tone = "good"; }
    else if (d < -YIELD_BAND) parts.push(t("with a lower rent return than the area"));
    else parts.push(t("and a similar rent return"));
  } else if (v.yield == null) {
    parts.push(t("rent figures not available"));
  }
  let text = parts[1] ? t("{a}, {b}.", { a: parts[0], b: parts[1] }) : t("{a}.", { a: parts[0] });
  if (v.sales < GOOD_COMPS) { text += ` ${t("Few sales, so treat it as a rough guide.")}`; tone = "caution"; }
  return { text, tone };
}
