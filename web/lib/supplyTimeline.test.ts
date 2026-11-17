import { describe, expect, it } from "vitest";
import { supplyTimeline } from "./supplyTimeline";

const today = new Date("2026-11-16T00:00:00Z");
describe("supplyTimeline", () => {
  const t = supplyTimeline([
    { completion_date: "2026-12-15", no_of_units: 100 },
    { completion_date: "2027-01-10", no_of_units: 50 },
    { completion_date: "2027-02-01", no_of_units: null },
    { completion_date: "2026-01-01", no_of_units: 10 },
    { completion_date: null, no_of_units: 40 },
    { completion_date: "2031-01-01", no_of_units: 70 },
    { completion_date: "2026-12-01", no_of_units: 5, dld_status: "FINISHED" },
  ], today);
  it("starts at the current quarter", () => { expect(t.quarters[0].label).toBe("Q4 2026"); expect(t.quarters[1].label).toBe("Q1 2027"); });
  it("buckets by quarter and sums units filed", () => {
    expect(t.quarters[0]).toMatchObject({ projects: 1, units: 100 });
    expect(t.quarters[1]).toMatchObject({ projects: 2, units: 50, unitsUnknown: 1 });
  });
  it("keeps past, undated and far dates apart and skips finished", () => {
    expect(t.passed).toBe(1); expect(t.undated).toBe(1); expect(t.beyond).toEqual({ projects: 1, units: 70 }); expect(t.total).toBe(6);
  });
});
