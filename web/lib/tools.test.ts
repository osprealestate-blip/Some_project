import { describe, expect, it } from "vitest";
import { assessPrice, verdictFor, type Comparables } from "./fairPrice";
import { BANDS, maxRentIncrease, noticeDeadline } from "./rentIncrease";
import { distanceScore, lifeScore } from "./lifeScore";
import { change, median, quantile } from "./stats";
import { aedShort, day, pct, quarterLabel, roomsLabel } from "./format";

const comps: Comparables = { scope: "building", count: 20, p25Psf: 1800, medianPsf: 2000, p75Psf: 2200, from: "2025-11-01", to: "2026-10-30" };

describe("fair price", () => {
  it("estimates from the median and gives a p25-p75 range", () => {
    const r = assessPrice(1000, 2_100_000, comps)!;
    expect(r.estimate).toBe(2_000_000);
    expect([r.low, r.high]).toEqual([1_800_000, 2_200_000]);
    expect(r.diff).toBeCloseTo(0.05);
    expect(r.verdict).toBe("in_line");
    expect(r.confidence).toBe("good");
  });
  it("bands the verdict", () => {
    expect(verdictFor(-0.2)).toBe("well_below");
    expect(verdictFor(-0.1)).toBe("below");
    expect(verdictFor(0.1)).toBe("above");
    expect(verdictFor(0.3)).toBe("well_above");
  });
  it("says nothing with too few sales, and is limited when falling back to the community", () => {
    expect(assessPrice(1000, null, { ...comps, count: 4 })).toBeNull();
    const r = assessPrice(1000, null, { ...comps, scope: "community" })!;
    expect(r.verdict).toBeNull();
    expect(r.confidence).toBe("limited");
  });
});

describe("rent increase (Decree 43 of 2013)", () => {
  it("follows the five bands", () => {
    expect(maxRentIncrease(95_000, 100_000)!.maxIncrease).toBe(0);
    expect(maxRentIncrease(90_000, 100_000)!.maxIncrease).toBe(0); // exactly 10% below
    expect(maxRentIncrease(85_000, 100_000)!.maxIncrease).toBe(0.05);
    expect(maxRentIncrease(75_000, 100_000)!.maxIncrease).toBe(0.1);
    expect(maxRentIncrease(65_000, 100_000)!.maxIncrease).toBe(0.15);
    expect(maxRentIncrease(50_000, 100_000)!.maxIncrease).toBe(0.2);
    expect(maxRentIncrease(120_000, 100_000)!.maxIncrease).toBe(0); // above average
    expect(maxRentIncrease(50_000, 100_000)!.maxNewRent).toBe(60_000);
    expect(BANDS).toHaveLength(5);
  });
  it("rejects bad input and gives the 90-day notice date", () => {
    expect(maxRentIncrease(0, 100_000)).toBeNull();
    expect(noticeDeadline(new Date("2027-03-31T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});

describe("life score", () => {
  it("scores by distance to the nearest place in each group", () => {
    expect(distanceScore(300)).toBe(1);
    expect(distanceScore(1200)).toBeCloseTo(0.5);
    expect(distanceScore(2500)).toBe(0);
    const s = lifeScore([
      { category: "transit", subcategory: "metro", name: "M", distance_m: 350 },
      { category: "transit", subcategory: "bus", name: "B", distance_m: 50 },
      { category: "daily_needs", subcategory: "supermarket", name: "S", distance_m: 1200 },
    ]);
    expect(s.score).toBe(25 + 10);
    expect(s.groups.find((g) => g.id === "transit")!.nearest!.name).toBe("M");
    expect(lifeScore([]).score).toBe(0);
  });
});

describe("stats and format", () => {
  it("computes medians and changes", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(quantile([], 0.5)).toBeNull();
    expect(change(110, 100)).toBeCloseTo(0.1);
    expect(change(110, null)).toBeNull();
  });
  it("formats", () => {
    expect(aedShort(1_250_000)).toBe("AED 1.25M");
    expect(aedShort(85_000)).toBe("AED 85K");
    expect(pct(0.0512, 1, true)).toBe("+5.1%");
    expect(day("2026-10-30")).toBe("30 Oct 2026");
    expect(quarterLabel("2026-07-01")).toBe("Q3 2026");
    expect(roomsLabel(0)).toBe("Studio");
    expect(roomsLabel(5)).toBe("4+ beds");
  });
});

import { driveMinutes, haversineM, keyDistances, LANDMARKS } from "./landmarks";

describe("key distances", () => {
  it("measures straight-line distance and a rounded drive estimate", () => {
    // Princess Tower (Marina) to Burj Khalifa is about 17.5 km in a straight line
    const d = haversineM(55.1468, 25.0887, 55.2744, 25.1972);
    expect(d).toBeGreaterThan(17_000);
    expect(d).toBeLessThan(18_000);
    expect(driveMinutes(d) % 5).toBe(0);
    expect(driveMinutes(200)).toBe(5);
  });
  it("lists the nearest school first, then the fixed places, with OSM route links", () => {
    const out = keyDistances(55.1468, 25.0887, [{ id: "school", name: "Nearest school: X", lng: 55.145, lat: 25.088 }]);
    expect(out).toHaveLength(LANDMARKS.length + 1);
    expect(out[0].id).toBe("school");
    expect(out[0].routeUrl).toContain("openstreetmap.org/directions");
    expect(out.map((o) => o.id)).toContain("dxb");
  });
});
