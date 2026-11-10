import { describe, expect, it } from "vitest";
import { DEFAULT_COST_CONFIG } from "@/config/costs";
import { calculateMonthlyCosts, calculateMortgagePayment } from "./costs";

describe("Monthly Cost Calculator - Mortgage Payment Formula", () => {
  it("calculates mortgage payment against known standard values", () => {
    // Principal: 1,000,000 AED, Rate: 4.5%, Term: 25 years (300 months)
    // Standard formula: 1,000,000 * (0.045/12 * (1+0.045/12)^300) / ((1+0.045/12)^300 - 1) = 5558.32
    const m1 = calculateMortgagePayment(1_000_000, 4.5, 25);
    expect(m1).toBeCloseTo(5558.32, 1);

    // Principal: 800,000 AED, Rate: 5.0%, Term: 20 years (240 months)
    // 800,000 * (0.05/12 * (1+0.05/12)^240) / ((1+0.05/12)^240 - 1) = 5279.64
    const m2 = calculateMortgagePayment(800_000, 5.0, 20);
    expect(m2).toBeCloseTo(5279.64, 1);
  });

  it("handles a zero interest rate correctly (P / n)", () => {
    // 1,200,000 AED over 25 years (300 months) at 0% rate = 4,000 AED/month
    const mZero = calculateMortgagePayment(1_200_000, 0, 25);
    expect(mZero).toBe(4000);
  });

  it("handles 100% down payment (principal <= 0)", () => {
    const mZeroPrincipal = calculateMortgagePayment(0, 4.5, 25);
    expect(mZeroPrincipal).toBe(0);

    const mNeg = calculateMortgagePayment(-50000, 4.5, 25);
    expect(mNeg).toBe(0);
  });

  it("handles 0 or negative terms gracefully", () => {
    expect(calculateMortgagePayment(1_000_000, 4.5, 0)).toBe(0);
    expect(calculateMortgagePayment(1_000_000, 4.5, -5)).toBe(0);
  });
});

describe("calculateMonthlyCosts integration", () => {
  it("computes full monthly costs, net yield and upfront costs with standard inputs", () => {
    const res = calculateMonthlyCosts({
      purchasePrice: 2_000_000,
      downPaymentPct: 20, // 400,000 down, 1,600,000 loan
      mortgageRatePct: 4.5,
      termYears: 25,
      serviceChargePsf: 15,
      sizeSqft: 1000, // 15,000 / yr = 1,250 / mo
      utilitiesMonthly: 1200,
      annualRent: 140_000,
    });

    expect(res.isValid).toBe(true);
    expect(res.purchasePrice).toBe(2_000_000);
    expect(res.loanAmount).toBe(1_600_000);

    // Mortgage on 1.6M at 4.5% for 25y = 1.6 * 5558.32 = 8893.31
    expect(res.monthlyMortgage).toBeCloseTo(8893.31, 1);
    expect(res.monthlyServiceCharge).toBe(1250);
    expect(res.monthlyUtilities).toBe(1200);

    // Total monthly: 8893.31 + 1250 + 1200 = 11343.31
    expect(res.totalMonthlyCost).toBeCloseTo(11343.31, 1);

    // Net yield: (140,000 - 15,000) / 2,000,000 = 125,000 / 2,000,000 = 6.25% (0.0625)
    expect(res.netYield).toBeCloseTo(0.0625, 4);

    // Upfront costs:
    // Down payment: 400,000
    // DLD fee: 4% of 2M = 80,000
    // Mortgage reg: 0.25% of 1.6M + 290 = 4,000 + 290 = 4,290
    // Total upfront: 484,290
    expect(res.upfrontCosts.downPaymentCash).toBe(400_000);
    expect(res.upfrontCosts.dldTransferFee).toBe(80_000);
    expect(res.upfrontCosts.mortgageRegistrationFee).toBe(4290);
    expect(res.upfrontCosts.totalUpfront).toBe(484_290);
  });

  it("handles 100% down payment in calculateMonthlyCosts", () => {
    const res = calculateMonthlyCosts({
      purchasePrice: 1_500_000,
      downPaymentPct: 100,
      annualRent: 90_000,
    });

    expect(res.isValid).toBe(true);
    expect(res.loanAmount).toBe(0);
    expect(res.monthlyMortgage).toBe(0);
    // Mortgage registration fee is 0 when no mortgage
    expect(res.upfrontCosts.mortgageRegistrationFee).toBe(0);
    expect(res.upfrontCosts.downPaymentCash).toBe(1_500_000);
  });

  it("handles missing rent gracefully without NaN or zero yield", () => {
    const res = calculateMonthlyCosts({
      purchasePrice: 1_800_000,
      annualRent: null,
    });

    expect(res.isValid).toBe(true);
    expect(res.netYield).toBeNull();
    expect(res.netYieldNote).toContain("No rental contracts");
    expect(isNaN(res.totalMonthlyCost)).toBe(false);
  });

  it("handles missing or invalid purchase price gracefully without NaN", () => {
    const missingNull = calculateMonthlyCosts({ purchasePrice: null });
    expect(missingNull.isValid).toBe(false);
    expect(missingNull.monthlyMortgage).toBe(0);
    expect(missingNull.totalMonthlyCost).toBe(0);
    expect(missingNull.netYield).toBeNull();
    expect(isNaN(missingNull.totalMonthlyCost)).toBe(false);

    const missingZero = calculateMonthlyCosts({ purchasePrice: 0 });
    expect(missingZero.isValid).toBe(false);
    expect(missingZero.message).toBeDefined();

    const missingNeg = calculateMonthlyCosts({ purchasePrice: -1000 });
    expect(missingNeg.isValid).toBe(false);

    const missingNaN = calculateMonthlyCosts({ purchasePrice: NaN });
    expect(missingNaN.isValid).toBe(false);
  });

  it("falls back to default config when optional inputs are omitted", () => {
    const res = calculateMonthlyCosts({
      purchasePrice: 1_000_000,
    });

    expect(res.isValid).toBe(true);
    // Should use default 20% down
    expect(res.loanAmount).toBe(800_000);
    // Should use default utilities (1200)
    expect(res.monthlyUtilities).toBe(DEFAULT_COST_CONFIG.utilitiesMonthly);
    // Should use default service charge psf * default size
    expect(res.annualServiceCharge).toBe(
      DEFAULT_COST_CONFIG.serviceChargePsf * DEFAULT_COST_CONFIG.defaultSizeSqft
    );
  });
});
