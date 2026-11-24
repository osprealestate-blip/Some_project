import type { MetadataRoute } from "next";
import { LAUNCH_CODES } from "@/lib/communities";
import { hasDatabase } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { masterCommunitySlugs, sitemapEntries, visibleBuildingSlugs, visibleCommunityCodes } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Pages that work without data are always listed; building and community pages are added when the database is reachable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  let codes: string[] = [];
  let masters: string[] = [];
  if (hasDatabase()) {
    try { [slugs, codes] = await Promise.all([visibleBuildingSlugs(), visibleCommunityCodes()]); } catch { /* list the fixed pages only */ }
    try { masters = await masterCommunitySlugs(); } catch { /* official areas only */ }
  }
  const official = codes.length ? [...new Set([...LAUNCH_CODES, ...codes])] : LAUNCH_CODES;
  return sitemapEntries(siteUrl(), slugs, [...official, ...masters]);
}
