"use client";

import { useEffect, useState } from "react";
import { Currency, CURRENCY_COOKIE_NAME, DEFAULT_CURRENCY, parseCurrency } from "@/config/currency";

export function useCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CURRENCY_COOKIE_NAME}=([^;]+)`));
    if (match) {
      setCurrency(parseCurrency(decodeURIComponent(match[1])));
    }
  }, []);

  return currency;
}
