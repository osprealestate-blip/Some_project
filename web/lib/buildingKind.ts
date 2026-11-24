/** Finer building kinds written by `dpi classify-buildings` (see pipeline/src/dpi/matching/building_kind.py).
 *  A building with no evidence has no kind and shows nothing. Every label is shown with its source and confidence. */
export const KINDS = ["apartments", "villas_townhouses", "hotel_apartments", "office", "retail", "warehouse_industrial", "commercial", "mixed_use",
  "school", "hospital", "clinic", "police", "fire_station", "government", "fuel", "mosque"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABEL: Record<Kind, string> = {
  apartments: "Apartment building", villas_townhouses: "Villas and townhouses", hotel_apartments: "Hotel apartments",
  office: "Office building", retail: "Retail or shops", warehouse_industrial: "Warehouse or industrial", commercial: "Commercial",
  mixed_use: "Mixed-use", school: "School", hospital: "Hospital", clinic: "Clinic", police: "Police station",
  fire_station: "Fire station", government: "Government building", fuel: "Petrol station", mosque: "Mosque",
};

/** The kinds offered as map filters: the ones people look for, grouped on one row each in the menu. */
export const KIND_FILTER_GROUPS: { title: string; kinds: Kind[] }[] = [
  { title: "Homes", kinds: ["apartments", "villas_townhouses", "hotel_apartments"] },
  { title: "Work and shops", kinds: ["office", "retail", "warehouse_industrial"] },
  { title: "Public places", kinds: ["school", "hospital", "clinic", "police", "government", "mosque", "fuel"] },
];

export const isKind = (v: string): v is Kind => (KINDS as readonly string[]).includes(v);

export const SOURCE_NAME: Record<string, string> = {
  dld: "DLD sale and rent records", khda: "KHDA school list", dha: "DHA facility list", osm: "OpenStreetMap", manual: "checked by hand",
};
export const CONFIDENCE_NAME: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export type KindInfo = { kind: Kind; source: string; confidence: string; basis: Record<string, unknown> | null };

/** One line saying where the label comes from, e.g. "Source: DLD sale and rent records (124 records, to 2026-11-10). High confidence." */
export function kindSourceNote(k: KindInfo, t: (s: string, v?: Record<string, string | number>) => string): string {
  const src = t(SOURCE_NAME[k.source] ?? k.source);
  const b = k.basis ?? {};
  const bits: string[] = [];
  if (typeof b.records === "number") bits.push(t("{n} records", { n: b.records }));
  if (typeof b.place === "string") bits.push(t("{place}, {m} m away", { place: b.place, m: Number(b.distance_m ?? 0) }));
  if (b.approx_location) bits.push(t("place position is approximate"));
  if (typeof b.source_date === "string") bits.push(b.source_date.slice(0, 10));
  return `${t("Source")}: ${src}${bits.length ? ` (${bits.join(", ")})` : ""}. ${t(CONFIDENCE_NAME[k.confidence] ?? k.confidence)}.`;
}
