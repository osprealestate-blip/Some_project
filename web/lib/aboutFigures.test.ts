import { describe, expect, it } from "vitest";
import { figureFacts } from "./aboutFigures";

describe("figureFacts", () => {
  it("states counts and period", () => {
    const f = figureFacts({ periodEnd: "2026-10-31", saleCount: 12, rentCount: 40, rentLevel: "building" });
    expect(f[0].sample).toBe("12 sales counted");
    expect(f[0].period).toBe("12 months to 2026-10-31");
    expect(f[2].sample).toBe("40 contracts");
    expect(f[3].sample).toBe("12 sales and 40 contracts");
  });
  it("says so when rents are the whole project's or estimated", () => {
    expect(figureFacts({ periodEnd: null, saleCount: 5, rentCount: 9, rentLevel: "project" })[2].limits).toMatch(/whole project/);
    const e = figureFacts({ periodEnd: null, saleCount: 5, rentCount: 9, rentLevel: "estimated" })[2];
    expect(e.sample).toMatch(/placed by unit size/);
  });
  it("handles no data and off-plan without inventing numbers", () => {
    const f = figureFacts({ periodEnd: null, saleCount: 0, rentCount: 0, rentLevel: null });
    expect(f[0].sample).toBe("No counted sales");
    expect(f[2].sample).toBe("No rent contracts recorded");
    expect(f[3].sample).toBe("Needs both sales and rent contracts");
    expect(figureFacts({ periodEnd: null, saleCount: 4, rentCount: 0, rentLevel: null, offPlan: true })[2].sample).toMatch(/not completed/);
  });
  it("uses singular for one", () => {
    expect(figureFacts({ periodEnd: null, saleCount: 1, rentCount: 1, rentLevel: "building" })[0].sample).toBe("1 sale counted");
  });
});
