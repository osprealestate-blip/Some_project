import { describe, expect, it } from "vitest";
import { indexToFirst, quarterGaps } from "./marketContext";

describe("indexToFirst", () => {
  it("sets the first year to 100 and keeps order", () => {
    expect(indexToFirst({ "2016": 200, "2015": 100, "2017": 150 })).toEqual([
      { year: "2015", index: 100 }, { year: "2016", index: 200 }, { year: "2017", index: 150 },
    ]);
  });
  it("returns nothing for an empty or zero-based series", () => {
    expect(indexToFirst({})).toEqual([]);
    expect(indexToFirst({ "2015": 0, "2016": 5 })).toEqual([]);
  });
});

describe("quarterGaps", () => {
  it("lists quarters missing between the first and last", () => {
    expect(quarterGaps(["2025 Q1", "2025 Q2", "2025 Q4", "2026 Q1"])).toEqual(["2025 Q3"]);
  });
  it("is empty when nothing is missing", () => {
    expect(quarterGaps(["2025 Q4", "2026 Q1"])).toEqual([]);
  });
});
