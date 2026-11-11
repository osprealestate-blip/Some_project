import { describe, expect, it } from "vitest";
import { MAX_COMPARE, compareHref, figuresFor, latestPeriod, midYield, parseIds, rentBasis } from "./compare";
import type { Building, Summary } from "./queries";

const sum = (o: Partial<Summary>): Summary => ({
  rooms: -1, sale_count_12m: 0, sale_median_psf_12m: null, sale_median_price_12m: null, sale_median_psf_prev_12m: null,
  rent_count_12m: 0, rent_median_12m: null, gross_yield: null, period_end: "2026-10-30", source_date: "2026-11-01", ...o,
});
const bld = { slug: "stax", name_en: "Stax", community: "Marina", completion_year: 2010, floors: 40, unit_count: 300 } as unknown as Building;

describe("parseIds", () => {
  it("splits, lowercases, de-duplicates and keeps order", () => {
    expect(parseIds("A, b ,a,c")).toEqual(["a", "b", "c"]);
  });
  it("keeps at most four", () => {
    expect(parseIds("a,b,c,d,e,f")).toHaveLength(MAX_COMPARE);
  });
  it("drops malformed values and handles missing input", () => {
    expect(parseIds("a;drop table,../x,,ok-1")).toEqual(["ok-1"]);
    expect(parseIds(undefined)).toEqual([]);
    expect(parseIds(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("compareHref", () => {
  it("builds the shareable link", () => {
    expect(compareHref(["a", "b"])).toBe("/compare?ids=a,b");
    expect(compareHref([])).toBe("/compare");
    expect(compareHref(["a", "b", "c", "d", "e"])).toBe("/compare?ids=a,b,c,d");
  });
});

describe("figuresFor", () => {
  it("reads the all-types row and the middle per-bedroom yield", () => {
    const f = figuresFor({
      building: bld,
      summaries: [
        sum({ sale_count_12m: 40, sale_median_psf_12m: 1100, sale_median_psf_prev_12m: 1000, sale_median_price_12m: 1_500_000, rent_median_12m: 90_000, rent_count_12m: 30 }),
        sum({ rooms: 1, gross_yield: 0.07 }), sum({ rooms: 2, gross_yield: 0.05 }), sum({ rooms: 3, gross_yield: 0.06 }),
      ],
    });
    expect(f.psf).toBe(1100);
    expect(f.psfChange).toBeCloseTo(0.1);
    expect(f.grossYield).toBe(0.06);
    expect(f.rent).toBe(90_000);
    expect(f.periodEnd).toBe("2026-10-30");
  });
  it("leaves figures empty rather than inventing them", () => {
    const f = figuresFor({ building: bld, summaries: [] });
    expect(f.psf).toBeNull();
    expect(f.rent).toBeNull();
    expect(f.grossYield).toBeNull();
    expect(f.sales12m).toBeNull();
  });
});

describe("helpers", () => {
  it("midYield is null with no yields", () => expect(midYield([sum({})])).toBeNull());
  it("rentBasis names where the rent comes from", () => {
    expect(rentBasis({ rent: null, rentLevel: null })).toBe("No rent contracts");
    expect(rentBasis({ rent: 1, rentLevel: "project" })).toMatch(/project/i);
    expect(rentBasis({ rent: 1, rentLevel: "estimated" })).toMatch(/Estimated/);
    expect(rentBasis({ rent: 1, rentLevel: "building" })).toBe("This building");
  });
  it("latestPeriod picks the newest date", () => {
    const a = figuresFor({ building: bld, summaries: [sum({ period_end: "2026-09-30" })] });
    const b = figuresFor({ building: bld, summaries: [sum({ period_end: "2026-10-30" })] });
    expect(latestPeriod([a, b])).toBe("2026-10-30");
    expect(latestPeriod([])).toBeNull();
  });
});
