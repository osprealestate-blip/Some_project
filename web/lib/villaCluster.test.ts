import { describe, expect, it } from "vitest";
import { bedLabel, bedroomMix, type ClusterRoomRow } from "./villaCluster";

const row = (rooms: number, n: number): ClusterRoomRow => ({ rooms, sale_count_12m: n, sale_median_psf_12m: null, sale_median_price_12m: null, sale_median_size_12m: null, rent_count_12m: 0, rent_median_12m: null });

describe("bedroomMix", () => {
  it("skips the all-types row and empty counts, and sorts by bedrooms", () => {
    const mix = bedroomMix([row(-1, 10), row(4, 2), row(3, 6), row(2, 0), row(0, 2)]);
    expect(mix.map((m) => [m.label, m.sales])).toEqual([["Studio", 2], ["3 bed", 6], ["4+ bed", 2]]);
  });
  it("shares add up to exactly 100", () => {
    const mix = bedroomMix([row(2, 1), row(3, 1), row(4, 1)]);
    expect(mix.reduce((s, m) => s + m.share, 0)).toBe(100);
    expect(bedroomMix([row(3, 5), row(4, 5)]).map((m) => m.share)).toEqual([50, 50]);
  });
  it("is empty with no sales", () => {
    expect(bedroomMix([row(-1, 0)])).toEqual([]);
    expect(bedroomMix([])).toEqual([]);
  });
  it("labels bedrooms", () => {
    expect([bedLabel(0), bedLabel(1), bedLabel(7)]).toEqual(["Studio", "1 bed", "4+ bed"]);
  });
});
