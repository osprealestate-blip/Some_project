import { GOLDEN_VISA_CONFIG } from "@/config/goldenVisa";

export interface GoldenVisaCheckResult {
  hasPrice: boolean;
  price: number | null;
  threshold: number;
  eligible: boolean;
  isExact: boolean;
  surplus: number;
  shortfall: number;
  statusText: string;
  summaryText: string;
}

/**
 * Checks whether a property price meets the UAE 10-year Golden Visa threshold.
 * Handles missing prices and the exact-threshold case.
 */
export function evaluateGoldenVisa(
  price: number | null | undefined,
  threshold: number = GOLDEN_VISA_CONFIG.thresholdAed
): GoldenVisaCheckResult {
  if (price == null || isNaN(price) || price <= 0) {
    return {
      hasPrice: false,
      price: null,
      threshold,
      eligible: false,
      isExact: false,
      surplus: 0,
      shortfall: 0,
      statusText: "Price data unavailable",
      summaryText: "Median sale price is not available to evaluate Golden Visa eligibility.",
    };
  }

  const roundedPrice = Math.round(price);
  const diff = roundedPrice - threshold;
  const isExact = diff === 0;
  const eligible = diff >= 0;

  if (isExact) {
    return {
      hasPrice: true,
      price: roundedPrice,
      threshold,
      eligible: true,
      isExact: true,
      surplus: 0,
      shortfall: 0,
      statusText: "Meets threshold exactly",
      summaryText: "This price meets the AED 2,000,000 Golden Visa threshold exactly.",
    };
  }

  if (eligible) {
    return {
      hasPrice: true,
      price: roundedPrice,
      threshold,
      eligible: true,
      isExact: false,
      surplus: diff,
      shortfall: 0,
      statusText: "Meets 10-year Golden Visa threshold",
      summaryText: `Exceeds the AED 2,000,000 requirement with a surplus of AED ${diff.toLocaleString("en-AE")}.`,
    };
  }

  return {
    hasPrice: true,
    price: roundedPrice,
    threshold,
    eligible: false,
    isExact: false,
    surplus: 0,
    shortfall: Math.abs(diff),
    statusText: "Below 10-year Golden Visa threshold",
    summaryText: `Shortfall of AED ${Math.abs(diff).toLocaleString("en-AE")} below the AED 2,000,000 requirement.`,
  };
}
