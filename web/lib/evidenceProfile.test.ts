import { describe, expect, it } from "vitest";
import { evidenceProfile } from "./evidenceProfile";

const base = { sales12m: 20, rent: { rentLevel: "building" as const, rentCount: 30 }, geomSource: "osm", floors: 40, unitCount: 300, completionYear: 2012 };
const by = (i: Parameters<typeof evidenceProfile>[0]) => Object.fromEntries(evidenceProfile(i).map((r) => [r.id, r]));

describe("evidenceProfile", () => {
  it("marks a well-covered building Available except service charges", () => {
    const r = by(base);
    expect([r.sales.level, r.rents.level, r.position.level, r.characteristics.level]).toEqual(["Available", "Available", "Available", "Available"]);
    expect(r.service.level).toBe("Not available");
  });
  it("marks service charges Available, with year and source, when a filed figure is matched", () => {
    const r = by({ ...base, serviceCharge: { psf: 17.9, year: 2026 } });
    expect(r.service.level).toBe("Available");
    expect(r.service.detail).toMatch(/17\.90.*2026.*DLD/);
  });
  it("says Not available where data is missing", () => {
    const r = by({ sales12m: 0, rent: { rentLevel: null, rentCount: 0 }, geomSource: null, floors: null, unitCount: null, completionYear: null });
    expect([r.sales.level, r.rents.level, r.position.level, r.characteristics.level]).toEqual(Array(4).fill("Not available"));
  });
  it("marks thin sales, project rents, borrowed positions and half-known details Partial", () => {
    const r = by({ sales12m: 2, rent: { rentLevel: "project", rentCount: 9 }, geomSource: "plot", floors: 30, unitCount: null, completionYear: null });
    expect([r.sales.level, r.rents.level, r.position.level, r.characteristics.level]).toEqual(Array(4).fill("Partial"));
    expect(r.characteristics.detail).toMatch(/Not recorded: units, completion year/);
  });
  it("does not call area-only rents building evidence", () => {
    expect(by({ ...base, rent: { rentLevel: null, rentCount: 0, communityRent: 80000 } }).rents.level).toBe("Not available");
  });
});
