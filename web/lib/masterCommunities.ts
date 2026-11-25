/** Master communities: the groups people search for (Dubai Marina, Azizi Venice, Dubai South ...), set on each building by
 *  `dpi group-complexes` (buildings.master_community). They are not the official Dubai Municipality areas, which stay
 *  at /community/<number>. Everything here is plain functions, so it can be tested without a database. */
import type { EvidenceLevel } from "./evidenceProfile";

export type { EvidenceLevel };

/** "Jumeirah Village Circle (JVC)" -> "jumeirah-village-circle". The abbreviation in brackets is accepted as a short link (/community/jvc). */
export function masterSlug(name: string): string {
  return name
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function masterAbbreviation(name: string): string | null {
  const m = /\(([A-Za-z0-9 ]{2,10})\)/.exec(name);
  return m ? m[1].trim().toLowerCase().replace(/\s+/g, "-") : null;
}

/** The master community a URL part points at: its slug, or its bracketed abbreviation. null when none matches. */
export function findMaster(part: string, names: readonly string[]): string | null {
  const p = part.trim().toLowerCase();
  if (!p) return null;
  return names.find((n) => masterSlug(n) === p) ?? names.find((n) => masterAbbreviation(n) === p) ?? null;
}

/** Master communities whose building names and groupings were checked by hand (the three launch areas). */
export const HAND_CHECKED_MASTERS: readonly string[] = ["Dubai Marina", "Jumeirah Village Circle (JVC)", "Business Bay"];
export const isHandChecked = (name: string) => HAND_CHECKED_MASTERS.includes(name);

/** Names people use. A first pass for a native Arabic speaker to review, like the rest of the Arabic text. */
export const MASTER_AR: Record<string, string> = {
  "Dubai Marina": "دبي مارينا", "Business Bay": "الخليج التجاري", "Jumeirah Village Circle (JVC)": "قرية جميرا الدائرية",
  "Downtown Dubai": "وسط مدينة دبي", "Palm Jumeirah": "نخلة جميرا", "Jumeirah Lake Towers (JLT)": "أبراج بحيرات جميرا",
  "Dubai Hills Estate": "دبي هيلز استيت", "Dubai South": "دبي الجنوب", "Dubailand": "دبي لاند", "International City": "المدينة العالمية",
  "Jebel Ali": "جبل علي", "Dubai Investment Park (DIP)": "مجمع دبي للاستثمار", "Palm Deira": "نخلة ديرة", "Arjan": "الأرجان",
  "Meydan": "ميدان", "Motor City": "مدينة السيارات", "Discovery Gardens": "ديسكفري جاردنز", "Dubai Sports City": "مدينة دبي الرياضية",
  "Dubai Maritime City": "مدينة دبي البحرية", "Dubai Production City (IMPZ)": "مدينة دبي للإنتاج", "Remraam": "رمرام",
  "Dubai Creek Harbour": "ميناء خور دبي", "Warsan": "ورسان", "Town Square": "تاون سكوير", "Al Jaddaf": "الجداف",
  "Mohammed Bin Rashid City (MBR City)": "مدينة محمد بن راشد", "Azizi Venice": "عزيزي فينيسيا", "Jumeirah": "جميرا",
  "DAMAC Hills": "داماك هيلز", "Nad Al Sheba": "ند الشبا", "City Walk": "سيتي ووك", "Jumeirah Garden City": "مدينة جميرا جاردن",
  "Al Wasl": "الوصل", "DAMAC Lagoons": "داماك لاجونز", "Umm Suqeim": "أم سقيم", "Bu Kadra": "بو كدرة",
  "Dubai Industrial City": "مدينة دبي الصناعية", "Al Hebiah": "الهبية", "Dubai Studio City": "مدينة دبي للاستوديوهات",
  "Al Merkadh": "المرخ", "Emaar Beachfront": "إعمار بيتش فرونت", "Mirdif": "مردف", "Za'abeel": "زعبيل", "Dubai Harbour": "دبي هاربر",
  "Dubai Festival City": "مدينة دبي للمهرجانات", "Al Furjan": "الفرجان", "Bluewaters Island": "جزيرة بلوواترز", "Muhaisnah": "محيصنة",
  "Al Kifaf": "الكيفاف", "Al Qouz": "القوز", "Al Barari": "البراري", "Al Sufouh": "السفوح", "Ras Al Khor Industrial": "رأس الخور الصناعية",
  "Trade Center": "المركز التجاري", "Hessyan": "حصيان", "Jumeira Bay": "جزيرة خليج جميرا", "Dubai Internet City": "مدينة دبي للإنترنت",
  "The World Islands": "جزر العالم", "Dubai Land Residence Complex (DLRC)": "مجمع دبي لاند السكني",
  "Jumeirah Beach Residence (JBR)": "جميرا بيتش ريزيدنس", "Nadd Al Hamar": "ند الحمر", "Palm Jebel Ali": "نخلة جبل علي",
  "Expo City": "مدينة إكسبو", "Umm Hurair": "أم هرير", "Al Yufrah": "اليفرة", "Al Barsha": "البرشاء", "Al Barsha South": "البرشاء جنوب",
  "Al Thanyah": "الثنية", "Port Saeed": "بور سعيد", "Al Qusais Industrial": "القصيص الصناعية", "Riggat Al Buteen": "رقة البطين",
  "Jumeirah Village Triangle (JVT)": "قرية جميرا المثلثة", "Dubai Silicon Oasis": "واحة دبي للسيليكون",
};

export const masterNameAr = (name: string): string | null => MASTER_AR[name] ?? null;

// ---------- evidence ----------

export type MasterEvidenceInput = {
  buildings: number;
  placed: number;
  sales12m: number;
  rents12m: number;
  handChecked: boolean;
};
export type MasterEvidenceRow = { id: "sales" | "rents" | "position" | "names"; label: string; level: EvidenceLevel; detail: string; vars?: Record<string, number> };

/** What we hold for a community, row by row. Describes only: no score, no verdict. Same sales floor (3) as the medians.
 *  `detail` is a sentence frame with {n} / {p} placeholders (filled from `vars` after translating). */
export function masterEvidence(i: MasterEvidenceInput): MasterEvidenceRow[] {
  const s = i.sales12m;
  const sales: MasterEvidenceRow =
    s >= 3 ? { id: "sales", label: "Sales", level: "Available", detail: "{n} apartment sales counted in 12 months (DLD).", vars: { n: s } }
    : s > 0 ? { id: "sales", label: "Sales", level: "Partial", detail: s === 1 ? "Only {n} sale in 12 months, too few for a median (DLD)." : "Only {n} sales in 12 months, too few for a median (DLD).", vars: { n: s } }
    : { id: "sales", label: "Sales", level: "Not available", detail: "No apartment sales counted in 12 months." };
  const r = i.rents12m;
  const rents: MasterEvidenceRow =
    r >= 30 ? { id: "rents", label: "Rents", level: "Available", detail: "{n} rent contracts tied to these buildings or their projects in 12 months (Ejari).", vars: { n: r } }
    : r >= 3 ? { id: "rents", label: "Rents", level: "Partial", detail: "{n} rent contracts tied to these buildings or their projects in 12 months. A small sample.", vars: { n: r } }
    : { id: "rents", label: "Rents", level: "Not available", detail: "Too few rent contracts could be tied to these buildings to show a rent or a yield." };
  const p = i.placed;
  const position: MasterEvidenceRow =
    i.buildings === 0 ? { id: "position", label: "Map positions", level: "Not available", detail: "No buildings listed yet." }
    : p >= i.buildings ? { id: "position", label: "Map positions", level: "Available", detail: "All {n} buildings are on the map.", vars: { n: i.buildings } }
    : p > 0 ? { id: "position", label: "Map positions", level: "Partial", detail: "{p} of {n} buildings are on the map; the rest are listed but not placed yet.", vars: { p, n: i.buildings } }
    : { id: "position", label: "Map positions", level: "Not available", detail: "None of these buildings is placed on the map yet." };
  const names: MasterEvidenceRow = i.handChecked
    ? { id: "names", label: "Building names", level: "Available", detail: "Names, groupings and the busiest buildings were checked by hand against the DLD files." }
    : { id: "names", label: "Building names", level: "Partial", detail: "Matched automatically from DLD names, not yet hand-checked. Names, groupings and positions may be wrong or missing." };
  return [sales, rents, position, names];
}

/** Which headline state a community page is in. `none`: nothing counted; `thin`: fewer than 3 sales or buildings. */
export type CommunityState = "none" | "thin" | "ok";
export function communityState(sales12m: number | null | undefined, buildings: number): CommunityState {
  const n = sales12m ?? 0;
  if (buildings === 0) return "none";
  if (n === 0) return "none";
  return n < 3 ? "thin" : "ok";
}

// ---------- the buildings list ----------

export type MasterBuilding = {
  slug: string;
  name: string;
  complexKey: string | null;
  complexName: string | null;
  developer: string | null;
  year: number | null;
  use: string | null;
  sales: number;
  offplanSales: number;
  psf: number | null;
  rent: number | null;
  rentLevel: "building" | "estimated" | "project" | null;
  yield: number | null;
  placed: boolean;
};

export type Readiness = "all" | "ready" | "offplan";
export type SortKey = "sales" | "psf-high" | "psf-low" | "yield" | "rent" | "name";
export const SORT_KEYS: readonly SortKey[] = ["sales", "psf-high", "psf-low", "yield", "rent", "name"];

/** A building is "off-plan" when more than half of its sales in the last 12 months were off-plan (DLD registration type). */
export function isOffPlan(b: Pick<MasterBuilding, "sales" | "offplanSales">): boolean {
  return b.sales > 0 && b.offplanSales * 2 > b.sales;
}

export function filterBuildings(rows: MasterBuilding[], opts: { q?: string; ready?: Readiness }): MasterBuilding[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  return rows.filter((b) => {
    if (q && !`${b.name} ${b.complexName ?? ""} ${b.developer ?? ""}`.toLowerCase().includes(q)) return false;
    if (opts.ready === "offplan") return isOffPlan(b);
    if (opts.ready === "ready") return b.sales > 0 && !isOffPlan(b);
    return true;
  });
}

/** Rows without the figure always go last, whatever the direction, so a sort never opens on empty cells. */
export function sortBuildings(rows: MasterBuilding[], key: SortKey): MasterBuilding[] {
  const num = (f: (b: MasterBuilding) => number | null, dir: 1 | -1) => (a: MasterBuilding, b: MasterBuilding) => {
    const x = f(a), y = f(b);
    if (x == null && y == null) return a.name.localeCompare(b.name);
    if (x == null) return 1;
    if (y == null) return -1;
    return x === y ? a.name.localeCompare(b.name) : (x - y) * dir;
  };
  const out = rows.slice();
  if (key === "name") return out.sort((a, b) => a.name.localeCompare(b.name));
  if (key === "psf-high") return out.sort(num((b) => b.psf, -1));
  if (key === "psf-low") return out.sort(num((b) => b.psf, 1));
  if (key === "yield") return out.sort(num((b) => b.yield, -1));
  if (key === "rent") return out.sort(num((b) => b.rent, -1));
  return out.sort(num((b) => (b.sales > 0 ? b.sales : null), -1));
}

export type BuildingGroup = {
  key: string;
  name: string;
  towers: MasterBuilding[];
  sales: number;
  psfLow: number | null;
  psfHigh: number | null;
};

/** Sibling towers (Azizi Venice 14, buildings A to G) as one row. A building with no complex stands alone. Counts add up
 *  exactly; a median cannot be added, so the group shows the range of its towers' medians, not one number. */
export function groupBuildings(rows: MasterBuilding[]): BuildingGroup[] {
  const map = new Map<string, BuildingGroup>();
  for (const b of rows) {
    const key = b.complexKey ?? `solo:${b.slug}`;
    let g = map.get(key);
    if (!g) { g = { key, name: b.complexName ?? b.name, towers: [], sales: 0, psfLow: null, psfHigh: null }; map.set(key, g); }
    g.towers.push(b);
    g.sales += b.sales;
    if (b.psf != null) {
      g.psfLow = g.psfLow == null ? b.psf : Math.min(g.psfLow, b.psf);
      g.psfHigh = g.psfHigh == null ? b.psf : Math.max(g.psfHigh, b.psf);
    }
  }
  return [...map.values()];
}

export function sortGroups(groups: BuildingGroup[], key: "sales" | "name"): BuildingGroup[] {
  const out = groups.slice();
  return key === "name" ? out.sort((a, b) => a.name.localeCompare(b.name)) : out.sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name));
}

// ---------- the index ----------

export type IndexSort = "sales" | "psf-high" | "psf-low" | "buildings" | "name";
export type IndexRow = {
  name: string;
  slug: string;
  buildings: number;
  placed: number;
  sales: number;
  psf: number | null;
  rent: number | null;
  yield: number | null;
  yoy: number | null;
  handChecked: boolean;
};

export function sortIndex(rows: IndexRow[], key: IndexSort): IndexRow[] {
  const out = rows.slice();
  const byName = (a: IndexRow, b: IndexRow) => a.name.localeCompare(b.name);
  const withFigure = (f: (r: IndexRow) => number | null, dir: 1 | -1) => (a: IndexRow, b: IndexRow) => {
    const x = f(a), y = f(b);
    if (x == null && y == null) return byName(a, b);
    if (x == null) return 1;
    if (y == null) return -1;
    return x === y ? byName(a, b) : (x - y) * dir;
  };
  if (key === "name") return out.sort(byName);
  if (key === "psf-high") return out.sort(withFigure((r) => r.psf, -1));
  if (key === "psf-low") return out.sort(withFigure((r) => r.psf, 1));
  if (key === "buildings") return out.sort((a, b) => b.buildings - a.buildings || byName(a, b));
  return out.sort((a, b) => b.sales - a.sales || byName(a, b));
}

export function filterIndex(rows: IndexRow[], q: string, onlyWithPrices: boolean): IndexRow[] {
  const s = q.trim().toLowerCase();
  return rows.filter((r) => (!s || `${r.name} ${masterNameAr(r.name) ?? ""}`.toLowerCase().includes(s)) && (!onlyWithPrices || r.psf != null));
}

// ---------- search engines ----------

export function masterTitle(name: string): string {
  return `${name} apartments: prices, rents and yields`;
}
export function masterDescription(name: string): string {
  return `Apartment sale prices, rents and gross yields in ${name}, building by building, from Dubai Land Department data. Compare towers, developments and off-plan against ready.`;
}

/** Master communities whose official Dubai Municipality polygon is mostly planned, unbuilt sea (the polygon is the
 *  whole planned island, not what exists). The map draws a dashed outline round their placed buildings instead,
 *  and says nothing where there are none, rather than a huge empty shape. */
export const UNBUILT_OFFICIAL_AREAS: readonly string[] = ["Palm Deira"];
