import type { MetadataRoute } from "next";
import { LAUNCH_CODES } from "@/lib/communities";
import { hasDatabase } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { masterCommunitySlugs, sitemapEntries, visibleBuildingSlugs } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Pages that work without data are always listed; building pages are added when the database is reachable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  let masters: string[] = [];
  if (hasDatabase()) {
    try { slugs = await visibleBuildingSlugs(); } catch { /* list the fixed pages only */ }
    try { masters = await masterCommunitySlugs(); } catch { /* official areas only */ }
  }
  return sitemapEntries(siteUrl(), slugs, [...LAUNCH_CODES, ...masters]);
}
