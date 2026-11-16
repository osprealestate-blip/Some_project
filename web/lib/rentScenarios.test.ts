import { describe, expect, it } from "vitest";
import { rentScenarios } from "./rentScenarios";

const base = { purchasePrice: 1_000_000, annualRent: 80_000, sizeSqft: 800, downPaymentPct: 20, mortgageRatePct: 4.5, termYears: 25, serviceChargePsf: 15, maintenancePsf: 0, vacancyPct: 0 };

describe("rentScenarios", () => {
  it("returns null without a rent", () => {
    expect(rentScenarios({ ...base, annualRent: null })).toBeNull();
  });
  it("gross yield is rent over price and falls with the rent cut", () => {
    const s = rentScenarios(base)!;
    expect(s).toHaveLength(3);
    expect(s[0].grossYield).toBeCloseTo(0.08, 6);
    expect(s[1].grossYield).toBeCloseTo(0.076, 6);
    expect(s[2].grossYield).toBeCloseTo(0.072, 6);
  });
  it("net yield is below gross and cash-on-cash falls by the lost rent over cash invested", () => {
    const s = rentScenarios(base)!;
    expect(s[0].netYield!).toBeLessThan(s[0].grossYield!);
    const loss = s[0].annualCashFlow! - s[1].annualCashFlow!;
    expect(loss).toBeCloseTo(4000, 4);
    expect(s[0].cashOnCash!).toBeGreaterThan(s[2].cashOnCash!);
  });
});
