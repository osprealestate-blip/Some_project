import {
  Currency,
  CURRENCY_RATES,
  DEFAULT_CURRENCY,
  convertFromAed,
} from "@/config/currency";

/** Display formatting. Sizes are square feet. */

const num0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/**
 * Formats a number that is ALREADY in the target currency.
 */
export function formatConverted(
  val: number | null | undefined,
  currency: Currency = DEFAULT_CURRENCY,
  options?: { short?: boolean; perSqFt?: boolean }
): string {
  if (val == null) return "–";
  const cfg = CURRENCY_RATES[currency] ?? CURRENCY_RATES[DEFAULT_CURRENCY];
  const rounded = Math.round(val);
  const absVal = Math.abs(val);

  let formattedNumber = "";
  if (options?.short) {
    if (absVal >= 1_000_000) {
      formattedNumber = `${(val / 1_000_000).toFixed(absVal >= 10_000_000 ? 1 : 2)}M`;
    } else if (absVal >= 10_000) {
      formattedNumber = `${Math.round(val / 1000)}K`;
    } else {
      formattedNumber = num0.format(rounded);
    }
  } else {
    formattedNumber = num0.format(rounded);
  }

  const base = `${cfg.prefix}${formattedNumber}`;
  return options?.perSqFt ? `${base}/sq ft` : base;
}

/**
 * Single shared formatting helper for currency and price-per-sq-ft figures.
 * Converts from base AED to the selected currency and formats with the currency prefix/symbol.
 * Keeps output unchanged for AED.
 */
export function formatMoney(
  n: number | null | undefined,
  currency: Currency = DEFAULT_CURRENCY,
  options?: { short?: boolean; perSqFt?: boolean }
): string {
  if (n == null) return "–";
  const cfg = CURRENCY_RATES[currency] ?? CURRENCY_RATES[DEFAULT_CURRENCY];
  const converted = convertFromAed(n, cfg.code);
  return formatConverted(converted, currency, options);
}

/**
 * For tools where the user types amounts in AED: keep AED first, add the converted figure in brackets.
 * "AED 85,000" for AED; "AED 85,000 (≈ $23,145)" otherwise.
 */
export function formatAedWithConverted(n: number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string {
  if (n == null) return "–";
  const base = formatMoney(n, DEFAULT_CURRENCY);
  return currency === DEFAULT_CURRENCY ? base : `${base} (≈ ${formatMoney(n, currency)})`;
}

export function formatShortPrice(n: number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string {
  return formatMoney(n, currency, { short: true });
}

export const formatMoneyShort = formatShortPrice;

export function formatPsf(n: number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string {
  return formatMoney(n, currency, { perSqFt: true });
}

/** Format price in AED (or converted currency if specified). Output unchanged for AED. */
export function aed(n: number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string {
  return formatMoney(n, currency);
}

/** 1,250,000 -> "AED 1.25M"; 85,000 -> "AED 85K". Output unchanged for AED. */
export function aedShort(n: number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string {
  return formatMoney(n, currency, { short: true });
}

export function psf(n: number | null | undefined, currency: Currency = DEFAULT_CURRENCY): string {
  return formatMoney(n, currency, { perSqFt: true });
}

export function sqft(n: number | null | undefined): string {
  return n == null ? "–" : `${num0.format(Math.round(n))} sq ft`;
}

export function pct(n: number | null | undefined, digits = 1, signed = false): string {
  if (n == null) return "–";
  const s = `${(n * 100).toFixed(digits)}%`;
  return signed && n > 0 ? `+${s}` : s;
}

export function count(n: number | null | undefined): string {
  return n == null ? "–" : num0.format(n);
}

export function roomsLabel(rooms: number): string {
  if (rooms < 0) return "All types";
  if (rooms === 0) return "Studio";
  if (rooms >= 4) return "4+ beds";
  return `${rooms} bed${rooms === 1 ? "" : "s"}`;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-30" or a Date -> "30 Oct 2026". */
export function day(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return `${x.getUTCDate()} ${months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function monthYear(d: string | Date): string {
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return `${months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}

export function quarterLabel(d: string | Date): string {
  const x = typeof d === "string" ? new Date(`${d.slice(0, 10)}T00:00:00Z`) : d;
  return `Q${Math.floor(x.getUTCMonth() / 3) + 1} ${x.getUTCFullYear()}`;
}

export function metres(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}
