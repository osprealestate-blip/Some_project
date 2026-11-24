import type { MetadataRoute } from "next";
import { hasDatabase } from "@/lib/db";
import { LAUNCH_CODES } from "@/lib/communities";
import { siteUrl } from "@/lib/site";
import { sitemapEntries, visibleBuildingSlugs, visibleCommunityCodes } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Pages that work without data are always listed; building pages are added when the database is reachable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  let codes: string[] = [];
  if (hasDatabase()) {
    try { [slugs, codes] = await Promise.all([visibleBuildingSlugs(), visibleCommunityCodes()]); } catch { /* list the fixed pages only */ }
  }
  return sitemapEntries(siteUrl(), slugs, codes.length ? [...new Set([...LAUNCH_CODES, ...codes])] : LAUNCH_CODES);
}
