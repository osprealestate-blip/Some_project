/** Server-side database access. DATABASE_URL is read from the environment (see web/.env.example).
 *  Pages call `hasDatabase()` first and show a "data not loaded" note when it is missing. */
import { Pool } from "pg";

declare global {
  var __dpiPool: Pool | undefined;
}

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

function pool(): Pool {
  if (!globalThis.__dpiPool) {
    // Supabase's session pooler allows only 15 clients in total. Each serverless instance keeps its own pool, so on Vercel
    // one connection per instance, released quickly when idle, keeps many instances from filling the pooler
    // ("max clients reached in session mode"). Locally a few connections are fine.
    const serverless = !!process.env.VERCEL;
    globalThis.__dpiPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: serverless ? 1 : 5,
      idleTimeoutMillis: serverless ? 3_000 : 10_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 15_000,
    });
  }
  return globalThis.__dpiPool;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool().query(sql, params);
  return res.rows as T[];
}

export async function one<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(sql, params))[0] ?? null;
}
