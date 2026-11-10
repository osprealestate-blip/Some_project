/**
 * Currency configuration and exchange rates.
 *
 * Base currency in all source data (DLD) is AED.
 *
 * AED is officially pegged to USD at 3.6725 AED per USD:
 * 1 USD = 3.6725 AED  ==>  1 AED = 1 / 3.6725 USD
 *
 * NOTE: EUR, GBP, and INR rates below are reasonable placeholder estimates
 * as of RATES_AS_OF and need regular updating.
 */

export type Currency = "AED" | "USD" | "EUR" | "GBP" | "INR";

export const DEFAULT_CURRENCY: Currency = "AED";

export const CURRENCIES: readonly Currency[] = ["AED", "USD", "EUR", "GBP", "INR"] as const;

export const CURRENCY_COOKIE_NAME = "currency";

/** Fixed rates reference date */
export const RATES_AS_OF = "2026-11-01";

export interface CurrencyDetails {
  code: Currency;
  label: string;
  symbol: string;
  prefix: string;
  /** Multiply AED amount by this rate to get amount in target currency */
  rateFromAed: number;
}

export const CURRENCY_RATES: Record<Currency, CurrencyDetails> = {
  AED: {
    code: "AED",
    label: "AED",
    symbol: "AED",
    prefix: "AED ",
    rateFromAed: 1.0,
  },
  USD: {
    code: "USD",
    label: "USD ($)",
    symbol: "$",
    prefix: "$",
    // Pegged rate: 3.6725 AED per USD
    rateFromAed: 1 / 3.6725,
  },
  EUR: {
    code: "EUR",
    label: "EUR (€)",
    symbol: "€",
    prefix: "€",
    // PLACEHOLDER: approx 3.98 AED per EUR (needs updating)
    rateFromAed: 1 / 3.98,
  },
  GBP: {
    code: "GBP",
    label: "GBP (£)",
    symbol: "£",
    prefix: "£",
    // PLACEHOLDER: approx 4.65 AED per GBP (needs updating)
    rateFromAed: 1 / 4.65,
  },
  INR: {
    code: "INR",
    label: "INR (₹)",
    symbol: "₹",
    prefix: "₹",
    // PLACEHOLDER: approx 23.0 INR per AED (needs updating)
    rateFromAed: 23.0,
  },
};

/**
 * Validates and parses a raw currency string (e.g. from cookies).
 * Falls back to DEFAULT_CURRENCY ("AED") on invalid or missing values.
 */
export function parseCurrency(val?: string | null): Currency {
  if (!val) return DEFAULT_CURRENCY;
  const upper = val.trim().toUpperCase();
  if (CURRENCIES.includes(upper as Currency)) {
    return upper as Currency;
  }
  return DEFAULT_CURRENCY;
}

/**
 * Converts an AED amount to the target currency.
 */
export function convertFromAed(amountInAed: number, target: Currency): number {
  const rate = CURRENCY_RATES[target]?.rateFromAed ?? 1.0;
  return amountInAed * rate;
}

/**
 * Converts an amount from a given currency back to AED.
 */
export function convertToAed(amount: number, from: Currency): number {
  const rate = CURRENCY_RATES[from]?.rateFromAed ?? 1.0;
  return amount / rate;
}

/**
 * Returns the attribution note for currency conversions.
 * When currency is AED, returns null.
 */
export function getConversionNote(currency: Currency): string | null {
  if (currency === "AED") return null;
  if (currency === "USD") return `Converted from AED at the official peg (AED 3.6725 = USD 1).`;
  return `Converted from AED at approximate fixed rates set on ${RATES_AS_OF}; not live rates.`;
}
