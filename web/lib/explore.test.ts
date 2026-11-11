import { describe, expect, it } from "vitest";
import { parseFilters } from "./explore";

const sp = (s: string) => new URLSearchParams(s);

describe("parseFilters", () => {
  it("defaults to any bedroom type and no limits", () => {
    expect(parseFilters(sp(""), "392")).toEqual({ community: "392", rooms: -1, maxPrice: null, minYield: null });
  });
  it("reads price with commas and yield as a percentage", () => {
    const f = parseFilters(sp("rooms=2&maxPrice=1,800,000&minYield=7"), "681");
    expect(f).toEqual({ community: "681", rooms: 2, maxPrice: 1_800_000, minYield: 0.07 });
  });
  it("ignores nonsense", () => {
    const f = parseFilters(sp("rooms=9&maxPrice=abc&minYield=-3"), "346");
    expect(f.rooms).toBe(-1);
    expect(f.maxPrice).toBeNull();
    expect(f.minYield).toBeNull();
  });
  it("accepts studios", () => {
    expect(parseFilters(sp("rooms=0"), "392").rooms).toBe(0);
  });
});
