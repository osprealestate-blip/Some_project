import { describe, expect, it } from "vitest";
import { km } from "./facilities";

describe("km", () => {
  it("formats metres as km", () => {
    expect(km(800)).toBe("0.8 km");
    expect(km(2440)).toBe("2.4 km");
    expect(km(18400)).toBe("18 km");
  });
});

import { nearbyLines } from "./facilities";
describe("nearbyLines", () => {
  const list = [
    { id: "metro" as const, name: "A", distanceM: 600, lng: 55.15, lat: 25.09, approx: false },
    { id: "school" as const, name: "B", distanceM: 3100, lng: 55.16, lat: 25.1, approx: true },
  ];
  it("draws one straight line per visible kind, with the kind's colour", () => {
    const fc = nearbyLines({ lng: 55.14, lat: 25.08 }, list, ["school"]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties?.colour).toBe("#22d3ee");
    expect((fc.features[0].geometry as GeoJSON.LineString).coordinates).toEqual([[55.14, 25.08], [55.15, 25.09]]);
  });
});
