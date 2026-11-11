import type { MetadataRoute } from "next";
import { hasDatabase } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { sitemapEntries, visibleBuildingSlugs } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Pages that work without data are always listed; building pages are added when the database is reachable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  if (hasDatabase()) {
    try { slugs = await visibleBuildingSlugs(); } catch { /* list the fixed pages only */ }
  }
  return sitemapEntries(siteUrl(), slugs);
}
