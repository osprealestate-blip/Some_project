/** Sitemap contents. Buildings come from the database (the same visibility rule as the building pages). */
import type { MetadataRoute } from "next";
import { LAUNCH_CODES } from "./communities";
import { query } from "./db";
import { masterSlug } from "./masterCommunities";
import { MIN_CONFIDENCE } from "./queries";

/** Pages that do not depend on the database. Search, compare and saved buildings are left out on purpose. */
export const STATIC_PATHS = ["/", "/map", "/communities", "/buildings", "/tools", "/tools/fair-price", "/tools/rent-increase", "/buy", "/off-plan", "/invest", "/market-context", "/own", "/rent", "/how-it-works"];

export function sitemapEntries(base: string, buildingSlugs: string[], communityCodes: readonly string[] = LAUNCH_CODES): MetadataRoute.Sitemap {
  const paths = [...STATIC_PATHS, ...communityCodes.map((c) => `/community/${c}`), ...buildingSlugs.map((s) => `/building/${s}`)];
  return paths.map((p) => ({ url: `${base}${p === "/" ? "" : p}` || base }));
}

/** A page for every master community that has a visible building. Empty where the column is not loaded. */
export async function masterCommunitySlugs(): Promise<string[]> {
  const rows = await query<{ name: string }>("select distinct master_community as name from buildings where master_community is not null and match_confidence >= $1", [MIN_CONFIDENCE]);
  return rows.map((r) => masterSlug(r.name)).sort();
}

export async function visibleBuildingSlugs(): Promise<string[]> {
  const rows = await query<{ slug: string }>("select slug from buildings where match_confidence >= $1 order by slug limit 49000", [MIN_CONFIDENCE]);
  return rows.map((r) => r.slug);
}
