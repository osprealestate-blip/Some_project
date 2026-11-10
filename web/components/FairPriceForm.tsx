"use client";

import { useState } from "react";
import BuildingPicker, { type Picked } from "./BuildingPicker";
import { assessPrice, VERDICT_TEXT, type Comparables, type FairPriceResult } from "@/lib/fairPrice";
import { day, formatMoney, formatPsf, pct, roomsLabel } from "@/lib/format";
import { DISCLAIMER, SOURCES } from "@/lib/sources";
import { useCurrency } from "@/lib/useCurrency";

const ROOM_OPTIONS = [0, 1, 2, 3, 4];

export default function FairPriceForm({ initial }: { initial: Picked | null }) {
  const currency = useCurrency();
  const [building, setBuilding] = useState<Picked | null>(initial);
  const [rooms, setRooms] = useState(1);
  const [size, setSize] = useState("");
  const [asking, setAsking] = useState("");
  const [result, setResult] = useState<FairPriceResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setMessage(null);
    const sizeN = Number(size.replace(/,/g, ""));
    const askN = asking ? Number(asking.replace(/,/g, "")) : null;
    if (!building) return setMessage("Pick a building first.");
    if (!(sizeN > 100 && sizeN < 50_000)) return setMessage("Enter the size in square feet (for example 850).");
    setBusy(true);
    try {
      const r = await fetch(`/api/fair-price?building=${encodeURIComponent(building.slug)}&rooms=${rooms}`);
      const d = (await r.json()) as { comps: Comparables | null };
      const res = assessPrice(sizeN, askN, d.comps);
      if (!res) setMessage(`Not enough ${roomsLabel(rooms).toLowerCase()} sales in the last 12 months to compare (we need at least 5).`);
      setResult(res);
    } catch {
      setMessage("Couldn't reach the data. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const tone = result?.verdict === "in_line" ? "var(--good)" : result?.verdict?.includes("above") ? "var(--warn)" : "var(--accent)";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={submit} className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Building</label>
          <BuildingPicker value={building} onChange={(b) => { setBuilding(b); setResult(null); }} />
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Bedrooms</legend>
          <div className="flex flex-wrap gap-2">
            {ROOM_OPTIONS.map((r) => (
              <label key={r} className={`cursor-pointer rounded-md border px-3 py-1 text-sm ${rooms === r ? "border-[var(--accent)] bg-[var(--bg)]" : "border-[var(--border)]"}`}>
                <input type="radio" name="rooms" className="sr-only" checked={rooms === r} onChange={() => setRooms(r)} />{roomsLabel(r)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">Size (sq ft)
            <input inputMode="numeric" value={size} onChange={(e) => setSize(e.target.value)} placeholder="850" className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-normal" />
          </label>
          <label className="text-sm font-medium">Asking price (AED, optional)
            <input inputMode="numeric" value={asking} onChange={(e) => setAsking(e.target.value)} placeholder="1,500,000" className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-normal" />
          </label>
        </div>
        <button type="submit" disabled={busy} className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Checking…" : "Check price"}</button>
        {message && <p className="text-sm text-[var(--warn)]" role="status">{message}</p>}
      </form>

      <div aria-live="polite">
        {result && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            {result.verdict && (
              <p className="text-lg font-semibold" style={{ color: tone }}>
                {VERDICT_TEXT[result.verdict]} <span className="text-sm font-normal text-[var(--muted)]">({pct(result.diff, 1, true)} vs estimate)</span>
              </p>
            )}
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Estimate</dt><dd className="font-semibold tabular-nums">{formatMoney(result.estimate, currency)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Typical range</dt><dd className="tabular-nums">{formatMoney(result.low, currency)} to {formatMoney(result.high, currency)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Median per sq ft</dt><dd className="tabular-nums">{formatPsf(result.comps.medianPsf, currency)}</dd></div>
              {result.askingPsf && <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Asking per sq ft</dt><dd className="tabular-nums">{formatPsf(result.askingPsf, currency)}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">Based on</dt><dd className="text-end">{result.comps.count} sales ({roomsLabel(rooms)}) {result.comps.scope === "building" ? "in this building" : "in this community (too few in the building)"}</dd></div>
            </dl>
            {result.confidence === "limited" && <p className="mt-3 text-xs text-[var(--warn)]">Limited comparison: few sales, or the whole community rather than this building.</p>}
            <p className="mt-3 text-xs text-[var(--muted)]">
              Source: {SOURCES.dldSales}, sales from {day(result.comps.from)} to {day(result.comps.to)}. Floor, view and condition are not known.{" "}
              <strong className="font-medium">{DISCLAIMER}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
