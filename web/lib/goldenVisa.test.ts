import { describe, expect, it } from "vitest";
import { GOLDEN_VISA_CONFIG } from "@/config/goldenVisa";
import { evaluateGoldenVisa } from "./goldenVisa";

describe("Golden Visa Checker", () => {
  it("keeps the 10-year Golden Visa threshold at AED 2,000,000 in config", () => {
    expect(GOLDEN_VISA_CONFIG.thresholdAed).toBe(2_000_000);
    expect(GOLDEN_VISA_CONFIG.disclaimer).toBe(
      "Check current rules with the authority before relying on this."
    );
    expect(GOLDEN_VISA_CONFIG.officialSourceUrl).toContain("u.ae");
  });

  it("correctly identifies the exact-threshold case (AED 2,000,000)", () => {
    const res = evaluateGoldenVisa(2_000_000);
    expect(res.hasPrice).toBe(true);
    expect(res.eligible).toBe(true);
    expect(res.isExact).toBe(true);
    expect(res.surplus).toBe(0);
    expect(res.shortfall).toBe(0);
    expect(res.statusText).toBe("Meets threshold exactly");
  });

  it("calculates surplus when price is above AED 2,000,000", () => {
    const res = evaluateGoldenVisa(3_250_000);
    expect(res.hasPrice).toBe(true);
    expect(res.eligible).toBe(true);
    expect(res.isExact).toBe(false);
    expect(res.surplus).toBe(1_250_000);
    expect(res.shortfall).toBe(0);
    expect(res.summaryText).toContain("surplus of AED 1,250,000");
  });

  it("calculates shortfall when price is below AED 2,000,000", () => {
    const res = evaluateGoldenVisa(1_450_000);
    expect(res.hasPrice).toBe(true);
    expect(res.eligible).toBe(false);
    expect(res.isExact).toBe(false);
    expect(res.surplus).toBe(0);
    expect(res.shortfall).toBe(550_000);
    expect(res.summaryText).toContain("Shortfall of AED 550,000");
  });

  it("handles missing, zero, and invalid prices gracefully", () => {
    const resNull = evaluateGoldenVisa(null);
    expect(resNull.hasPrice).toBe(false);
    expect(resNull.eligible).toBe(false);
    expect(resNull.surplus).toBe(0);
    expect(resNull.shortfall).toBe(0);

    const resUndef = evaluateGoldenVisa(undefined);
    expect(resUndef.hasPrice).toBe(false);

    const resZero = evaluateGoldenVisa(0);
    expect(resZero.hasPrice).toBe(false);

    const resNeg = evaluateGoldenVisa(-100_000);
    expect(resNeg.hasPrice).toBe(false);

    const resNaN = evaluateGoldenVisa(NaN);
    expect(resNaN.hasPrice).toBe(false);
  });

  it("supports custom thresholds if passed", () => {
    const custom = evaluateGoldenVisa(1_000_000, 750_000);
    expect(custom.eligible).toBe(true);
    expect(custom.surplus).toBe(250_000);
  });
});
