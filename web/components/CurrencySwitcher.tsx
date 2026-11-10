"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Currency,
  CURRENCIES,
  CURRENCY_COOKIE_NAME,
  CURRENCY_RATES,
} from "@/config/currency";

export default function CurrencySwitcher({ initialCurrency }: { initialCurrency: Currency }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Currency;
    // Set cookie for 1 year
    document.cookie = `${CURRENCY_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor="currency-select" className="sr-only">
        Currency
      </label>
      <select
        id="currency-select"
        value={initialCurrency}
        onChange={handleChange}
        disabled={isPending}
        className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-medium text-[var(--fg)] hover:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-60"
        title="Change display currency"
      >
        {CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {CURRENCY_RATES[code].label}
          </option>
        ))}
      </select>
    </div>
  );
}
