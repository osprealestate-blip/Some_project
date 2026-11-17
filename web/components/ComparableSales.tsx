"use client";
import { useMemo, useState } from "react";
import { convertFromAed, type Currency } from "@/config/currency";
import { filterComps, summariseComps, DEFAULT_FILTER, type CompFilter, type CompRow } from "@/lib/comparableSales";
import { count, day, formatMoney, roomsLabel, sqft } from "@/lib/format";

const ROOMS: { v: CompFilter["rooms"]; l: string }[] = [{ v: "all", l: "All" }, { v: 0, l: "Studio" }, { v: 1, l: "1 bed" }, { v: 2, l: "2 bed" }, { v: 3, l: "3+ bed" }];
const STATUS: { v: CompFilter["status"]; l: string }[] = [{ v: "all", l: "All" }, { v: "ready", l: "Ready" }, { v: "offplan", l: "Off-plan" }];

const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-[var(--accent)] bg-[var(--grid)] font-medium" : "border-[var(--border)]"}`;

/** Recent sales in this building, anonymous: date, size, price, per sq ft. Filter by bedrooms and ready or off-plan. */
export default function ComparableSales({ rows, currency }: { rows: CompRow[]; currency: Currency }) {
  const [f, setF] = useState<CompFilter>(DEFAULT_FILTER);
  const list = useMemo(() => filterComps(rows, f), [rows, f]);
  const s = useMemo(() => summariseComps(list), [list]);
  if (!rows.length) return <p className="mt-2 text-sm text-[var(--muted)]">No counted sales.</p>;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-x-6 gap-y-2" role="group" aria-label="Filter sales">
        <div className="flex flex-wrap gap-1.5">{ROOMS.map((o) => <button key={String(o.v)} type="button" aria-pressed={f.rooms === o.v} className={chip(f.rooms === o.v)} onClick={() => setF({ ...f, rooms: o.v })}>{o.l}</button>)}</div>
        <div className="flex flex-wrap gap-1.5">{STATUS.map((o) => <button key={o.v} type="button" aria-pressed={f.status === o.v} className={chip(f.status === o.v)} onClick={() => setF({ ...f, status: o.v })}>{o.l}</button>)}</div>
      </div>
      <p className="mt-3 text-sm" aria-live="polite">
        {s.count === 0 ? "No sales match these filters." : s.medianPsf != null
          ? <>{count(s.count)} sales, {day(s.from)} to {day(s.to)}. Middle value <strong>{formatMoney(convertFromAed(s.medianPsf, currency), currency)}/sq ft</strong>; the middle half sold between {count(convertFromAed(s.lowPsf!, currency))} and {count(convertFromAed(s.highPsf!, currency))}.</>
          : <>{count(s.count)} {s.count === 1 ? "sale" : "sales"}, {day(s.from)} to {day(s.to)}. Too few for a middle value (needs 5).</>}
      </p>
      {list.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
            <thead className="text-xs text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="py-1 text-start font-medium">Date</th><th className="py-1 text-start font-medium">Type</th>
                <th className="py-1 text-end font-medium">Size</th><th className="py-1 text-end font-medium">Price</th>
                <th className="py-1 text-end font-medium">Per sq ft</th><th className="py-1 text-end font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  <td className="py-1.5">{day(r.txn_date)}</td>
                  <td className="py-1.5">{r.rooms == null ? "–" : roomsLabel(r.rooms)}</td>
                  <td className="py-1.5 text-end">{sqft(r.size_sqft)}</td>
                  <td className="py-1.5 text-end">{formatMoney(r.price, currency)}</td>
                  <td className="py-1.5 text-end">{count(convertFromAed(r.price_psf, currency))}</td>
                  <td className="py-1.5 text-end">{r.off_plan == null ? "–" : r.off_plan ? "Off-plan" : "Ready"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
