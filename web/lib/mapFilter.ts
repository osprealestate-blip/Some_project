import { FACILITIES, type FacilityId } from "./facilities";
import { isKind, KIND_LABEL, type Kind } from "./buildingKind";
import { makeT, type T } from "./i18n";

export const USE_FILTERS = ["residential", "commercial", "mixed"] as const;
export type UseFilter = (typeof USE_FILTERS)[number];

/** A filter on the map, kept in the URL as ?f=near:metro, ?f=dev:Emaar or ?f=area:392 or ?f=master:dubai-marina so a link shares it. */
export type MapFilter = { type: "near"; value: FacilityId } | { type: "dev"; value: string } | { type: "area"; value: string } | { type: "master"; value: string } | { type: "under"; value: string } | { type: "use"; value: UseFilter } | { type: "kind"; value: Kind };

/** Straight-line radius for "near a ...". Short for things you walk to, longer for a hospital or a school. */
export const NEAR_RADIUS_M: Record<FacilityId, number> = { metro: 800, hospital: 2000, school: 1500, mall: 1500, park: 800 };

export function parseFilter(raw: string | null): MapFilter | null {
  if (!raw) return null;
  const i = raw.indexOf(":");
  if (i < 1) return null;
  const type = raw.slice(0, i), value = raw.slice(i + 1).trim().slice(0, 80);
  if (!value) return null;
  if (type === "near") return FACILITIES.some((f) => f.id === value) ? { type, value: value as FacilityId } : null;
  if (type === "dev") return { type, value };
  if (type === "area") return /^\d{1,4}$/.test(value) ? { type, value } : null;
  if (type === "master") return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) ? { type, value } : null; // a master community's link name, e.g. azizi-venice
  if (type === "under") return /^\d{5,9}$/.test(value) ? { type, value } : null; // median sale price ceiling in AED
  if (type === "use") return (USE_FILTERS as readonly string[]).includes(value) ? { type, value: value as UseFilter } : null;
  if (type === "kind") return isKind(value) ? { type, value } : null;
  return null;
}

export const filterParam = (f: MapFilter) => `${f.type}:${f.value}`;

export const USE_LABEL: Record<UseFilter, string> = { residential: "Residential buildings", commercial: "Commercial buildings", mixed: "Mixed-use buildings" };

export const A_PLACE: Record<FacilityId, string> = { metro: "a metro station", hospital: "a hospital", school: "a school", mall: "a mall", park: "a park" };
export function filterLabel(f: MapFilter, t: T = makeT("en"), area?: string): string {
  if (f.type === "near") return t("Within {km} km of {place} (straight-line)", { km: NEAR_RADIUS_M[f.value] / 1000, place: t(A_PLACE[f.value]) });
  if (f.type === "dev") return t("Developer: {name}", { name: f.value });
  if (f.type === "use") return t(USE_LABEL[f.value]);
  if (f.type === "kind") return t(KIND_LABEL[f.value]);
  if (f.type === "under") { const v = Number(f.value); return t("Median sale price under AED {n}", { n: v >= 1e6 ? Math.round(v).toLocaleString("en-US") : `${Math.round(v / 1000)}K` }); }
  return area ?? t("Area");
}
export const nearLabel = (kind: FacilityId) => filterLabel({ type: "near", value: kind });

const WORDS: [FacilityId, string[]][] = [
  ["metro", ["metro", "station", "train", "subway"]], ["hospital", ["hospital", "clinic", "medical"]], ["school", ["school", "nursery"]],
  ["mall", ["mall", "shopping", "shop"]], ["park", ["park", "green", "garden"]],
];

/** "near a metro", "close to schools", "metr": which facility kinds the words point at. A word counts when it is a keyword
 *  (or its plural), or a start of one at least 4 letters long. */
export function facilityIntent(q: string): FacilityId[] {
  const words = q.toLowerCase().replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !["near", "close", "next", "the", "and", "walk", "distance"].includes(w));
  const out: FacilityId[] = [];
  for (const w of words) for (const [id, kws] of WORDS) if (!out.includes(id) && kws.some((k) => w === k || w === `${k}s` || (w.length >= 4 && k.startsWith(w)))) out.push(id);
  return out;
}
