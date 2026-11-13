import { describe, expect, it } from "vitest";
import { labelPoint, routeLines } from "./routeLines";
import type { NearestFacility } from "./facilities";

const from = { lng: 55.1, lat: 25.1 };
const list: NearestFacility[] = [
  { id: "metro", name: "M", distanceM: 800, lng: 55.11, lat: 25.11, approx: false },
  { id: "park", name: "P", distanceM: 500, lng: 55.12, lat: 25.12, approx: false },
];
const route = { minutes: 9, distanceM: 900, coords: [[55.1, 25.1], [55.105, 25.1], [55.11, 25.11]] as [number, number][] };

describe("routeLines", () => {
  it("draws the route when there is one and a thin straight line when there is not", () => {
    const fc = routeLines(from, list, [], { metro: route, park: null }, true);
    expect(fc.features[0].geometry).toEqual({ type: "LineString", coordinates: route.coords });
    expect(fc.features[0].properties?.straight).toBe(0);
    expect(fc.features[1].properties?.straight).toBe(1);
  });
  it("skips hidden kinds", () => {
    expect(routeLines(from, list, ["metro"], {}).features).toHaveLength(1);
  });
  it("puts labels on the route when it exists", () => {
    expect(labelPoint(from, list[0], route)).toEqual([55.105, 25.1]);
    expect(labelPoint(from, list[0], null)[0]).toBeCloseTo(55.105);
  });
});
