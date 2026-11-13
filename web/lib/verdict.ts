/** One-line plain-English read of a building against its own community. Rules only, no scoring model, and only
 *  figures we already show (12-month DLD medians). It describes; it never says "buy" or "good deal". */
import { GOOD_COMPS, MIN_COMPS } from "@/lib/fairPrice";

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

export function buildingVerdict(v: VerdictInput): Verdict | null {
  if (v.sales < MIN_COMPS || v.psf == null) {
    return { text: `Only ${v.sales} counted sale${v.sales === 1 ? "" : "s"} in 12 months, too few to compare with ${v.communityName}.`, tone: "caution" };
  }
  const parts: string[] = [];
  let tone: Verdict["tone"] = "neutral";
  if (v.communityPsf) {
    const d = v.psf / v.communityPsf - 1;
    if (d > PSF_BAND) parts.push(`Priced ${pc(d)} above the ${v.communityName} median`);
    else if (d < -PSF_BAND) parts.push(`Priced ${pc(d)} below the ${v.communityName} median`);
    else parts.push(`Priced in line with ${v.communityName}`);
  } else {
    parts.push(`Median price per sq ft ${Math.round(v.psf).toLocaleString("en-US")} AED`);
  }
  if (v.yield != null && v.communityYield != null) {
    const d = v.yield - v.communityYield;
    if (d > YIELD_BAND) { parts.push("with a higher rent return than the area"); tone = "good"; }
    else if (d < -YIELD_BAND) parts.push("with a lower rent return than the area");
    else parts.push("and a similar rent return");
  } else if (v.yield == null) {
    parts.push("rent figures not available");
  }
  let text = `${parts[0]}${parts[1] ? `, ${parts[1]}` : ""}.`;
  if (v.sales < GOOD_COMPS) { text += " Few sales, so treat it as a rough guide."; tone = "caution"; }
  return { text, tone };
}
