import { describe, expect, it } from "vitest";
import { expectedYield, isOffPlanTower, sizeBand } from "./offPlan";

describe("off-plan expected rents", () => {
  it("treats a tower as off-plan only with no rents of its own and mostly off-plan sales", () => {
    expect(isOffPlanTower(10, 10, 0)).toBe(true);
    expect(isOffPlanTower(10, 8, 0)).toBe(true);
    expect(isOffPlanTower(10, 7, 0)).toBe(false); // mostly ready: missing rents are a matching gap, not off-plan
    expect(isOffPlanTower(10, 10, 4)).toBe(false); // has its own rents
    expect(isOffPlanTower(2, 2, 0)).toBe(false); // too few sales to tell
  });
  it("compares flats within 15% of the median size", () => {
    expect(sizeBand(1000)).toEqual([850, 1150]);
  });
  it("divides the expected rent by the median price", () => {
    expect(expectedYield(80_000, 1_000_000)).toBeCloseTo(0.08);
    expect(expectedYield(null, 1_000_000)).toBeNull();
    expect(expectedYield(80_000, 0)).toBeNull();
  });
});
