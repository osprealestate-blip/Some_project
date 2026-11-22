/** Which service-charge rate the cost figures use, and how to say where it came from.
 *  Building figure (DLD filed budget, matched by name) beats the community median beats the flat assumption.
 *  Never invents a building-specific number. */
import { DEFAULT_COST_CONFIG } from "@/config/costs";

export type BuildingServiceCharge = { psf: number; ac_psf: number | null; budget_year: number; assoc_name: string; source_date: string };
export type CommunityServiceCharge = { median: number; n: number };

export type ServiceCharge = {
  psf: number;
  kind: "building" | "community" | "assumed";
  /** One line saying what the figure is. */
  label: string;
  year: number | null;
  acPsf: number | null;
};

const MIN_COMMUNITY = 10; // buildings with a filed figure before a community median is shown

export function resolveServiceCharge(b: BuildingServiceCharge | null, c: CommunityServiceCharge | null): ServiceCharge {
  if (b) {
    return { psf: b.psf, kind: "building", year: b.budget_year, acPsf: b.ac_psf,
      label: `AED ${b.psf.toFixed(2)} per sq ft a year, ${b.budget_year} approved budget (${b.assoc_name})` };
  }
  if (c && c.n >= MIN_COMMUNITY) {
    const psf = Math.round(c.median * 10) / 10;
    return { psf, kind: "community", year: null, acPsf: null,
      label: `AED ${psf} per sq ft a year, assumed: the median of ${c.n} buildings in this area with a filed budget` };
  }
  const psf = DEFAULT_COST_CONFIG.serviceChargePsf;
  return { psf, kind: "assumed", year: null, acPsf: null, label: `AED ${psf} per sq ft a year, assumed (no filed figure for this building)` };
}
