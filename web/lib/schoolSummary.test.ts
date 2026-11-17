import { describe, expect, it } from "vitest";
import { summariseSchools } from "./schoolSummary";

describe("summariseSchools", () => {
  it("orders by rating, unrated last, and totals", () => {
    const s = summariseSchools([
      { rating: null, within_2km: 1, within_5km: 3 },
      { rating: "good", within_2km: 2, within_5km: 5 },
      { rating: "Outstanding", within_2km: 0, within_5km: 1 },
      { rating: "weak", within_2km: 0, within_5km: 0 },
    ]);
    expect(s.rows.map((r) => r.label)).toEqual(["Outstanding", "Good", "Not rated"]);
    expect(s.total2).toBe(3);
    expect(s.total5).toBe(9);
  });
  it("is empty without schools", () => {
    expect(summariseSchools([]).rows).toEqual([]);
  });
});
