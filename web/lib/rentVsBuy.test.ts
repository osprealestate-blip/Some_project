import { describe, expect, it } from "vitest";
import { rentVsBuyRows } from "./rentVsBuy";
import type { Summary } from "./queries";

const s = (o: Partial<Summary>): Summary => ({ rooms: 1, sale_count_12m: 10, sale_median_psf_12m: 1500, sale_median_price_12m: 1_000_000, sale_median_size_12m: 700, sale_median_psf_prev_12m: null,
  rent_count_12m: 12, rent_median_12m: 72_000, rent_level: "building", gross_yield: 0.072, period_end: "2026-10-31", source_date: "2026-10-31", ...o });

describe("rentVsBuyRows", () => {
  it("shows monthly rent beside mortgage plus service charge at the stated assumptions", () => {
    const [r] = rentVsBuyRows([s({})], [{ rooms: 1, count: 10, p25: 900_000, p75: 1_100_000 }]);
    expect(r.monthlyRent).toBe(6000);
    // 800,000 loan at 4.5% over 25 years is about 4,447 a month; service charge 15 x 700 / 12 = 875
    expect(r.monthlyMortgage).toBeGreaterThan(4400);
    expect(r.monthlyMortgage).toBeLessThan(4500);
    expect(r.monthlyServiceCharge).toBeCloseTo(875, 0);
    expect(r.priceLow).toBe(900_000);
    expect(r.priceHigh).toBe(1_100_000);
  });
  it("leaves rent empty without 3 contracts instead of guessing", () => {
    const [r] = rentVsBuyRows([s({ rent_count_12m: 2 })], []);
    expect(r.monthlyRent).toBeNull();
    expect(r.priceLow).toBeNull();
  });
  it("skips bedroom types with fewer than 3 sales and the all-types row", () => {
    expect(rentVsBuyRows([s({ rooms: -1 }), s({ rooms: 2, sale_count_12m: 2 })], [])).toEqual([]);
  });
});
