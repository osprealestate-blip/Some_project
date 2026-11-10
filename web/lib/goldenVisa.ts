import { GOLDEN_VISA_CONFIG } from "@/config/goldenVisa";
import { aed } from "@/lib/format";

export interface GoldenVisaCheckResult {
  hasPrice: boolean;
  price: number | null;
  threshold: number;
  /** Price is at or above the threshold (compared unrounded). */
  eligible: boolean;
  isExact: boolean;
  surplus: number;
  shortfall: number;
  statusText: string;
}

/**
 * Checks a property price against the Golden Visa property threshold.
 * The comparison uses the exact price: AED 1,999,999.60 is below AED 2,000,000.
 */
export function evaluateGoldenVisa(
  price: number | null | undefined,
  threshold: number = GOLDEN_VISA_CONFIG.thresholdAed,
): GoldenVisaCheckResult {
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return { hasPrice: false, price: null, threshold, eligible: false, isExact: false, surplus: 0, shortfall: 0, statusText: "No median price" };
  }
  const diff = price - threshold;
  const eligible = diff >= 0;
  const isExact = diff === 0;
  return {
    hasPrice: true,
    price,
    threshold,
    eligible,
    isExact,
    surplus: eligible ? diff : 0,
    shortfall: eligible ? 0 : -diff,
    statusText: isExact
      ? `Exactly ${aed(threshold)}`
      : eligible
        ? `At or above ${aed(threshold)}`
        : `Below ${aed(threshold)}`,
  };
}
