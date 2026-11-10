/**
 * Currency configuration and exchange rates.
 *
 * Base currency in all source data (DLD) is AED.
 *
 * AED is officially pegged to USD at 3.6725 AED per USD:
 * 1 USD = 3.6725 AED  ==>  1 AED = 1 / 3.6725 USD
 *
 * EUR, GBP and INR are fixed approximate rates derived from the European
 * Central Bank euro reference rates of RATES_AS_OF (EUR 1 = USD 1.1214,
 * GBP 0.83545, INR 105.3315), crossed through the USD peg and rounded to two
 * decimals. Source: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
 * They are not live rates and need regular updating.
 */

export type Currency = "AED" | "USD" | "EUR" | "GBP" | "INR";

export const DEFAULT_CURRENCY: Currency = "AED";

export const CURRENCIES: readonly Currency[] = ["AED", "USD", "EUR", "GBP", "INR"] as const;

export const CURRENCY_COOKIE_NAME = "currency";

/** Fixed rates reference date */
export const RATES_AS_OF = "2026-11-10";

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
    // ECB 2026-11-10: 1.1214 USD per EUR x 3.6725 = 4.1183 => 4.12 AED per EUR
    rateFromAed: 1 / 4.12,
  },
  GBP: {
    code: "GBP",
    label: "GBP (£)",
    symbol: "£",
    prefix: "£",
    // ECB 2026-11-10: (1.1214 / 0.83545) USD per GBP x 3.6725 = 4.9295 => 4.93 AED per GBP
    rateFromAed: 1 / 4.93,
  },
  INR: {
    code: "INR",
    label: "INR (₹)",
    symbol: "₹",
    prefix: "₹",
    // ECB 2026-11-10: (105.3315 / 1.1214) INR per USD / 3.6725 = 25.576 => 25.58 INR per AED
    rateFromAed: 25.58,
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
