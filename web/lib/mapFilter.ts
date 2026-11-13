import { FACILITIES, type FacilityId } from "./facilities";

/** A filter on the map, kept in the URL as ?f=near:metro, ?f=dev:Emaar or ?f=area:392 so a link shares it. */
export type MapFilter = { type: "near"; value: FacilityId } | { type: "dev"; value: string } | { type: "area"; value: string };

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
  return null;
}

export const filterParam = (f: MapFilter) => `${f.type}:${f.value}`;

const WORD: Record<FacilityId, string> = { metro: "a metro station", hospital: "a hospital", school: "a school", mall: "a mall", park: "a park" };
export function nearLabel(kind: FacilityId): string {
  const km = NEAR_RADIUS_M[kind] / 1000;
  return `Within ${km} km of ${WORD[kind]} (straight-line)`;
}

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
