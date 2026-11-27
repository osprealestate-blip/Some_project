import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AR } from "./i18nAr";
import { VENUE_KINDS, type Venues } from "./venueLayer";

const data = JSON.parse(readFileSync(join(__dirname, "../public/data/dubai_landmarks.geojson"), "utf8")) as Venues;

describe("map landmarks", () => {
  it("carry their source and date", () => {
    expect(data.meta.source).toContain("OpenStreetMap");
    expect(data.meta.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("only use known kinds and tiers, each traceable to an OpenStreetMap element inside Dubai", () => {
    for (const f of data.features) {
      const [lng, lat] = f.geometry.coordinates;
      expect(Object.keys(VENUE_KINDS)).toContain(f.properties.kind);
      expect([1, 2, 3]).toContain(f.properties.tier);
      expect(f.properties.osm).toMatch(/^(node|way|relation)\/\d+$/);
      expect(lng > 54.85 && lng < 55.65 && lat > 24.75 && lat < 25.4, f.properties.name).toBe(true);
    }
  });
  it("include the venues people navigate by", () => {
    const names = data.features.map((f) => f.properties.name);
    for (const n of ["Coca-Cola Arena", "Four Seasons Resort Dubai", "The Dubai Mall"]) expect(names).toContain(n);
  });
  it("have Arabic type labels", () => {
    expect(Object.values(VENUE_KINDS).map((k) => k.label).filter((k) => !(k in AR))).toEqual([]);
  });
});
