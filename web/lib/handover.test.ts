import { describe, expect, it } from "vitest";
import { handoverView } from "./handover";

const today = new Date("2026-11-16T10:00:00Z");
const r = (completion_date: string | null, dld_status: string | null = "ACTIVE") => ({ completion_date, dld_status });

describe("handoverView", () => {
  it("sorts the next 12 months soonest first and separates passed dates", () => {
    const v = handoverView([r("2027-06-01"), r("2026-12-01"), r("2028-01-01"), r("2026-01-01"), r(null)], today);
    expect(v.next12.map((x) => x.completion_date)).toEqual(["2026-12-01", "2027-06-01"]);
    expect(v.passed.map((x) => x.completion_date)).toEqual(["2026-01-01"]);
  });
  it("leaves out finished projects and undated ones", () => {
    const v = handoverView([r("2026-12-01", "FINISHED"), r(null)], today);
    expect(v.next12).toEqual([]);
    expect(v.passed).toEqual([]);
  });
  it("includes today and exactly one year ahead", () => {
    expect(handoverView([r("2026-11-16"), r("2027-11-16")], today).next12).toHaveLength(2);
  });
});
