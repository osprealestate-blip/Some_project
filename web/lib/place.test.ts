import { describe, expect, it } from "vitest";
import { parsePoint, tileHeight } from "./place";

describe("parsePoint", () => {
  it("accepts a point in Dubai and rounds it", () => {
    expect(parsePoint("55.140123", "25.080456")).toEqual({ lng: 55.1401, lat: 25.0805 });
  });
  it("rejects missing, empty, non-numeric and out-of-range values", () => {
    expect(parsePoint(null, "25")).toBeNull();
    expect(parsePoint("", "25")).toBeNull();
    expect(parsePoint("abc", "25")).toBeNull();
    expect(parsePoint("10", "25")).toBeNull();
    expect(parsePoint("55", "40")).toBeNull();
  });
});

describe("tileHeight", () => {
  it("rounds sensible heights and drops the rest", () => {
    expect(tileHeight(12.4)).toBe(12);
    expect(tileHeight("30")).toBe(30);
    expect(tileHeight(0)).toBeNull();
    expect(tileHeight(undefined)).toBeNull();
    expect(tileHeight(5000)).toBeNull();
  });
});
