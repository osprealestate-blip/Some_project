"use client";

import { useId, useState } from "react";
import { COST_DISCLAIMER, DEFAULT_COST_CONFIG } from "@/config/costs";
import { calculateMonthlyCosts } from "@/lib/costs";
import { aed, count, pct } from "@/lib/format";

interface Props {
  initialPrice: number | null | undefined;
  annualRent: number | null | undefined;
  typicalSizeSqft: number | null | undefined;
  buildingName?: string;
}

export default function MonthlyCostCalculator({
  initialPrice,
  annualRent,
  typicalSizeSqft,
  buildingName,
}: Props) {
  const formId = useId();

  // Inputs
  const [priceStr, setPriceStr] = useState<string>(
    initialPrice ? String(Math.round(initialPrice)) : ""
  );
  const [downPaymentPct, setDownPaymentPct] = useState<number>(
    DEFAULT_COST_CONFIG.downPaymentPct
  );
  const [mortgageRatePct, setMortgageRatePct] = useState<number>(
    DEFAULT_COST_CONFIG.mortgageRatePct
  );
  const [termYears, setTermYears] = useState<number>(
    DEFAULT_COST_CONFIG.termYears
  );

  // Assumptions
  const [showAssumptions, setShowAssumptions] = useState<boolean>(false);
  const [serviceChargePsf, setServiceChargePsf] = useState<number>(
    DEFAULT_COST_CONFIG.serviceChargePsf
  );
  const [sizeSqft, setSizeSqft] = useState<number>(
    typicalSizeSqft && typicalSizeSqft > 0
      ? Math.round(typicalSizeSqft)
      : DEFAULT_COST_CONFIG.defaultSizeSqft
  );
  const [utilitiesMonthly, setUtilitiesMonthly] = useState<number>(
    DEFAULT_COST_CONFIG.utilitiesMonthly
  );

  // Upfront costs toggle
  const [showUpfront, setShowUpfront] = useState<boolean>(false);

  // Parse price safely
  const numericPrice = priceStr.trim() !== "" ? Number(priceStr.replace(/,/g, "")) : null;

  const result = calculateMonthlyCosts({
    purchasePrice: numericPrice,
    downPaymentPct,
    mortgageRatePct,
    termYears,
    serviceChargePsf,
    sizeSqft,
    utilitiesMonthly,
    annualRent,
  });

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <h2 className="text-base font-semibold">Monthly Cost & Net Yield Calculator</h2>
          <p className="text-xs text-[var(--muted)]">
            Estimated mortgage, building maintenance and utility expenses {buildingName ? `for ${buildingName}` : ""}.
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">{COST_DISCLAIMER}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Purchase price */}
        <div>
          <label htmlFor={`${formId}-price`} className="block text-xs font-medium text-[var(--muted)]">
            Purchase price (AED)
          </label>
          <input
            id={`${formId}-price`}
            type="text"
            inputMode="numeric"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder="e.g. 1,500,000"
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {initialPrice != null && Math.round(initialPrice) !== numericPrice && (
            <button
              type="button"
              onClick={() => setPriceStr(String(Math.round(initialPrice)))}
              className="mt-1 text-[11px] text-[var(--accent)] hover:underline"
            >
              Reset to median ({aed(initialPrice)})
            </button>
          )}
        </div>

        {/* Down payment % */}
        <div>
          <div className="flex justify-between text-xs font-medium text-[var(--muted)]">
            <label htmlFor={`${formId}-down`}>Down payment</label>
            <span className="tabular-nums font-semibold text-[var(--fg)]">{downPaymentPct}%</span>
          </div>
          <input
            id={`${formId}-down`}
            type="number"
            min={0}
            max={100}
            step={5}
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {result.isValid && (
            <p className="mt-1 text-[11px] text-[var(--muted)] tabular-nums">
              Cash: {aed(result.upfrontCosts.downPaymentCash)}
            </p>
          )}
        </div>

        {/* Mortgage interest rate % */}
        <div>
          <label htmlFor={`${formId}-rate`} className="block text-xs font-medium text-[var(--muted)]">
            Mortgage rate (%)
          </label>
          <input
            id={`${formId}-rate`}
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={mortgageRatePct}
            onChange={(e) => setMortgageRatePct(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Loan term */}
        <div>
          <label htmlFor={`${formId}-term`} className="block text-xs font-medium text-[var(--muted)]">
            Loan term (Years)
          </label>
          <input
            id={`${formId}-term`}
            type="number"
            min={1}
            max={35}
            step={1}
            value={termYears}
            onChange={(e) => setTermYears(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Assumptions toggle */}
      <div className="mt-4 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          <span>{showAssumptions ? "Hide editable cost assumptions ▲" : "Edit cost assumptions (service charge & utilities) ▼"}</span>
        </button>

        {showAssumptions && (
          <div className="mt-3 rounded border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
            <p className="mb-2 text-[11px] text-[var(--muted)]">
              Defaults are general market estimates for Dubai residential towers. Adjust to match specific building fees.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor={`${formId}-sc`} className="block font-medium text-[var(--muted)]">
                  Service charge (AED/sq ft/yr)
                </label>
                <input
                  id={`${formId}-sc`}
                  type="number"
                  min={0}
                  step={1}
                  value={serviceChargePsf}
                  onChange={(e) => setServiceChargePsf(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 tabular-nums"
                />
              </div>
              <div>
                <label htmlFor={`${formId}-size`} className="block font-medium text-[var(--muted)]">
                  Apartment size (sq ft)
                </label>
                <input
                  id={`${formId}-size`}
                  type="number"
                  min={100}
                  step={50}
                  value={sizeSqft}
                  onChange={(e) => setSizeSqft(Math.max(50, Number(e.target.value) || 50))}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 tabular-nums"
                />
              </div>
              <div>
                <label htmlFor={`${formId}-util`} className="block font-medium text-[var(--muted)]">
                  DEWA & Chiller estimate (AED/mo)
                </label>
                <input
                  id={`${formId}-util`}
                  type="number"
                  min={0}
                  step={50}
                  value={utilitiesMonthly}
                  onChange={(e) => setUtilitiesMonthly(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 tabular-nums"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Outputs */}
      {result.isValid ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total monthly cost */}
            <div className="rounded border border-[var(--accent)] bg-[var(--accent)]/10 p-3 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-medium text-[var(--muted)]">Total monthly cost</span>
              <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--fg)]">
                {aed(result.totalMonthlyCost)} <span className="text-xs font-normal text-[var(--muted)]">/ mo</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">Mortgage + Service charge + Utilities</p>
            </div>

            {/* Mortgage payment */}
            <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-3">
              <span className="text-xs text-[var(--muted)]">Mortgage payment</span>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {aed(result.monthlyMortgage)} <span className="text-xs font-normal text-[var(--muted)]">/ mo</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)] tabular-nums">
                Loan: {aed(result.loanAmount)} ({100 - downPaymentPct}% over {termYears}y)
              </p>
            </div>

            {/* Service charge */}
            <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-3">
              <span className="text-xs text-[var(--muted)]">Estimated service charge</span>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {aed(result.monthlyServiceCharge)} <span className="text-xs font-normal text-[var(--muted)]">/ mo</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)] tabular-nums">
                {aed(result.annualServiceCharge)}/yr ({serviceChargePsf} AED/sq ft on {count(sizeSqft)} sq ft)
              </p>
            </div>

            {/* Utilities */}
            <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-3">
              <span className="text-xs text-[var(--muted)]">DEWA & chiller estimate</span>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {aed(result.monthlyUtilities)} <span className="text-xs font-normal text-[var(--muted)]">/ mo</span>
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">Electricity, water & district cooling</p>
            </div>
          </div>

          {/* Net Yield Section */}
          <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold text-sm">Net Yield After Costs</span>
              {result.netYield != null ? (
                <span className="text-base font-bold tabular-nums text-[var(--accent)]">
                  {pct(result.netYield, 2)}
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)] italic">
                  {result.netYieldNote ?? "No rental data"}
                </span>
              )}
            </div>
            {result.netYield != null && annualRent != null && (
              <p className="mt-1 text-[11px] text-[var(--muted)] tabular-nums">
                Based on annual rent of {aed(annualRent)} minus annual service charge of {aed(result.annualServiceCharge)} divided by purchase price of {aed(result.purchasePrice)}.
              </p>
            )}
          </div>

          {/* Upfront Costs Accordion */}
          <div className="border-t border-[var(--border)] pt-2">
            <button
              type="button"
              onClick={() => setShowUpfront(!showUpfront)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--fg)] hover:text-[var(--accent)]"
            >
              <span>{showUpfront ? "Hide upfront purchase costs ▲" : "Show estimated upfront purchase costs (DLD & Mortgage fees) ▼"}</span>
            </button>

            {showUpfront && (
              <div className="mt-2 rounded border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
                <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-[var(--muted)]">Down payment ({downPaymentPct}%)</dt>
                    <dd className="font-semibold tabular-nums">{aed(result.upfrontCosts.downPaymentCash)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">DLD transfer fee (4%)</dt>
                    <dd className="font-semibold tabular-nums">{aed(result.upfrontCosts.dldTransferFee)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Mortgage registration</dt>
                    <dd className="font-semibold tabular-nums">
                      {aed(result.upfrontCosts.mortgageRegistrationFee)}
                    </dd>
                    <p className="text-[10px] text-[var(--muted)]">0.25% of loan + AED 290</p>
                  </div>
                  <div className="rounded bg-[var(--panel)] p-2">
                    <dt className="font-medium text-[var(--fg)]">Total upfront cash needed</dt>
                    <dd className="text-sm font-bold tabular-nums text-[var(--accent)]">
                      {aed(result.upfrontCosts.totalUpfront)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
          {result.message ?? "Enter a purchase price to calculate monthly costs."}
        </div>
      )}
    </div>
  );
}
