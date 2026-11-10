import { describe, expect, it } from "vitest";
import { GOLDEN_VISA_CONFIG } from "@/config/goldenVisa";
import { evaluateGoldenVisa } from "./goldenVisa";

describe("evaluateGoldenVisa", () => {
  it("keeps the threshold at AED 2,000,000 in config", () => {
    expect(GOLDEN_VISA_CONFIG.thresholdAed).toBe(2_000_000);
    expect(GOLDEN_VISA_CONFIG.officialSourceUrl).toContain("u.ae");
  });

  it("treats exactly AED 2,000,000 as meeting the threshold", () => {
    const res = evaluateGoldenVisa(2_000_000);
    expect(res.eligible).toBe(true);
    expect(res.isExact).toBe(true);
    expect(res.surplus).toBe(0);
    expect(res.shortfall).toBe(0);
    expect(res.statusText).toBe("Exactly AED 2,000,000");
  });

  it("does not round a price just under the threshold up to it", () => {
    const res = evaluateGoldenVisa(1_999_999.6);
    expect(res.eligible).toBe(false);
    expect(res.isExact).toBe(false);
    expect(res.shortfall).toBeCloseTo(0.4, 6);
  });

  it("gives the surplus above and the shortfall below", () => {
    expect(evaluateGoldenVisa(3_250_000).surplus).toBe(1_250_000);
    const below = evaluateGoldenVisa(1_450_000);
    expect(below.eligible).toBe(false);
    expect(below.shortfall).toBe(550_000);
    expect(below.statusText).toBe("Below AED 2,000,000");
  });

  it("reports no price for missing, zero, negative or non-numeric prices", () => {
    for (const p of [null, undefined, 0, -100_000, NaN, Infinity]) {
      const res = evaluateGoldenVisa(p);
      expect(res.hasPrice).toBe(false);
      expect(res.eligible).toBe(false);
    }
  });

  it("uses a custom threshold in its wording", () => {
    const res = evaluateGoldenVisa(1_000_000, 750_000);
    expect(res.eligible).toBe(true);
    expect(res.surplus).toBe(250_000);
    expect(res.statusText).toBe("At or above AED 750,000");
  });
});
