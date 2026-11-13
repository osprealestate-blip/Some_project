import { makeT, type T } from "./i18n";

/** Walking and driving routes with real minutes, from an OSRM-compatible service chosen by the site owner.
 *  Ships OFF: nothing is requested and no minutes are shown unless ROUTING_ENABLED=1 and a base URL is set.
 *  Minutes come only from a successful route. A failed or missing route never produces a number. */
export type RouteMode = "walk" | "drive";
export const ROUTE_MODES: { id: RouteMode; label: string; verb: string }[] = [
  { id: "walk", label: "Walk", verb: "walk" },
  { id: "drive", label: "Drive", verb: "drive" },
];

export type RouteResult = { minutes: number; distanceM: number; coords: [number, number][] };

export type RoutingConfig = { enabled: boolean; urls: Record<RouteMode, string> };

/** Read the switch and the two service addresses from the environment. Both addresses are needed to switch it on. */
export function routingConfig(env: Record<string, string | undefined> = process.env): RoutingConfig {
  const clean = (v?: string) => (v ?? "").trim().replace(/\/+$/, "");
  const urls = { walk: clean(env.ROUTING_FOOT_URL), drive: clean(env.ROUTING_CAR_URL) };
  const on = env.ROUTING_ENABLED === "1" && /^https:\/\//.test(urls.walk) && /^https:\/\//.test(urls.drive);
  return { enabled: on, urls };
}

/** Dubai and nearby only, so the endpoint cannot be used as a general routing service. */
const BOX = { minLng: 54.8, maxLng: 55.7, minLat: 24.6, maxLat: 25.5 };
export function inDubai(lng: number, lat: number): boolean {
  return Number.isFinite(lng) && Number.isFinite(lat) && lng >= BOX.minLng && lng <= BOX.maxLng && lat >= BOX.minLat && lat <= BOX.maxLat;
}

/** Longest straight-line trip we route: a 20 km walk is not a useful "nearest place" answer. */
export const MAX_ROUTE_M = 25_000;

export function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function routeUrl(base: string, from: [number, number], to: [number, number]): string {
  return `${base}/route/v1/driving/${from[0].toFixed(5)},${from[1].toFixed(5)};${to[0].toFixed(5)},${to[1].toFixed(5)}?overview=full&geometries=geojson&steps=false`;
}

/** Take the first route from an OSRM reply. Anything unexpected returns null, and the caller shows no minutes. */
export function parseOsrm(json: unknown): RouteResult | null {
  const j = json as { code?: string; routes?: { duration?: number; distance?: number; geometry?: { type?: string; coordinates?: unknown } }[] } | null;
  if (!j || j.code !== "Ok" || !Array.isArray(j.routes) || !j.routes.length) return null;
  const r = j.routes[0];
  const coords = r.geometry?.coordinates;
  if (typeof r.duration !== "number" || typeof r.distance !== "number" || !(r.duration >= 0) || !(r.distance >= 0)) return null;
  if (r.geometry?.type !== "LineString" || !Array.isArray(coords) || coords.length < 2) return null;
  const line: [number, number][] = [];
  for (const c of coords) {
    if (!Array.isArray(c) || typeof c[0] !== "number" || typeof c[1] !== "number") return null;
    line.push([c[0], c[1]]);
  }
  return { minutes: Math.max(1, Math.round(r.duration / 60)), distanceM: Math.round(r.distance), coords: line };
}

/** "8 min walk", "12 min drive". Only called with a real route. */
export function minutesLabel(minutes: number, mode: RouteMode, t: T = makeT("en")): string {
  if (minutes >= 90) { const h = Math.floor(minutes / 60), m = minutes % 60; return m ? t(mode === "walk" ? "{h} h {m} min walk" : "{h} h {m} min drive", { h, m }) : t(mode === "walk" ? "{h} h walk" : "{h} h drive", { h }); }
  return t(mode === "walk" ? "{n} min walk" : "{n} min drive", { n: minutes });
}

// ---------- server-side helpers: cache and rate limit (per server instance; the CDN cache sits in front) ----------

export class TtlCache<V> {
  private m = new Map<string, { v: V; exp: number }>();
  constructor(private max: number, private ttlMs: number, private now: () => number = Date.now) {}
  get(k: string): V | undefined {
    const e = this.m.get(k);
    if (!e) return undefined;
    if (e.exp <= this.now()) { this.m.delete(k); return undefined; }
    this.m.delete(k); this.m.set(k, e); // keep recently used entries
    return e.v;
  }
  set(k: string, v: V, ttlMs = this.ttlMs): void {
    this.m.delete(k);
    this.m.set(k, { v, exp: this.now() + ttlMs });
    while (this.m.size > this.max) this.m.delete(this.m.keys().next().value as string);
  }
  get size() { return this.m.size; }
}

/** Fixed-window limiter: `limit` hits per `windowMs` per key. */
export class RateLimiter {
  private hits = new Map<string, { n: number; start: number }>();
  constructor(private limit: number, private windowMs: number, private now: () => number = Date.now) {}
  allow(key: string): boolean {
    const t = this.now();
    const h = this.hits.get(key);
    if (!h || t - h.start >= this.windowMs) {
      this.hits.set(key, { n: 1, start: t });
      if (this.hits.size > 5000) for (const [k, v] of this.hits) if (t - v.start >= this.windowMs) this.hits.delete(k);
      return true;
    }
    h.n += 1;
    return h.n <= this.limit;
  }
}

/** Cache key: coordinates rounded to ~1 m so nearby clicks on the same building share a route. */
export function routeKey(mode: RouteMode, from: [number, number], to: [number, number]): string {
  const r = (n: number) => n.toFixed(5);
  return `${mode}:${r(from[0])},${r(from[1])}>${r(to[0])},${r(to[1])}`;
}
