"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Area = { code: string; label: string };
const BEDS = [["", "Any bedrooms"], ["0", "Studio"], ["1", "1 bedroom"], ["2", "2 bedrooms"], ["3", "3 bedrooms"], ["4", "4+ bedrooms"]];
const PRICES = [["", "Any price"], ["1000000", "Up to AED 1,000,000"], ["1500000", "Up to AED 1,500,000"], ["2000000", "Up to AED 2,000,000"], ["3000000", "Up to AED 3,000,000"], ["5000000", "Up to AED 5,000,000"]];

const field = "mt-1 w-full rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm";

/** Buy / Rent tabs and three plain fields that open the Buildings list with those filters. Prices are DLD sale medians. */
export default function HomeSearch({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"buy" | "rent">("buy");
  function go(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const p = new URLSearchParams({ c: String(d.get("area") ?? areas[0]?.code ?? "") });
    const beds = String(d.get("beds") ?? "");
    const price = String(d.get("price") ?? "");
    if (beds) p.set("rooms", beds);
    if (mode === "buy" && price) p.set("maxPrice", price);
    p.set("sort", mode === "rent" ? "rent" : "sales");
    router.push(`/buildings?${p.toString()}`);
  }
  return (
    <form onSubmit={go} className="rounded-2xl bg-[var(--panel)] p-3 shadow-sm sm:p-4" aria-label="Find buildings">
      <div role="tablist" aria-label="Buy or rent" className="mb-3 inline-flex rounded-full border border-[var(--border)] p-0.5 text-sm">
        {(["buy", "rent"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`rounded-full px-5 py-1.5 font-medium ${mode === m ? "bg-[var(--fg)] text-[var(--bg)]" : "text-[var(--muted)]"}`}>{m === "buy" ? "Buy" : "Rent"}</button>
        ))}
      </div>
      <div className={`grid gap-3 ${mode === "buy" ? "sm:grid-cols-[1fr_1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_auto]"} sm:items-end`}>
        <label className="text-xs font-medium text-[var(--muted)]">Area
          <select name="area" className={field} defaultValue={areas[0]?.code}>{areas.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}</select>
        </label>
        <label className="text-xs font-medium text-[var(--muted)]">Type
          <select name="beds" className={field}>{BEDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        {mode === "buy" && (
          <label className="text-xs font-medium text-[var(--muted)]">Price
            <select name="price" className={field}>{PRICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
        )}
        <button type="submit" className="min-h-11 rounded-full bg-[var(--fg)] px-6 text-sm font-semibold text-[var(--bg)] hover:opacity-90">Search buildings</button>
      </div>
    </form>
  );
}
