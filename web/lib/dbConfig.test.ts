import { afterEach, describe, expect, it } from "vitest";
import { poolConfig } from "@/lib/dbConfig";

const POOLER = "postgresql://dpi_web.bpofhxraugwdhhskxsew:p%40ss@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

describe("poolConfig", () => {
  afterEach(() => { delete process.env.DATABASE_CA; });

  it("keeps a dotted pooler username and port intact", () => {
    const c = poolConfig(POOLER, true);
    const u = new URL(c.connectionString!);
    expect(decodeURIComponent(u.username)).toBe("dpi_web.bpofhxraugwdhhskxsew");
    expect(decodeURIComponent(u.password)).toBe("p@ss");
    expect(u.port).toBe("6543");
  });

  it("encrypts hosted connections without verifying the chain, even with no sslmode in the URL", () => {
    expect(poolConfig(POOLER, true).ssl).toEqual({ rejectUnauthorized: false });
  });

  it("strips sslmode/uselibpqcompat so they cannot override the ssl object", () => {
    const c = poolConfig(POOLER + "?uselibpqcompat=true&sslmode=require", true);
    expect(c.connectionString).not.toMatch(/sslmode|uselibpqcompat/);
    expect(c.ssl).toEqual({ rejectUnauthorized: false });
  });

  it("uses no TLS for the local Docker database", () => {
    expect(poolConfig("postgresql://dpi:dpi_local_only@localhost:5433/dpi", false).ssl).toBe(false);
  });

  it("honours sslmode=disable and verify-full, and DATABASE_CA", () => {
    expect(poolConfig(POOLER + "?sslmode=disable", true).ssl).toBe(false);
    expect(poolConfig(POOLER + "?sslmode=verify-full", true).ssl).toEqual({ rejectUnauthorized: true });
    process.env.DATABASE_CA = "PEM";
    expect(poolConfig(POOLER, true).ssl).toEqual({ ca: "PEM", rejectUnauthorized: true });
  });

  it("is serverless-small and sends no statement_timeout startup parameter", () => {
    const c = poolConfig(POOLER, true);
    expect(c.max).toBe(1);
    expect(c).not.toHaveProperty("statement_timeout");
    expect(c.query_timeout).toBe(15_000);
    expect(poolConfig(POOLER, false).max).toBe(5);
  });

  it("does not throw on an unparsable string", () => {
    expect(() => poolConfig("", true)).not.toThrow();
  });
});
