/**
 * Default parameters and assumptions for monthly property holding costs in Dubai.
 *
 * PLACEHOLDERS, owner to confirm. All values below are rough estimates for typical residential apartments
 * in Dubai and are NOT financial advice. Actual costs vary by building, developer,
 * cooling system (district cooling vs. chiller-free), and mortgage provider.
 */

export const DEFAULT_COST_CONFIG = {
  /** Typical residential down payment for expats/residents (20%) */
  downPaymentPct: 20,

  /** Typical UAE residential mortgage interest rate estimate (4.5%) */
  mortgageRatePct: 4.5,

  /** Typical mortgage term in years (25 years) */
  termYears: 25,

  /** Typical Dubai apartment service charge estimate in AED per sq ft per year */
  serviceChargePsf: 15,

  /** Fallback typical apartment size in sq ft */
  defaultSizeSqft: 1000,

  /** Typical monthly utilities estimate (DEWA electricity/water + chiller) in AED */
  utilitiesMonthly: 1200,

  /** Dubai Land Department transfer fee: 4% of purchase price */
  dldTransferFeePct: 4,

  /** Typical mortgage registration fee: 0.25% of loan amount */
  mortgageRegistrationFeePct: 0.25,

  /** Standard DLD administrative mortgage registration charge in AED */
  mortgageRegistrationAdminFee: 290,
} as const;
