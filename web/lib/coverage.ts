/** Plain wording for how far a page's evidence reaches: what has been hand-checked, how fresh the files are,
 *  and what to say when a community or building has little or nothing. Describes only; no verdicts. */
import { isLaunchCommunity } from "./communities";

export type ReviewStatus = { checked: boolean; label: string; detail: string };

/** Launch areas are hand-checked; every other community is matched automatically from DLD names. */
export function reviewStatus(dmCode: string | number | null | undefined): ReviewStatus {
  if (isLaunchCommunity(dmCode)) {
    return { checked: true, label: "Hand-checked area", detail: "Building names, groupings and the top buildings by sales were checked by hand against the DLD files." };
  }
  return {
    checked: false,
    label: "Matched automatically, not yet hand-checked",
    detail: "Buildings here were matched from DLD names by a program. Names, groupings and map positions may be wrong or missing. Area figures are not affected by matching.",
  };
}

export type Stamps = { salesTo?: string | null; rentsTo?: string | null; projectsAsOf?: string | null };

const fmt = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

/** "Sales to 30 Oct 2026 · Rents to 2 Nov 2026 · Projects file 6 Jul 2026". Missing dates say so rather than vanish. */
export function freshnessParts(s: Stamps): string[] {
  const part = (label: string, v: string | null | undefined) => `${label} ${v && fmt(v) ? fmt(v) : "date not available"}`;
  return [part("Sales to", s.salesTo), part("Rents to", s.rentsTo), part("Projects file", s.projectsAsOf)];
}

/** Whole days between two ISO dates, or null when either is missing. */
export function ageDays(from: string | null | undefined, today: Date): number | null {
  if (!from) return null;
  const d = new Date(`${from.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86_400_000));
}

export type EvidenceState = "none" | "thin" | "ok";

/** What a page can honestly say, from the counted sales in the last 12 months (same 3-sale floor as medians). */
export function evidenceState(sales12m: number | null | undefined): EvidenceState {
  const n = sales12m ?? 0;
  return n === 0 ? "none" : n < 3 ? "thin" : "ok";
}

export const EMPTY_TEXT = {
  noSales: "No apartment sales were counted here in the last 12 months, so there is no price figure. That is a gap in the data, not a price of zero.",
  thinSales: "Fewer than 3 sales were counted in the last 12 months, so medians are not shown. Treat anything here as a single example, not a typical price.",
  noBuildings: "No building pages exist for this area yet. Area figures above still use every apartment record in the area; they are just not split by tower.",
  noRents: "No rent contracts could be tied to this building or its project in the last 12 months, so no rent or yield is shown.",
} as const;
