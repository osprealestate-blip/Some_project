"use client";

import { useState } from "react";
import SourceNote from "@/components/SourceNote";
import { type Currency, DEFAULT_CURRENCY, getConversionNote } from "@/config/currency";
import { DEFAULT_COST_CONFIG } from "@/config/costs";
import { calculateMonthlyCosts } from "@/lib/costs";
import { formatAedWithConverted, pct, roomsLabel } from "@/lib/format";
import type { Summary } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";

const RENT_NOTE: Record<string, string> = {
  project: "Rent is the median for the whole project, not this tower.",
  estimated: "Rent is estimated: some contracts were placed in this building by unit size.",
};

const inputCls = "mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-normal tabular-nums";

/** Holding cost and net yield for one bedroom type. Inputs are AED; the selected currency is shown alongside. */
export default function MonthlyCostCalculator({
  rows,
  periodEnd,
  currency = DEFAULT_CURRENCY,
}: {
  rows: Summary[];
  periodEnd: string | null;
  currency?: Currency;
}) {
  const types = rows.filter((r) => r.rooms >= 0 && r.sale_median_price_12m != null);
  const busiest = [...types].sort((a, b) => b.sale_count_12m - a.sale_count_12m)[0];

  const [rooms, setRooms] = useState<number | null>(busiest?.rooms ?? null);
  const row = types.find((r) => r.rooms === rooms) ?? null;
  const [price, setPrice] = useState(row?.sale_median_price_12m ? String(Math.round(row.sale_median_price_12m)) : "");
  const [size, setSize] = useState(row?.sale_median_size_12m ? String(Math.round(row.sale_median_size_12m)) : "");
  const [downPct, setDownPct] = useState(String(DEFAULT_COST_CONFIG.downPaymentPct));
  const [rate, setRate] = useState(String(DEFAULT_COST_CONFIG.mortgageRatePct));
  const [term, setTerm] = useState(String(DEFAULT_COST_CONFIG.termYears));
  const [scPsf, setScPsf] = useState(String(DEFAULT_COST_CONFIG.serviceChargePsf));
  const [utilities, setUtilities] = useState(String(DEFAULT_COST_CONFIG.utilitiesMonthly));

  const pickRooms = (r: number) => {
    const next = types.find((t) => t.rooms === r);
    setRooms(r);
    setPrice(next?.sale_median_price_12m ? String(Math.round(next.sale_median_price_12m)) : "");
    setSize(next?.sale_median_size_12m ? String(Math.round(next.sale_median_size_12m)) : "");
  };

  /** Empty or unparseable text becomes undefined, so the calculation falls back to its default. */
  const num = (s: string) => {
    const n = Number(s.replace(/,/g, ""));
    return s.trim() === "" || !Number.isFinite(n) ? undefined : n;
  };
  const priceNum = num(price);
  const res = calculateMonthlyCosts({
    purchasePrice: priceNum ?? null,
    downPaymentPct: num(downPct),
    mortgageRatePct: num(rate),
    termYears: num(term),
    serviceChargePsf: num(scPsf),
    sizeSqft: num(size),
    utilitiesMonthly: num(utilities),
    annualRent: row?.rent_median_12m ?? null,
  });
  const money = (n: number | null | undefined) => formatAedWithConverted(n, currency);
  const conversionNote = getConversionNote(currency);
  const rentNote = row?.rent_level ? RENT_NOTE[row.rent_level] : undefined;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <h2 className="text-base font-semibold">Monthly cost and net yield</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Starts from this building&apos;s median price for one bedroom type. Change any figure.</p>

      {types.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t.rooms}
              type="button"
              onClick={() => pickRooms(t.rooms)}
              className={`rounded-md border px-3 py-1 text-sm ${rooms === t.rooms ? "border-[var(--accent)] bg-[var(--bg)]" : "border-[var(--border)]"}`}
            >
              {roomsLabel(t.rooms)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <label className="col-span-2 font-medium">Purchase price (AED)
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1,500,000" className={inputCls} />
        </label>
        <label className="font-medium">Down payment (%)
          <input type="number" min={0} max={100} step={5} value={downPct} onChange={(e) => setDownPct(e.target.value)} className={inputCls} />
        </label>
        <label className="font-medium">Mortgage rate (%)
          <input type="number" min={0} max={20} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
        </label>
        <label className="font-medium">Loan term (years)
          <input type="number" min={1} max={25} step={1} value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls} />
        </label>
        <label className="font-medium">Size (sq ft)
          <input type="number" min={100} step={50} value={size} onChange={(e) => setSize(e.target.value)} placeholder={String(DEFAULT_COST_CONFIG.defaultSizeSqft)} className={inputCls} />
        </label>
        <label className="font-medium">Service charge (AED per sq ft a year)
          <input type="number" min={0} step={1} value={scPsf} onChange={(e) => setScPsf(e.target.value)} className={inputCls} />
        </label>
        <label className="font-medium">Utilities (AED a month)
          <input type="number" min={0} step={50} value={utilities} onChange={(e) => setUtilities(e.target.value)} className={inputCls} />
        </label>
      </div>

      {res.isValid ? (
        <>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="font-medium">Total a month</dt><dd className="text-end font-semibold tabular-nums">{money(res.totalMonthlyCost)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Mortgage</dt><dd className="text-end tabular-nums">{money(res.monthlyMortgage)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Service charge</dt><dd className="text-end tabular-nums">{money(res.monthlyServiceCharge)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Utilities (DEWA and cooling)</dt><dd className="text-end tabular-nums">{money(res.monthlyUtilities)}</dd></div>
            <div className="flex justify-between gap-2 border-t border-[var(--border)] pt-2">
              <dt className="font-medium">Net yield (estimate)</dt>
              <dd className="text-end font-semibold tabular-nums">{res.netYield != null ? pct(res.netYield) : "–"}</dd>
            </div>
          </dl>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {res.netYield != null && row?.rent_median_12m != null
              ? <>Median {roomsLabel(row.rooms).toLowerCase()} rent {money(row.rent_median_12m)} a year, less service charge, divided by the price. {rentNote}</>
              : "No recent rent contracts for this bedroom type, so no yield."}
          </p>

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium">Cash needed to buy</summary>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Down payment</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.downPaymentCash)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">DLD transfer fee (4%)</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.dldTransferFee)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Mortgage registration (0.25% of loan + AED 290)</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.mortgageRegistrationFee)}</dd></div>
              <div className="flex justify-between gap-2 font-medium"><dt>Total</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.totalUpfront)}</dd></div>
            </dl>
            <p className="mt-1 text-xs text-[var(--muted)]">Agent, trustee and bank fees are not included.</p>
          </details>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">Enter a purchase price to see the monthly cost.</p>
      )}

      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={periodEnd} estimate>
        Starting price, size and rent are 12-month medians for the bedroom type. Mortgage rate, service charge and utilities are general assumptions, not this building&apos;s figures.{conversionNote ? ` ${conversionNote}` : ""}
      </SourceNote>
    </div>
  );
}
