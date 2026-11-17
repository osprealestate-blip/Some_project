import { hasDatabase, query } from "@/lib/db";
import { MIN_CONFIDENCE } from "@/lib/queries";

/** `sourceDate` is the date of the newest record (period_end), the same date community pages show as "Data up to".
 *  Real counts from our own tables for the homepage. Cached for 10 minutes per server instance (the counts are large). */
export type HomeStats = { buildings: number; sales: number; rents: number; sourceDate: string | null };

let cache: { at: number; value: HomeStats | null } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function homeStats(): Promise<HomeStats | null> {
  if (!hasDatabase()) return null;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let value: HomeStats | null = null;
  try {
    const rows = await query<{ buildings: string; sales: string; rents: string; source_date: string | null }>(
      `select (select count(*) from buildings where match_confidence >= $1)::text as buildings,
              (select count(*) from transactions where excluded is null)::text as sales,
              (select count(*) from rent_contracts where excluded is null)::text as rents,
              (select max(period_end)::text from community_summary) as source_date`,
      [MIN_CONFIDENCE],
    );
    const r = rows[0];
    if (r) value = { buildings: Number(r.buildings), sales: Number(r.sales), rents: Number(r.rents), sourceDate: r.source_date };
  } catch {
    value = null;
  }
  cache = { at: Date.now(), value };
  return value;
}

/** "1.4M", "12,300": rounded down so the page never claims more than the data holds. */
export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${Math.floor(n / 100_000) / 10}M`;
  if (n >= 10_000) return `${Math.floor(n / 1000)}k`;
  return n.toLocaleString("en-US");
}
