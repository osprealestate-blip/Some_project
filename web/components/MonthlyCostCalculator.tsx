"use client";

import { useState } from "react";
import SourceNote from "@/components/SourceNote";
import Term from "@/components/Term";
import { type Currency, DEFAULT_CURRENCY, getConversionNote } from "@/config/currency";
import { DEFAULT_COST_CONFIG } from "@/config/costs";
import { calculateMonthlyCosts } from "@/lib/costs";
import { rentScenarios } from "@/lib/rentScenarios";
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
  const [agency, setAgency] = useState(String(DEFAULT_COST_CONFIG.agencyFeePct));
  const [maint, setMaint] = useState(String(DEFAULT_COST_CONFIG.maintenancePsf));
  const [vacancy, setVacancy] = useState(String(DEFAULT_COST_CONFIG.vacancyPct));
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
  const costInputs = {
    purchasePrice: priceNum ?? null,
    downPaymentPct: num(downPct),
    mortgageRatePct: num(rate),
    termYears: num(term),
    serviceChargePsf: num(scPsf),
    sizeSqft: num(size),
    utilitiesMonthly: num(utilities),
    agencyFeePct: num(agency),
    maintenancePsf: num(maint),
    vacancyPct: num(vacancy),
    annualRent: row?.rent_median_12m ?? null,
  };
  const res = calculateMonthlyCosts(costInputs);
  const scenarios = rentScenarios(costInputs);
  const money = (n: number | null | undefined) => formatAedWithConverted(n, currency);
  const conversionNote = getConversionNote(currency);
  const rentNote = row?.rent_level ? RENT_NOTE[row.rent_level] : undefined;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <h2 className="text-base font-semibold">Monthly cost and net yield</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Pick a bedroom type. We fill in its typical price and size from DLD sales; everything else is an assumption you set.</p>

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

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">From DLD data <span className="font-normal text-[var(--muted)]">(typical for this building and bedroom type; you can change them)</span></legend>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <label className="font-medium">Purchase price (AED)
            <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1,500,000" className={inputCls} />
          </label>
          <label className="font-medium">Size (sq ft)
            <input type="number" min={100} step={50} value={size} onChange={(e) => setSize(e.target.value)} placeholder={String(DEFAULT_COST_CONFIG.defaultSizeSqft)} className={inputCls} />
          </label>
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Your assumptions <span className="font-normal text-[var(--muted)]">(general starting values, not facts about this building: replace them with your own)</span></legend>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <label className="font-medium">Down payment (%)
            <input type="number" min={0} max={100} step={5} value={downPct} onChange={(e) => setDownPct(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium">Mortgage rate (%)
            <input type="number" min={0} max={20} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium">Loan term (years)
            <input type="number" min={1} max={25} step={1} value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium"><Term id="service-charge">Service charge</Term> (AED per sq ft a year)
            <input type="number" min={0} step={1} value={scPsf} onChange={(e) => setScPsf(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium">Agent fee (% of price)
            <input type="number" min={0} max={10} step={0.5} value={agency} onChange={(e) => setAgency(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium">Upkeep (AED per sq ft a year)
            <input type="number" min={0} step={0.5} value={maint} onChange={(e) => setMaint(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium">Empty time (% of the year)
            <input type="number" min={0} max={100} step={1} value={vacancy} onChange={(e) => setVacancy(e.target.value)} className={inputCls} />
          </label>
          <label className="font-medium">Utilities (AED a month)
            <input type="number" min={0} step={50} value={utilities} onChange={(e) => setUtilities(e.target.value)} className={inputCls} />
          </label>
        </div>
      </fieldset>

      {res.isValid ? (
        <>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="font-medium">Total a month</dt><dd className="text-end font-semibold tabular-nums">{money(res.totalMonthlyCost)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Mortgage</dt><dd className="text-end tabular-nums">{money(res.monthlyMortgage)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]"><Term id="service-charge" /></dt><dd className="text-end tabular-nums">{money(res.monthlyServiceCharge)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Utilities (DEWA and cooling)</dt><dd className="text-end tabular-nums">{money(res.monthlyUtilities)}</dd></div>
            <div className="flex justify-between gap-2 border-t border-[var(--border)] pt-2">
              <dt className="font-medium">Net yield (estimate, after service charge only)</dt>
              <dd className="text-end font-semibold tabular-nums">{res.netYield != null ? pct(res.netYield) : "–"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="font-medium">Net yield after empty time and upkeep (estimate)</dt>
              <dd className="text-end font-semibold tabular-nums">{res.netYieldAllCosts != null ? pct(res.netYieldAllCosts) : "–"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--muted)]">Yearly cash left after mortgage payments, if let out (estimate)</dt>
              <dd className="text-end tabular-nums">{res.annualCashFlow != null ? money(res.annualCashFlow) : "–"}</dd>
            </div>
          </dl>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {res.netYield != null && row?.rent_median_12m != null
              ? <>Median {roomsLabel(row.rooms).toLowerCase()} rent {money(row.rent_median_12m)} a year, less service charge, divided by the price. {rentNote}</>
              : "No recent rent contracts for this bedroom type, so no yield."}
          </p>

          {scenarios && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">What if the rent is lower?</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
                  <thead className="text-xs text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]"><th className="py-1 text-start font-medium">Rent</th><th className="py-1 text-end font-medium"><Term id="gross-yield">Gross yield</Term></th><th className="py-1 text-end font-medium">Net yield</th><th className="py-1 text-end font-medium">Cash left a year</th><th className="py-1 text-end font-medium">Cash on cash</th></tr>
                  </thead>
                  <tbody>
                    {scenarios.map((r) => (
                      <tr key={r.label} className="border-b border-[var(--border)]">
                        <td className="py-1.5">{r.label}</td><td className="py-1.5 text-end">{pct(r.grossYield)}</td><td className="py-1.5 text-end">{pct(r.netYield)}</td>
                        <td className="py-1.5 text-end">{money(r.annualCashFlow)}</td><td className="py-1.5 text-end">{pct(r.cashOnCash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">Gross yield is rent over price. Net yield also takes off empty time, service charge and upkeep. Cash on cash is the yearly cash left after mortgage payments, over the cash needed to buy. Only the rent changes between rows; every cost is your assumption. A what-if, not a forecast.</p>
            </details>
          )}

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium">Cash needed to buy</summary>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Down payment</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.downPaymentCash)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">DLD transfer fee (4%)</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.dldTransferFee)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Mortgage registration (0.25% of loan + AED 290)</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.mortgageRegistrationFee)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Agent fee ({num(agency) ?? 0}%, your assumption)</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.agencyFee)}</dd></div>
              <div className="flex justify-between gap-2 font-medium"><dt>Total</dt><dd className="text-end tabular-nums">{money(res.upfrontCosts.totalUpfront)}</dd></div>
            </dl>
            <p className="mt-1 text-xs text-[var(--muted)]">Trustee, title-deed and bank fees are not included. Interest over the whole loan: {money(res.totalInterest)} if the rate never changes.</p>
          </details>
        </>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted)]">Enter a purchase price to see the monthly cost.</p>
      )}

      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={periodEnd} estimate>
        Starting price, size and rent are 12-month medians for the bedroom type. Mortgage rate, agent fee, service charge, upkeep, empty time and utilities are general assumptions, not this building&apos;s figures. Utilities are left out of the yield because a tenant normally pays them.{conversionNote ? ` ${conversionNote}` : ""}
      </SourceNote>
    </div>
  );
}
