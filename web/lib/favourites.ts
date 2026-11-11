/** Saved buildings ("favourites"). The list lives in this browser only (localStorage): no account, nothing sent to a server.
 *  Only building slugs are stored. Figures are always read fresh from the database, so they keep their source and date. */
import type { CompareFigures } from "./compare";
import { DISCLAIMER, SOURCES } from "./sources";

export const FAVOURITES_KEY = "dpi-favourites";
export const MAX_FAVOURITES = 30;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** "a,b,c" or a stored JSON array -> distinct, well-formed slugs in order, at most MAX_FAVOURITES. */
export function cleanSlugs(input: unknown): string[] {
  const parts = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const out: string[] = [];
  for (const p of parts) {
    if (typeof p !== "string") continue;
    const s = p.trim().toLowerCase();
    if (SLUG.test(s) && !out.includes(s)) out.push(s);
    if (out.length === MAX_FAVOURITES) break;
  }
  return out;
}

export function parseStored(raw: string | null): string[] {
  if (!raw) return [];
  try { return cleanSlugs(JSON.parse(raw)); } catch { return []; }
}

/** Adds or removes a slug. Adding to a full list leaves it unchanged (the caller shows a message). */
export function toggle(list: string[], slug: string): string[] {
  if (list.includes(slug)) return list.filter((s) => s !== slug);
  return list.length >= MAX_FAVOURITES ? list : [...list, slug];
}

export function favouritesHref(slugs: string[]): string {
  return slugs.length ? `/favourites?ids=${slugs.join(",")}` : "/favourites";
}

/** Reads the saved list. Storage can be blocked or full, so every access is guarded. */
export function readFavourites(): string[] {
  try { return parseStored(localStorage.getItem(FAVOURITES_KEY)); } catch { return []; }
}

export function writeFavourites(list: string[]): boolean {
  try { localStorage.setItem(FAVOURITES_KEY, JSON.stringify(list)); } catch { return false; }
  try { window.dispatchEvent(new Event("dpi-favourites")); } catch { /* ignore */ }
  return true;
}

// ---------- CSV ----------

/** Quotes a cell. A leading = + - @ is neutralised so spreadsheets do not run it as a formula. */
export function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = [
  "Building", "Area", "Sales in last 12 months", "Median sale price (AED)", "Median price per sq ft (AED)",
  "Change on a year earlier (%)", "Median annual rent (AED)", "Rent figure is for", "Gross yield, estimate (%)", "Data up to", "Building page",
];

/** The saved buildings as CSV. Amounts are in AED whatever currency the site shows. `origin` is optional, for full links. */
export function favouritesCsv(figs: CompareFigures[], rentBasis: (f: CompareFigures) => string, origin = ""): string {
  const round = (n: number | null, d = 0) => (n == null ? null : Number(n.toFixed(d)));
  const lines = [HEADER.map(csvCell).join(",")];
  for (const f of figs) {
    lines.push([
      f.name, f.community, f.sales12m, round(f.medianPrice), round(f.psf), round(f.psfChange == null ? null : f.psfChange * 100, 1),
      round(f.rent), rentBasis(f), round(f.grossYield == null ? null : f.grossYield * 100, 1), f.periodEnd, `${origin}/building/${f.slug}`,
    ].map(csvCell).join(","));
  }
  lines.push("");
  lines.push(csvCell(`Source: ${SOURCES.dldSales}; ${SOURCES.dldRents}. Apartments only; 12 months to each building's newest sale.`));
  lines.push(csvCell(DISCLAIMER));
  return lines.join("\r\n") + "\r\n";
}
