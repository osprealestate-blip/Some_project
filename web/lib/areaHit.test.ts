import { describe, expect, it } from "vitest";
import { areaAt, pointInGeometry } from "./areaHit";

const square = (w: number, s: number, e: number, n: number): GeoJSON.Polygon => ({ type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] });
const feat = (name: string, w: number, s: number, e: number, n: number) => ({ type: "Feature" as const, geometry: square(w, s, e, n), properties: { name, bbox: [w, s, e, n] as [number, number, number, number] } });

describe("areaAt", () => {
  it("finds the area under a point and nothing outside", () => {
    const list = [feat("A", 0, 0, 2, 2)];
    expect(areaAt(list, 1, 1)?.properties.name).toBe("A");
    expect(areaAt(list, 3, 1)).toBeNull();
  });
  it("prefers the smaller area when one sits inside another", () => {
    const list = [feat("Big", 0, 0, 10, 10), feat("Small", 4, 4, 5, 5)];
    expect(areaAt(list, 4.5, 4.5)?.properties.name).toBe("Small");
    expect(areaAt(list, 1, 1)?.properties.name).toBe("Big");
  });
  it("respects holes and multipolygons", () => {
    const donut: GeoJSON.Polygon = { type: "Polygon", coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]], [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]]] };
    expect(pointInGeometry(donut, 2, 2)).toBe(false);
    expect(pointInGeometry(donut, 0.5, 0.5)).toBe(true);
    const multi: GeoJSON.MultiPolygon = { type: "MultiPolygon", coordinates: [[square(0, 0, 1, 1).coordinates[0]], [square(5, 5, 6, 6).coordinates[0]]] };
    expect(pointInGeometry(multi, 5.5, 5.5)).toBe(true);
    expect(pointInGeometry(multi, 3, 3)).toBe(false);
  });
});
