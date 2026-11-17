import { describe, expect, it } from "vitest";
import { coverageLines } from "./matchCoverage";

describe("coverageLines", () => {
  it("states linked of total with a rounded share", () => {
    const l = coverageLines({ sales_total: 1200, sales_linked: 1020, rents_total: 400, rents_linked: 100 });
    expect(l[0]).toBe("Sales: 1,020 of 1,200 (85%) are tied to a building page.");
    expect(l[1]).toMatch(/100 of 400 \(25%\)/);
  });
  it("skips lines with no data and handles null", () => {
    expect(coverageLines(null)).toEqual([]);
    expect(coverageLines({ sales_total: 0, sales_linked: 0, rents_total: 0, rents_linked: 0 })).toEqual([]);
  });
});
