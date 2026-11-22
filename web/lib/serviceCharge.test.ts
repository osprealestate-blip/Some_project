import { describe, expect, it } from "vitest";
import { resolveServiceCharge } from "./serviceCharge";

const b = { psf: 17.9, ac_psf: null, budget_year: 2026, assoc_name: "Princess Tower", source_date: "2026-09-22" };

describe("resolveServiceCharge", () => {
  it("prefers the building's filed figure and says its year", () => {
    const r = resolveServiceCharge(b, { median: 14, n: 40 });
    expect(r).toMatchObject({ psf: 17.9, kind: "building", year: 2026 });
    expect(r.label).toMatch(/2026 approved budget/);
  });
  it("uses the area median only with 10 or more buildings, and labels it assumed", () => {
    expect(resolveServiceCharge(null, { median: 14.04, n: 12 })).toMatchObject({ psf: 14, kind: "community" });
    expect(resolveServiceCharge(null, { median: 14, n: 9 }).kind).toBe("assumed");
  });
  it("falls back to the flat assumption, labelled", () => {
    const r = resolveServiceCharge(null, null);
    expect(r).toMatchObject({ psf: 15, kind: "assumed" });
    expect(r.label).toMatch(/assumed/);
  });
});
