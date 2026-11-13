import { FACILITIES, type FacilityId, type NearestFacility } from "./facilities";
import type { RouteResult } from "./routing";

/** Per-kind route state: a route, null when it failed, or missing while still loading. */
export type RouteMap = Partial<Record<FacilityId, RouteResult | null>>;

/** Lines for the map. A kind with a real route is drawn along the route; any other kind keeps its straight line,
 *  marked `straight: 1` (when `thinFallback`, i.e. in a route mode) so the map can draw it thinner. Straight lines are never given minutes. */
export function routeLines(from: { lng: number; lat: number }, list: NearestFacility[], hidden: FacilityId[], routes: RouteMap, thinFallback = false): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: list.filter((f) => !hidden.includes(f.id)).map((f) => {
      const r = routes[f.id];
      const colour = FACILITIES.find((x) => x.id === f.id)!.colour;
      return {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: r ? r.coords : [[from.lng, from.lat], [f.lng, f.lat]] },
        properties: { id: f.id, colour, straight: !r && thinFallback ? 1 : 0 },
      };
    }),
  };
}

/** Where to put a label: the middle vertex of a route, or the middle of a straight line. */
export function labelPoint(from: { lng: number; lat: number }, f: NearestFacility, r: RouteResult | null | undefined): [number, number] {
  if (r && r.coords.length) return r.coords[Math.floor(r.coords.length / 2)];
  return [(from.lng + f.lng) / 2, (from.lat + f.lat) / 2];
}
