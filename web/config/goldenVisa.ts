/**
 * Configuration for the UAE 10-Year Golden Visa (Real Estate Investor track).
 *
 * Requirements and criteria set by the Federal Authority for Identity,
 * Citizenship, Customs and Port Security (ICP) and the Dubai Land Department (DLD).
 */

export const GOLDEN_VISA_CONFIG = {
  /** Minimum property investment value in AED for the 10-year Golden Visa */
  thresholdAed: 2_000_000,

  /** Official UAE Government information portal */
  officialSourceUrl: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa",

  /** Official source title for citation */
  officialSourceName: "UAE Government Portal (u.ae)",

  /** Mandatory disclaimer */
  disclaimer: "Check current rules with the authority before relying on this.",
} as const;
