import SourceNote from "@/components/SourceNote";
import { type Currency, DEFAULT_CURRENCY, getConversionNote } from "@/config/currency";
import { GOLDEN_VISA_CONFIG } from "@/config/goldenVisa";
import { aed, formatAedWithConverted, roomsLabel } from "@/lib/format";
import { evaluateGoldenVisa } from "@/lib/goldenVisa";
import type { Summary } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";

/**
 * Golden Visa property threshold, checked per bedroom type. A building has no single price:
 * larger flats can be above the threshold while the building's overall median is below it.
 */
export default function GoldenVisaChecker({
  rows,
  periodEnd,
  currency = DEFAULT_CURRENCY,
}: {
  rows: Summary[];
  periodEnd: string | null;
  currency?: Currency;
}) {
  const threshold = GOLDEN_VISA_CONFIG.thresholdAed;
  const list = rows
    .filter((r) => r.rooms >= 0 && r.sale_median_price_12m != null)
    .map((r) => ({ rooms: r.rooms, check: evaluateGoldenVisa(r.sale_median_price_12m, threshold) }));
  const conversionNote = getConversionNote(currency);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <h2 className="text-base font-semibold">Golden Visa price check</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        The 10-year Golden Visa for property owners needs property worth at least {aed(threshold)}. Typical prices here, by bedroom type:
      </p>
      <p className="mt-1 text-sm font-medium">This only compares prices with the threshold. It does not tell you whether you qualify.</p>
      {list.length ? (
        <div className="mt-2 overflow-x-auto"><table className="w-full text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
          <thead className="text-xs text-[var(--muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="py-1 text-start font-medium">Type</th>
              <th className="py-1 text-end font-medium">Median price*</th>
              <th className="py-1 text-end font-medium">Against {aed(threshold)}</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ rooms, check }) => (
              <tr key={rooms} className="border-b border-[var(--border)]">
                <td className="py-1.5">{roomsLabel(rooms)}</td>
                <td className="py-1.5 text-end">{formatAedWithConverted(check.price, currency)}</td>
                <td className={`py-1.5 text-end ${check.eligible ? "text-[var(--good)]" : "text-[var(--muted)]"}`}>
                  {check.isExact ? "Exactly at it" : check.eligible ? "At or above" : `${formatAedWithConverted(check.shortfall, currency)} below`}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">Too few recent sales here for a median price by bedroom type.</p>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]">
        A median is a typical price, not the price of any one flat: a unit below the median can still be above the threshold, and the other way round.
        Title deed, mortgage and off-plan rules also apply.{" "}
        <a className="link" href={GOLDEN_VISA_CONFIG.officialSourceUrl} target="_blank" rel="noopener noreferrer">Official rules on {GOLDEN_VISA_CONFIG.officialSourceName}</a>.{" "}
        {GOLDEN_VISA_CONFIG.disclaimer}
      </p>
      <SourceNote source={SOURCES.dldSales} date={periodEnd} estimate>
        * Median sale price, 12 months, same bedroom type.{conversionNote ? ` ${conversionNote}` : ""}
      </SourceNote>
    </div>
  );
}
