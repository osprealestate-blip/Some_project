import { describe, expect, it } from "vitest";
import { explain } from "./activityExplainer";

const p = (sales: number, medianPsf: number | null, offPlan = 0, medianSize: number | null = 800) => ({ sales, medianPsf, offPlan, medianSize });

describe("explain", () => {
  it("describes activity relative to the year before", () => {
    expect(explain({ now: p(40, 1000), prev: p(20, 1000) }).activity).toMatch(/more than the 20/);
    expect(explain({ now: p(10, 1000), prev: p(20, 1000) }).activity).toMatch(/fewer than/);
    expect(explain({ now: p(21, 1000), prev: p(20, 1000) }).activity).toMatch(/about the same/);
    expect(explain({ now: p(0, null), prev: p(0, null) }).activity).toMatch(/No sales/);
  });
  it("refuses to compare with under 5 sales", () => {
    expect(explain({ now: p(4, 1000), prev: p(30, 900) }).price).toMatch(/Not enough/);
  });
  it("states the move without judging it", () => {
    const e = explain({ now: p(30, 1100), prev: p(30, 1000) });
    expect(e.price).toMatch(/up 10%/);
    expect(e.price).not.toMatch(/good|bad|crash|boom/i);
  });
  it("warns about off-plan mix and size mix and small samples", () => {
    const e = explain({ now: p(12, 1000, 8, 1000), prev: p(40, 1200, 2, 700) });
    expect(e.cautions).toHaveLength(3);
  });
  it("adds no caution for a steady large sample", () => {
    expect(explain({ now: p(40, 1000, 5), prev: p(40, 990, 5) }).cautions).toEqual([]);
  });
});
