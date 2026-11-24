import { describe, expect, it } from "vitest";
import { isKind, kindSourceNote } from "./buildingKind";
import { filterLabel, filterParam, parseFilter } from "./mapFilter";
import { makeT } from "./i18n";

describe("building kind", () => {
  it("parses and labels the kind filter", () => {
    expect(parseFilter("kind:fuel")).toEqual({ type: "kind", value: "fuel" });
    expect(parseFilter("kind:nonsense")).toBeNull();
    expect(filterParam({ type: "kind", value: "school" })).toBe("kind:school");
    expect(filterLabel({ type: "kind", value: "police" })).toBe("Police station");
    expect(isKind("mosque")).toBe(true);
  });
  it("states source, numbers and confidence", () => {
    const t = makeT("en");
    const n = kindSourceNote({ kind: "apartments", source: "dld", confidence: "high", basis: { records: 124, source_date: "2026-11-10" } }, t);
    expect(n).toBe("Source: DLD sale and rent records (124 records, 2026-11-10). High confidence.");
    const p = kindSourceNote({ kind: "fuel", source: "osm", confidence: "low", basis: { place: "ENOC", distance_m: 22, approx_location: true } }, t);
    expect(p).toContain("ENOC, 22 m away");
    expect(p).toContain("Low confidence");
  });
  it("has Arabic for the labels", () => {
    expect(filterLabel({ type: "kind", value: "fuel" }, makeT("ar"))).toBe("محطة وقود");
  });
});
