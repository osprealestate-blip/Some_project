import { describe, expect, it } from "vitest";
import {
  CURRENCIES,
  CURRENCY_RATES,
  DEFAULT_CURRENCY,
  RATES_AS_OF,
  convertFromAed,
  convertToAed,
  getConversionNote,
  parseCurrency,
} from "./currency";
import {
  aed,
  aedShort,
  formatMoney,
  formatPsf,
  formatShortPrice,
  formatAedWithConverted,
  psf,
} from "@/lib/format";

describe("Currency configuration & rates", () => {
  it("defines supported currencies with AED as default", () => {
    expect(DEFAULT_CURRENCY).toBe("AED");
    expect(CURRENCIES).toEqual(["AED", "USD", "EUR", "GBP", "INR"]);
    expect(RATES_AS_OF).toBe("2026-11-01");
  });

  it("pegs AED to USD at exactly 3.6725 AED per USD", () => {
    expect(CURRENCY_RATES.USD.rateFromAed).toBeCloseTo(1 / 3.6725, 6);
    expect(convertFromAed(36725, "USD")).toBe(10000);
  });

  it("converts from AED to all supported currencies", () => {
    expect(convertFromAed(1000, "AED")).toBe(1000);
    expect(convertFromAed(36725, "USD")).toBeCloseTo(10000, 5);
    expect(convertFromAed(3980, "EUR")).toBeCloseTo(1000, 5);
    expect(convertFromAed(4650, "GBP")).toBeCloseTo(1000, 5);
    expect(convertFromAed(100, "INR")).toBe(2300);
  });

  it("converts back to AED correctly", () => {
    expect(convertToAed(10000, "USD")).toBeCloseTo(36725, 5);
    expect(convertToAed(1000, "EUR")).toBeCloseTo(3980, 5);
    expect(convertToAed(1000, "GBP")).toBeCloseTo(4650, 5);
    expect(convertToAed(2300, "INR")).toBe(100);
  });
});

describe("parseCurrency cookie fallback", () => {
  it("returns AED for missing or empty inputs", () => {
    expect(parseCurrency(undefined)).toBe("AED");
    expect(parseCurrency(null)).toBe("AED");
    expect(parseCurrency("")).toBe("AED");
    expect(parseCurrency("   ")).toBe("AED");
  });

  it("falls back to AED for invalid or unsupported currencies", () => {
    expect(parseCurrency("INVALID")).toBe("AED");
    expect(parseCurrency("CAD")).toBe("AED");
    expect(parseCurrency("JPY")).toBe("AED");
    expect(parseCurrency("123")).toBe("AED");
  });

  it("normalises valid currencies case-insensitively with whitespace", () => {
    expect(parseCurrency("usd")).toBe("USD");
    expect(parseCurrency("  eur  ")).toBe("EUR");
    expect(parseCurrency("Gbp")).toBe("GBP");
    expect(parseCurrency("INR")).toBe("INR");
    expect(parseCurrency("AED")).toBe("AED");
  });
});

describe("Conversion attribution note", () => {
  it("returns null for AED and a note for other currencies", () => {
    expect(getConversionNote("AED")).toBeNull();
    expect(getConversionNote("USD")).toBe("Converted from AED at the official peg (AED 3.6725 = USD 1).");
    expect(getConversionNote("EUR")).toBe(`Converted from AED at approximate fixed rates set on ${RATES_AS_OF}; not live rates.`);
    expect(getConversionNote("GBP")).toBe(`Converted from AED at approximate fixed rates set on ${RATES_AS_OF}; not live rates.`);
    expect(getConversionNote("INR")).toBe(`Converted from AED at approximate fixed rates set on ${RATES_AS_OF}; not live rates.`);
  });
});

describe("Currency formatting and rounding", () => {
  it("keeps output unchanged for AED", () => {
    expect(formatMoney(1_250_000, "AED")).toBe("AED 1,250,000");
    expect(aed(1_250_000)).toBe("AED 1,250,000");
    expect(formatShortPrice(1_250_000, "AED")).toBe("AED 1.25M");
    expect(aedShort(1_250_000)).toBe("AED 1.25M");
    expect(formatShortPrice(85_000, "AED")).toBe("AED 85K");
    expect(aedShort(85_000)).toBe("AED 85K");
    expect(formatPsf(1_450, "AED")).toBe("AED 1,450/sq ft");
    expect(psf(1_450)).toBe("AED 1,450/sq ft");
  });

  it("formats USD prices with $ prefix and integer rounding", () => {
    // 3,672,500 AED = 1,000,000 USD
    expect(formatMoney(3_672_500, "USD")).toBe("$1,000,000");
    expect(formatShortPrice(3_672_500, "USD")).toBe("$1.00M");
    // 367,250 AED = 100,000 USD -> $100K
    expect(formatShortPrice(367_250, "USD")).toBe("$100K");
    // 3,672.5 AED/sq ft = 1,000 USD/sq ft
    expect(formatPsf(3_672.5, "USD")).toBe("$1,000/sq ft");
    // Fractional rounding test
    expect(formatMoney(3.6725 * 50.4, "USD")).toBe("$50");
    expect(formatMoney(3.6725 * 50.6, "USD")).toBe("$51");
  });

  it("formats EUR prices with € prefix", () => {
    expect(formatMoney(398_000, "EUR")).toBe("€100,000");
    expect(formatShortPrice(398_000, "EUR")).toBe("€100K");
    expect(formatPsf(398, "EUR")).toBe("€100/sq ft");
  });

  it("formats GBP prices with £ prefix", () => {
    expect(formatMoney(465_000, "GBP")).toBe("£100,000");
    expect(formatShortPrice(465_000, "GBP")).toBe("£100K");
    expect(formatPsf(465, "GBP")).toBe("£100/sq ft");
  });

  it("formats INR prices with ₹ prefix", () => {
    // 100,000 AED * 23 = 2,300,000 INR
    expect(formatMoney(100_000, "INR")).toBe("₹2,300,000");
    expect(formatShortPrice(100_000, "INR")).toBe("₹2.30M");
    expect(formatPsf(100, "INR")).toBe("₹2,300/sq ft");
  });

  it("handles null and undefined values gracefully", () => {
    expect(formatMoney(null, "USD")).toBe("–");
    expect(formatMoney(undefined, "EUR")).toBe("–");
    expect(formatShortPrice(null, "GBP")).toBe("–");
    expect(formatPsf(null, "INR")).toBe("–");
  });

  it("handles 0 correctly without returning dash", () => {
    expect(formatMoney(0, "AED")).toBe("AED 0");
    expect(formatMoney(0, "USD")).toBe("$0");
  });
});

describe("formatAedWithConverted", () => {
  it("shows AED alone for AED and adds the converted figure otherwise", () => {
    expect(formatAedWithConverted(36_725, "AED")).toBe("AED 36,725");
    expect(formatAedWithConverted(36_725, "USD")).toBe("AED 36,725 (≈ $10,000)");
    expect(formatAedWithConverted(null, "USD")).toBe("–");
  });
});
