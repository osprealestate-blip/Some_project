import { describe, expect, it } from "vitest";
import { filterComps, summariseComps, DEFAULT_FILTER, type CompRow } from "./comparableSales";

const r = (rooms: number | null, psf: number, off: boolean | null, d = "2026-10-01"): CompRow => ({ txn_date: d, rooms, size_sqft: 800, price: psf * 800, price_psf: psf, off_plan: off });

describe("comparable sales", () => {
  const rows = [r(1, 1000, false), r(2, 1100, true), r(3, 1200, false), r(4, 1300, false), r(null, 900, null)];
  it("filters by bedrooms and status", () => {
    expect(filterComps(rows, DEFAULT_FILTER)).toHaveLength(5);
    expect(filterComps(rows, { rooms: 3, status: "all" })).toHaveLength(2);
    expect(filterComps(rows, { rooms: "all", status: "offplan" })).toHaveLength(1);
    expect(filterComps(rows, { rooms: "all", status: "ready" })).toHaveLength(3);
  });
  it("gives no median under 5 sales", () => {
    const s = summariseComps(rows.slice(0, 4));
    expect(s.count).toBe(4);
    expect(s.medianPsf).toBeNull();
  });
  it("gives median and range from 5 sales", () => {
    const s = summariseComps(rows);
    expect(s.medianPsf).toBe(1100);
    expect(s.lowPsf).toBe(1000);
    expect(s.highPsf).toBe(1200);
  });
});
