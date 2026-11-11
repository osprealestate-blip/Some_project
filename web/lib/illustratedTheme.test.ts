import { describe, expect, it } from "vitest";
import { ILLUSTRATED_LANDMARKS, ILLUSTRATED_PALETTE as P, illustratedCamera, illustratedOverride } from "./illustratedTheme";
import { THEME_IDS, parseTheme } from "./mapThemes";

describe("Illustrated theme", () => {
  it("is a picker choice but not the default", () => {
    expect(THEME_IDS).toContain("illustrated");
    expect(parseTheme("illustrated")).toBe("illustrated");
    expect(parseTheme(null)).toBe("light");
  });

  it("recolours land, water, parks and roads by source layer, not layer id", () => {
    expect(illustratedOverride({ id: "background", type: "background" })?.paint).toEqual({ "background-color": P.land });
    expect(illustratedOverride({ id: "any-water-id", type: "fill", "source-layer": "water" })?.paint?.["fill-color"]).toBe(P.water);
    expect(illustratedOverride({ id: "park", type: "fill", "source-layer": "park" })?.paint?.["fill-color"]).toBe(P.park);
    expect(illustratedOverride({ id: "road_primary", type: "line", "source-layer": "transportation" })?.paint?.["line-color"]).toBe(P.road);
    expect(illustratedOverride({ id: "road_primary_casing", type: "line", "source-layer": "transportation" })?.paint?.["line-color"]).toBe(P.roadCasing);
    expect(illustratedOverride({ id: "railway_transit", type: "line", "source-layer": "transportation" })?.paint?.["line-color"]).toBe(P.rail);
  });

  it("hides shop icons but keeps place names", () => {
    expect(illustratedOverride({ id: "poi_r1", type: "symbol", "source-layer": "poi" })?.layout).toEqual({ visibility: "none" });
    expect(illustratedOverride({ id: "label_city", type: "symbol", "source-layer": "place" })?.layout).toBeUndefined();
  });

  it("never touches building tiles or our own layers", () => {
    expect(illustratedOverride({ id: "building", type: "fill", "source-layer": "building" })).toBeNull();
    expect(illustratedOverride({ id: "dpi-3d", type: "fill-extrusion" })).toBeNull();
    expect(illustratedOverride({ id: "launch-communities-line", type: "line" })).toBeNull();
  });

  it("frames the coast tilted and turned, a little wider on phones", () => {
    const desk = illustratedCamera(1400);
    const phone = illustratedCamera(390);
    expect(desk.pitch).toBeGreaterThan(45);
    expect(desk.bearing).not.toBe(0);
    expect(phone.zoom).toBeLessThan(desk.zoom);
    expect(phone.zoom).toBeGreaterThanOrEqual(13); // buildings in the tiles start at zoom 13
  });

  it("places every landmark tag in Dubai", () => {
    expect(ILLUSTRATED_LANDMARKS.length).toBe(11);
    for (const lm of ILLUSTRATED_LANDMARKS) {
      expect(lm.lng).toBeGreaterThan(55.0);
      expect(lm.lng).toBeLessThan(55.4);
      expect(lm.lat).toBeGreaterThan(25.0);
      expect(lm.lat).toBeLessThan(25.3);
    }
  });
});
