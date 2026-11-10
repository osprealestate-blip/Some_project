"use client";

import { useEffect, useState } from "react";
import BuildingPicker, { type Picked } from "./BuildingPicker";
import { BANDS, maxRentIncrease, noticeDeadline } from "@/lib/rentIncrease";
import { day, formatMoney, pct, roomsLabel } from "@/lib/format";
import { DISCLAIMER, SOURCES } from "@/lib/sources";
import { useCurrency } from "@/lib/useCurrency";

type MarketRent = { scope: "building" | "project" | "community"; median: number; count: number; from: string; to: string };
const SCOPE_TEXT = { building: "this building", project: "this project", community: "this community" };

export default function RentIncreaseForm({ initial }: { initial: Picked | null }) {
  const currency = useCurrency();
  const [building, setBuilding] = useState<Picked | null>(initial);
  const [rooms, setRooms] = useState(1);
  const [current, setCurrent] = useState("");
  const [average, setAverage] = useState("");
  const [end, setEnd] = useState("");
  const [market, setMarket] = useState<MarketRent | null>(null);

  useEffect(() => {
    setMarket(null);
    if (!building) return;
    const ctrl = new AbortController();
    fetch(`/api/market-rent?building=${encodeURIComponent(building.slug)}&rooms=${rooms}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { rent: null }))
      .then((d: { rent: MarketRent | null }) => setMarket(d.rent))
      .catch(() => {});
    return () => ctrl.abort();
  }, [building, rooms]);

  const cur = Number(current.replace(/,/g, ""));
  const officialAvg = Number(average.replace(/,/g, ""));
  const usingEstimate = !(officialAvg > 0) && market != null;
  const avg = officialAvg > 0 ? officialAvg : market?.median ?? 0;
  const res = maxRentIncrease(cur, avg);
  const endDate = end ? new Date(`${end}T00:00:00Z`) : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4" onSubmit={(e) => e.preventDefault()}>
        <label className="block text-sm font-medium">Current annual rent (AED)
          <input inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="85,000" className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-normal" />
        </label>
        <label className="block text-sm font-medium">Average rent from the official RERA index (AED, if you have it)
          <input inputMode="numeric" value={average} onChange={(e) => setAverage(e.target.value)} placeholder="From the DLD Rental Index calculator" className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-normal" />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Or estimate the average from DLD rent contracts</span>
          <BuildingPicker value={building} onChange={setBuilding} />
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((r) => (
              <label key={r} className={`cursor-pointer rounded-md border px-3 py-1 text-sm ${rooms === r ? "border-[var(--accent)] bg-[var(--bg)]" : "border-[var(--border)]"}`}>
                <input type="radio" name="rooms" className="sr-only" checked={rooms === r} onChange={() => setRooms(r)} />{roomsLabel(r)}
              </label>
            ))}
          </div>
          {building && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              {market ? <>Median {roomsLabel(rooms).toLowerCase()} rent in {SCOPE_TEXT[market.scope]}: <strong>{formatMoney(market.median, currency)}</strong> ({market.count} contracts, {day(market.from)} to {day(market.to)}).</> : "Not enough recent contracts for this bedroom type."}
            </p>
          )}
        </div>
        <label className="block text-sm font-medium">Contract end date (optional)
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-normal" />
        </label>
      </form>

      <div aria-live="polite" className="space-y-4">
        {res ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="text-sm text-[var(--muted)]">Most the rent can go up</p>
            <p className="text-3xl font-semibold tabular-nums">{pct(res.maxIncrease, 0)}</p>
            <p className="mt-1 text-sm">New rent at most <strong className="tabular-nums">{formatMoney(res.maxNewRent, currency)}</strong> a year.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Your rent is {res.below >= 0 ? `${pct(res.below)} below` : `${pct(-res.below)} above`} the {usingEstimate ? "estimated" : "RERA"} average of {formatMoney(avg, currency)}. {res.band.text}.
            </p>
            {endDate && <p className="mt-2 text-sm">The landlord must give written notice of any increase by <strong>{day(noticeDeadline(endDate))}</strong> (90 days before the contract ends).</p>}
            <p className="mt-3 text-xs text-[var(--muted)]">
              Rule: Dubai Decree No. 43 of 2013. {usingEstimate ? <>Average estimated from {SOURCES.dldRents}. The official figure is the RERA index on the DLD Rental Index calculator, and it decides disputes. <strong className="font-medium">{DISCLAIMER}</strong></> : "Using the RERA average you entered."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">Enter your current rent and either the RERA average or a building to see the answer.</div>
        )}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-sm">
          <h2 className="font-medium">The rule</h2>
          <ul className="mt-2 space-y-1">
            {BANDS.map((b) => <li key={b.text} className={res?.band === b ? "font-semibold" : ""}>{b.text}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
