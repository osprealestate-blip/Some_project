import { aedShort, count, pct, psf, roomsLabel, sqft } from "@/lib/format";
import type { ExpectedRent } from "@/lib/offPlan";
import type { Summary } from "@/lib/queries";

export default function RoomsTable({ rows, showSize = true, expected }: { rows: Summary[]; showSize?: boolean; expected?: Map<number, ExpectedRent> }) {
  const list = rows.filter((r) => r.rooms >= 0 && (r.sale_count_12m > 0 || r.rent_count_12m > 0));
  if (!list.length) return <p className="text-sm text-[var(--muted)]">No sales or rents in the last 12 months.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
        <thead className="text-xs text-[var(--muted)]">
          <tr className="border-b border-[var(--border)]">
            <th className="py-1 text-start font-medium">Type</th>
            <th className="py-1 text-end font-medium">Sales</th>
            <th className="py-1 text-end font-medium">Median price</th>
            {showSize && <th className="py-1 text-end font-medium">Median size</th>}
            <th className="py-1 text-end font-medium">Per sq ft</th>
            <th className="py-1 text-end font-medium">Median rent / yr</th>
            <th className="py-1 text-end font-medium">Gross yield*</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.rooms} className="border-b border-[var(--border)]">
              <td className="py-1.5">{roomsLabel(r.rooms)}</td>
              <td className="py-1.5 text-end">{count(r.sale_count_12m)}</td>
              <td className="py-1.5 text-end">{aedShort(r.sale_median_price_12m)}</td>
              {showSize && <td className="py-1.5 text-end">{sqft(r.sale_median_size_12m)}</td>}
              <td className="py-1.5 text-end">{psf(r.sale_median_psf_12m)}</td>
              <td className="py-1.5 text-end">
                {r.rent_median_12m == null && expected?.get(r.rooms) ? (
                  <>~{aedShort(expected.get(r.rooms)!.median)}<span className="text-xs text-[var(--muted)]"> exp.</span></>
                ) : aedShort(r.rent_median_12m)}
                {r.rent_median_12m != null && r.rent_level === "project" && <span className="text-xs text-[var(--muted)]"> project</span>}
                {r.rent_median_12m != null && r.rent_level === "estimated" && <span className="text-xs text-[var(--muted)]"> est.</span>}
              </td>
              <td className="py-1.5 text-end">
                {r.gross_yield == null && expected?.get(r.rooms) && r.sale_median_price_12m ? (
                  <>~{pct(expected.get(r.rooms)!.median / r.sale_median_price_12m)}<span className="text-xs text-[var(--muted)]"> exp.</span></>
                ) : pct(r.gross_yield)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
