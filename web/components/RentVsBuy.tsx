import Link from "next/link";
import SourceNote from "@/components/SourceNote";
import type { Currency } from "@/config/currency";
import { formatAedWithConverted, formatShortPrice, roomsLabel } from "@/lib/format";
import { ASSUMPTIONS, type RentVsBuyRow } from "@/lib/rentVsBuy";
import { SOURCES } from "@/lib/sources";

/** Rent beside the cost of owning, per bedroom type. Shows its starting assumptions and takes no side. */
export default function RentVsBuy({ rows, periodEnd, currency }: { rows: RentVsBuyRow[]; periodEnd: string | null; currency: Currency }) {
  const money = (n: number | null) => (n == null ? "Not available" : formatAedWithConverted(n, currency));
  const first = rows.find((r) => r.cashUpfront != null);
  return (
    <section aria-labelledby="rent-vs-buy" className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-4">
      <h2 id="rent-vs-buy" className="text-base font-semibold">Renting and owning here, side by side</h2>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--muted)]">Not available: too few sales in the last 12 months to show typical prices for any bedroom type.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {rows.map((r) => (
              <li key={r.rooms} className="py-2.5">
                <h3 className="text-sm font-semibold">{roomsLabel(r.rooms)}</h3>
                <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Rent a month{r.rentLevel === "project" ? " (whole project)" : r.rentLevel === "estimated" ? " (estimated)" : ""}</dt>
                    <dd className={`font-medium ${r.monthlyRent == null ? "text-[var(--muted)]" : ""}`}>{money(r.monthlyRent)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--muted)]">Owning a month*</dt>
                    <dd className="font-medium">{money(r.monthlyOwnership)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-[var(--muted)]">Middle half of sale prices ({r.sales} sales)</dt>
                    <dd className={r.priceLow == null ? "text-[var(--muted)]" : ""}>{r.priceLow != null && r.priceHigh != null ? `${formatShortPrice(r.priceLow, currency)} to ${formatShortPrice(r.priceHigh, currency)}` : "Not available"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            * Mortgage plus service charge, at the typical price for the type. Starting assumptions, general and changeable, not facts about this building:{" "}
            {ASSUMPTIONS.downPaymentPct}% down, {ASSUMPTIONS.mortgageRatePct}% interest, {ASSUMPTIONS.termYears} years, service charge AED {ASSUMPTIONS.serviceChargePsf} per sq ft a year.
            {first?.cashUpfront != null && <> Buying also needs cash up front (down payment and fees), about {formatAedWithConverted(first.cashUpfront, currency)} for {roomsLabel(first.rooms).toLowerCase()} here. Utilities, upkeep and price changes are not included.</>}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            We do not say which is better; that depends on your plans. <Link className="link" href="#ownership-costs">Change the assumptions in the monthly cost calculator</Link>.
          </p>
          <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={periodEnd} estimate>
            Rent and price are 12-month medians; the price range is the 25th to 75th percentile of apartment sales in this building.
          </SourceNote>
        </>
      )}
    </section>
  );
}
