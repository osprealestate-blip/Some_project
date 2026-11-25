import type { MetadataRoute } from "next";
import { LAUNCH_CODES } from "@/lib/communities";
import { hasDatabase } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { masterSlug } from "@/lib/masterCommunities";
import { clusterCommunityCodes, clusterMasterCounts, visibleClusterSlugs } from "@/lib/villaClusterQueries";
import { masterCommunitySlugs, sitemapEntries, visibleBuildingSlugs, visibleCommunityCodes } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** Pages that work without data are always listed; building and community pages are added when the database is reachable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs: string[] = [];
  let codes: string[] = [];
  let masters: string[] = [];
  let clusters: string[] = [];
  if (hasDatabase()) {
    try { [slugs, codes] = await Promise.all([visibleBuildingSlugs(), visibleCommunityCodes()]); } catch { /* list the fixed pages only */ }
    try { masters = await masterCommunitySlugs(); } catch { /* official areas only */ }
    try { // communities that only have villa clusters
      codes = [...new Set([...codes, ...(await clusterCommunityCodes())])];
      masters = [...new Set([...masters, ...(await clusterMasterCounts()).map((c) => masterSlug(c.name))])];
    } catch { /* migration 0015 not applied yet */ }
    try { clusters = await visibleClusterSlugs(); } catch { /* migration 0014 not applied yet: no cluster pages */ }
  }
  const official = codes.length ? [...new Set([...LAUNCH_CODES, ...codes])] : LAUNCH_CODES;
  return sitemapEntries(siteUrl(), slugs, [...official, ...masters], clusters);
}
