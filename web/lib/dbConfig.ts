/** Pool settings that work against a direct Postgres connection and Supabase's transaction pooler (port 6543).
 *  Kept free of the `pg` import so it can be unit-tested. */
import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

/** Split a connection string into its parts without ever throwing on odd input (a username like `dpi_web.<project-ref>` is fine). */
function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** TLS: hosted databases (anything not local) are encrypted, but the certificate is not verified unless the URL asks for
 *  `sslmode=verify-full`/`verify-ca` or `DATABASE_CA` holds a CA certificate. Reason: Supabase's pooler certificate chain is rejected by node-pg's
 *  default trust store (SELF_SIGNED_CERT_IN_CHAIN). `sslmode=disable` or a local host turns TLS off. */
function sslFor(u: URL | null): PoolConfig["ssl"] {
  const mode = u?.searchParams.get("sslmode") ?? "";
  if (mode === "disable") return false;
  const host = (u?.hostname ?? "").toLowerCase();
  if (!mode && LOCAL_HOSTS.has(host)) return false;
  if (!u) return undefined;
  const ca = process.env.DATABASE_CA;
  if (ca) return { ca, rejectUnauthorized: true };
  if (mode === "verify-full" || mode === "verify-ca") return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

export function poolConfig(connectionString: string, serverless: boolean): PoolConfig {
  const u = parse(connectionString);
  // Strip SSL query parameters: pg-connection-string would otherwise override the `ssl` object chosen above.
  const ssl = sslFor(u);
  let cs = connectionString;
  if (u) {
    for (const k of ["sslmode", "uselibpqcompat", "sslrootcert", "sslcert", "sslkey"]) u.searchParams.delete(k);
    cs = u.toString();
  }
  return {
    connectionString: cs,
    ssl,
    // Serverless: one connection per instance, released quickly (the pooler has a global client cap).
    max: serverless ? 1 : 5,
    idleTimeoutMillis: serverless ? 3_000 : 10_000,
    connectionTimeoutMillis: 10_000,
    // Client-side timeout only. `statement_timeout` is sent as a startup parameter, which transaction poolers
    // (pgbouncer/Supavisor) can reject or ignore. Queries are unnamed (no `name`), so no prepared statements are
    // kept on the server connection.
    query_timeout: 15_000,
  };
}
