import { FACILITIES, type FacilityId, type NearestFacility } from "./facilities";
import type { RouteResult } from "./routing";

/** Per-kind route state: a route, null when it failed, or missing while still loading. */
export type RouteMap = Partial<Record<FacilityId, RouteResult | null>>;

/** Lines for the map: only a kind with a real route gets a line, drawn along the route. There are no straight lines. */
export function routeLines(list: NearestFacility[], hidden: FacilityId[], routes: RouteMap): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: list.filter((f) => !hidden.includes(f.id) && routes[f.id]).map((f) => ({
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: routes[f.id]!.coords },
      properties: { id: f.id, colour: FACILITIES.find((x) => x.id === f.id)!.colour },
    })),
  };
}

/** Where to put a label: the middle vertex of a route. With no route there is no line, so the label belongs to the place itself. */
export function labelPoint(_from: { lng: number; lat: number }, f: NearestFacility, r: RouteResult | null | undefined): [number, number] {
  if (r && r.coords.length) return r.coords[Math.floor(r.coords.length / 2)];
  return [f.lng, f.lat];
}
