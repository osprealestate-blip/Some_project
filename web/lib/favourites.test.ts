import { describe, expect, it } from "vitest";
import type { CompareFigures } from "./compare";
import { MAX_FAVOURITES, cleanSlugs, csvCell, favouritesCsv, favouritesHref, parseStored, toggle } from "./favourites";

const fig = (o: Partial<CompareFigures> = {}): CompareFigures => ({
  slug: "stax", name: "Stax", community: "Marina", completionYear: 2010, floors: 40, units: 300, sales12m: 12, psf: 1500.4,
  psfChange: 0.052, medianPrice: 1_250_000.2, rent: 85_000, rentLevel: null, rentContracts: 9, grossYield: 0.068, periodEnd: "2026-10-30", ...o,
});

describe("cleanSlugs", () => {
  it("keeps well-formed slugs once, in order, lower-cased", () => {
    expect(cleanSlugs("A, b ,a,c")).toEqual(["a", "b", "c"]);
    expect(cleanSlugs(["x", "x", "y"])).toEqual(["x", "y"]);
  });
  it("drops junk and non-strings", () => {
    expect(cleanSlugs(["ok-1", "../x", "a;b", 5, null, ""])).toEqual(["ok-1"]);
    expect(cleanSlugs(undefined)).toEqual([]);
  });
  it("caps the list", () => {
    const many = Array.from({ length: MAX_FAVOURITES + 5 }, (_, i) => `b${i}`);
    expect(cleanSlugs(many)).toHaveLength(MAX_FAVOURITES);
  });
});

describe("parseStored", () => {
  it("reads a JSON array and survives bad storage", () => {
    expect(parseStored('["a","b"]')).toEqual(["a", "b"]);
    expect(parseStored("not json")).toEqual([]);
    expect(parseStored("{}")).toEqual([]);
    expect(parseStored(null)).toEqual([]);
  });
});

describe("toggle", () => {
  it("adds then removes", () => {
    expect(toggle([], "a")).toEqual(["a"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });
  it("does not grow past the cap", () => {
    const full = Array.from({ length: MAX_FAVOURITES }, (_, i) => `b${i}`);
    expect(toggle(full, "new")).toEqual(full);
    expect(toggle(full, "b0")).toHaveLength(MAX_FAVOURITES - 1);
  });
});

describe("favouritesHref", () => {
  it("lists the slugs or stays bare", () => {
    expect(favouritesHref(["a", "b"])).toBe("/favourites?ids=a,b");
    expect(favouritesHref([])).toBe("/favourites");
  });
});

describe("csv", () => {
  it("quotes commas and quotes, and neutralises formulas", () => {
    expect(csvCell('A "B", C')).toBe('"A ""B"", C"');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(null)).toBe("");
    expect(csvCell(-5)).toBe("-5");
  });
  it("writes a header, one row per building, the source and the disclaimer", () => {
    const csv = favouritesCsv([fig(), fig({ slug: "b", name: "Tower, B", psf: null, grossYield: null })], () => "This building", "https://x.test");
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toContain("Median sale price (AED)");
    expect(lines[1]).toBe("Stax,Marina,12,1250000,1500,5.2,85000,This building,6.8,2026-10-30,https://x.test/building/stax");
    expect(lines[2]).toContain('"Tower, B"');
    expect(lines[2]).toContain(",,"); // missing figures stay empty, never zero
    expect(csv).toContain("Source: Dubai Land Department sales transactions");
    expect(csv).toContain("Estimate based on DLD data. Not a valuation or financial advice.");
  });
});
