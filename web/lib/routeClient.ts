"use client";
import type { RouteMode, RouteResult } from "./routing";

const cache = new Map<string, Promise<RouteResult | null>>();

/** One route, or null when the service has none or is unavailable. Null means: show no minutes. */
export function fetchRoute(mode: RouteMode, from: [number, number], to: [number, number]): Promise<RouteResult | null> {
  const key = `${mode}:${from.join(",")}>${to.join(",")}`;
  let p = cache.get(key);
  if (!p) {
    const q = new URLSearchParams({ mode, flng: String(from[0]), flat: String(from[1]), tlng: String(to[0]), tlat: String(to[1]) });
    p = fetch(`/api/route-line?${q}`)
      .then(async (r) => (r.ok ? ((await r.json()) as { route: RouteResult | null }).route ?? null : null))
      .catch(() => null);
    p.then((v) => { if (v === null) cache.delete(key); });
    cache.set(key, p);
  }
  return p;
}
