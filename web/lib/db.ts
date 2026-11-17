/** Server-side database access. DATABASE_URL is read from the environment (see web/.env.example).
 *  Pages call `hasDatabase()` first and show a "data not loaded" note when it is missing. */
import { Pool } from "pg";
import { poolConfig } from "@/lib/dbConfig";
import { makeQueryCache } from "@/lib/queryCache";

declare global {
  var __dpiPool: Pool | undefined;
}

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

function pool(): Pool {
  if (!globalThis.__dpiPool) {
    // Works with a direct connection and Supabase's transaction pooler (6543): see lib/dbConfig.ts.
    globalThis.__dpiPool = new Pool(poolConfig(process.env.DATABASE_URL ?? "", !!process.env.VERCEL));
  }
  return globalThis.__dpiPool;
}

/** The public database only changes when a new load is pushed, so identical read queries are reused for a few minutes
 *  (DB_CACHE_SECONDS, default 300; 0 turns it off). The web role is read-only, so nothing here can go stale from our own writes. */
const cacheSeconds = Number(process.env.DB_CACHE_SECONDS ?? 300);
const cache = makeQueryCache(Number.isFinite(cacheSeconds) ? cacheSeconds * 1000 : 300_000, 400);

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const rows = await cache.get(`${sql}\u0000${JSON.stringify(params)}`, async () => (await pool().query(sql, params)).rows as T[]);
  return rows.slice();
}

export async function one<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}
