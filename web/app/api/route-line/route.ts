import { NextResponse } from "next/server";
import { haversineM, inDubai, MAX_ROUTE_M, parseOsrm, RateLimiter, routeKey, routeUrl, routingConfig, TtlCache, type RouteMode, type RouteResult } from "@/lib/routing";

export const dynamic = "force-dynamic";

const cache = new TtlCache<RouteResult | null>(5000, 7 * 24 * 3600 * 1000);
const limiter = new RateLimiter(40, 60_000);
const global = new RateLimiter(240, 60_000); // keeps the whole site polite to the routing service
const num = (v: string | null) => (v == null || v.trim() === "" ? NaN : Number(v));

/** One walking or driving route between two points in Dubai. Off unless the owner configures a routing service.
 *  Cached for a week here and by the CDN. A failure returns no route, never a guessed time. */
export async function GET(req: Request) {
  const cfg = routingConfig();
  if (!cfg.enabled) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode");
  if (mode !== "walk" && mode !== "drive") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const from: [number, number] = [num(sp.get("flng")), num(sp.get("flat"))];
  const to: [number, number] = [num(sp.get("tlng")), num(sp.get("tlat"))];
  if (!inDubai(...from) || !inDubai(...to) || haversineM(from, to) > MAX_ROUTE_M) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const key = routeKey(mode as RouteMode, from, to);
  const hit = cache.get(key);
  const headers = { "Cache-Control": "public, s-maxage=604800, max-age=86400, stale-while-revalidate=86400" };
  if (hit) return NextResponse.json({ route: hit }, { headers });
  if (hit === null) return NextResponse.json({ route: null }, { headers: { "Cache-Control": "public, max-age=600" } });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!limiter.allow(ip) || !global.allow("all")) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "30" } });

  try {
    const res = await fetch(routeUrl(cfg.urls[mode as RouteMode], from, to), { signal: AbortSignal.timeout(4000), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    const route = parseOsrm(await res.json());
    cache.set(key, route, route ? undefined : 10 * 60 * 1000);
    return NextResponse.json({ route }, { headers: route ? headers : { "Cache-Control": "public, max-age=600" } });
  } catch {
    return NextResponse.json({ route: null, error: "unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
