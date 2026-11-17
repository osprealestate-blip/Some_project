import { describe, expect, it } from "vitest";
import { areaFigures, parseCodes } from "./areaCompare";

const a = { code: "392", name: "Dubai Marina", sales: 500, psf: 2000, psfPrev: 1800, likeForLike: null, rent: 120000, rentCount: 300, yields: [0.06, 0.07, 0.05], readySales: 300, offPlanSales: 200, periodEnd: "2026-10-30" };

describe("areaCompare", () => {
  it("parses up to four unique numeric codes", () => {
    expect(parseCodes("392,681,392,abc,346,101,999")).toEqual(["392", "681", "346", "101"]);
    expect(parseCodes(undefined)).toEqual([]);
  });
  it("prefers the same-tower change and labels the basis", () => {
    expect(areaFigures({ ...a, likeForLike: 0.04 }).yoy).toBe(0.04);
    expect(areaFigures({ ...a, likeForLike: 0.04 }).yoyBasis).toBe("same towers");
    expect(areaFigures(a).yoyBasis).toBe("median");
  });
  it("takes the middle yield, off-plan share and flags thin samples", () => {
    const f = areaFigures(a);
    expect(f.grossYield).toBe(0.06);
    expect(f.offPlanShare).toBeCloseTo(0.4);
    expect(f.thin).toBe(false);
    expect(areaFigures({ ...a, sales: 10 }).thin).toBe(true);
  });
  it("handles an area with nothing", () => {
    const f = areaFigures({ ...a, sales: 0, psf: null, psfPrev: null, rent: null, yields: [], readySales: 0, offPlanSales: 0 });
    expect(f.psf).toBeNull(); expect(f.grossYield).toBeNull(); expect(f.offPlanShare).toBeNull(); expect(f.yoy).toBeNull();
  });
});
