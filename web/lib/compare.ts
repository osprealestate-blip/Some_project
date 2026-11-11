/** Compare page logic: reading the ?ids= list and turning building figures into table rows.
 *  No winner is ever picked: rows show the figures side by side and nothing is ranked or highlighted. */
import type { Building, RentLevel, Summary } from "./queries";
import { change } from "./stats";

export const MAX_COMPARE = 4;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** "a,b,c" -> up to four distinct, well-formed slugs, in the order given. */
export function parseIds(raw: string | string[] | undefined | null): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const out: string[] = [];
  for (const part of text.split(",")) {
    const s = part.trim().toLowerCase();
    if (SLUG.test(s) && !out.includes(s)) out.push(s);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export function compareHref(slugs: string[]): string {
  return slugs.length ? `/compare?ids=${slugs.slice(0, MAX_COMPARE).join(",")}` : "/compare";
}

export type CompareItem = { building: Building; summaries: Summary[] };

/** Median of the per-bedroom gross yields, as the building page shows it. */
export function midYield(summaries: Summary[]): number | null {
  const ys = summaries.filter((s) => s.rooms >= 0 && s.gross_yield != null).map((s) => s.gross_yield!).sort((a, c) => a - c);
  return ys.length ? ys[Math.floor((ys.length - 1) / 2)] : null;
}

export type CompareFigures = {
  slug: string;
  name: string;
  community: string;
  completionYear: number | null;
  floors: number | null;
  units: number | null;
  sales12m: number | null;
  psf: number | null;
  psfChange: number | null; // fraction, vs the 12 months before
  medianPrice: number | null; // AED
  rent: number | null; // AED a year
  rentLevel: RentLevel;
  rentContracts: number | null;
  grossYield: number | null; // fraction
  periodEnd: string | null;
};

export function figuresFor({ building: b, summaries }: CompareItem): CompareFigures {
  const all = summaries.find((s) => s.rooms === -1);
  return {
    slug: b.slug,
    name: b.name_en,
    community: b.community,
    completionYear: b.completion_year,
    floors: b.floors,
    units: b.unit_count,
    sales12m: all?.sale_count_12m ?? null,
    psf: all?.sale_median_psf_12m ?? null,
    psfChange: change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m),
    medianPrice: all?.sale_median_price_12m ?? null,
    rent: all?.rent_median_12m ?? null,
    rentLevel: all?.rent_level ?? null,
    rentContracts: all?.rent_count_12m ?? null,
    grossYield: midYield(summaries),
    periodEnd: all?.period_end ?? null,
  };
}

export function rentBasis(f: Pick<CompareFigures, "rent" | "rentLevel">): string {
  if (f.rent == null) return "No rent contracts";
  if (f.rentLevel === "project") return "Whole project (rents are filed per project)";
  if (f.rentLevel === "estimated") return "Estimated: some contracts placed by unit size";
  return "This building";
}

/** The newest data date across the compared buildings, for the source line. */
export function latestPeriod(figs: CompareFigures[]): string | null {
  const ds = figs.map((f) => f.periodEnd).filter((d): d is string => !!d).sort();
  return ds.length ? ds[ds.length - 1] : null;
}
