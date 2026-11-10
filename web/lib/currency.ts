import { cookies } from "next/headers";
import { Currency, CURRENCY_COOKIE_NAME, DEFAULT_CURRENCY, parseCurrency } from "@/config/currency";

/**
 * Reads the currency cookie in a Server Component or Server Action.
 * Falls back to "AED" if the cookie is missing or invalid.
 */
export async function getServerCurrency(): Promise<Currency> {
  try {
    const store = await cookies();
    const raw = store.get(CURRENCY_COOKIE_NAME)?.value;
    return parseCurrency(raw);
  } catch {
    return DEFAULT_CURRENCY;
  }
}
