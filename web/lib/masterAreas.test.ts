import { describe, expect, it } from "vitest";
import { labelZoomForRank, toAreaCollection } from "./masterAreas";

const sq = JSON.stringify({ type: "Polygon", coordinates: [[[55, 25], [55.01, 25], [55.01, 25.01], [55, 25]]] });

describe("toAreaCollection", () => {
  it("skips communities with no shape and labels the busiest first", () => {
    const fc = toAreaCollection([
      { name: "Azizi Venice", buildings: 5, placed: 5, shape: sq, official: false, lng: 55.005, lat: 25.004, w: 55, s: 25, e: 55.01, n: 25.01 },
      { name: "Nowhere", buildings: 3, placed: 0, shape: null, official: false, lng: null, lat: null, w: null, s: null, e: null, n: null },
      { name: "Dubai Marina", buildings: 200, placed: 150, shape: sq, official: false, lng: 55.14, lat: 25.08, w: 55.1, s: 25.05, e: 55.15, n: 25.1 },
    ]);
    expect(fc.features).toHaveLength(2);
    const marina = fc.features.find((f) => f.properties?.name === "Dubai Marina")!.properties!;
    expect(marina.labelZoom).toBe(9);
    expect(marina.launch).toBe(true);
    expect(marina.nameAr).toBe("دبي مارينا");
    expect(fc.features.find((f) => f.properties?.name === "Azizi Venice")!.properties!.slug).toBe("azizi-venice");
    expect(marina.bbox).toEqual([55.1, 25.05, 55.15, 25.1]);
  });
  it("shows fewer labels when zoomed out", () => {
    expect(labelZoomForRank(0)).toBeLessThan(labelZoomForRank(15));
    expect(labelZoomForRank(15)).toBeLessThan(labelZoomForRank(60));
  });
});
