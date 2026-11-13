"use client";

import { useEffect, useMemo, useState } from "react";
import type { Currency } from "@/config/currency";
import { convertFromAed, convertToAed } from "@/config/currency";
import { DEFAULT_PREFS, GOALS, PREFS_KEY, parsePrefs, rankForYou, type Goal, type Prefs } from "@/lib/forYou";
import { count, formatMoney, formatPsf, pct } from "@/lib/format";
import type { MapBuildingProps } from "@/lib/mapMetrics";
import { DISCLAIMER, SOURCES } from "@/lib/sources";

type Feature = MapBuildingProps & { lng: number; lat: number };

/** Tell us what matters (income, price, recent change, activity), see matching buildings, tap one to open it on the map. */
export default function ForYouPanel({ features, currency, periodEnd, onPick, onClose }: { features: Feature[]; currency: Currency; periodEnd: string | null; onPick: (slug: string) => void; onClose: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [budget, setBudget] = useState("");
  const [minYield, setMinYield] = useState("");

  useEffect(() => {
    let p = DEFAULT_PREFS;
    try { p = parsePrefs(localStorage.getItem(PREFS_KEY)); } catch { /* use defaults */ }
    setPrefs(p);
    setBudget(p.maxPrice ? String(Math.round(convertFromAed(p.maxPrice, currency))) : "");
    setMinYield(p.minYield ? String(+(p.minYield * 100).toFixed(1)) : "");
    // read once when the panel opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  function update(next: Prefs) {
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* choices last for this visit */ }
  }
  const num = (s: string) => { const n = Number(s.replace(/,/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
  const results = useMemo(() => rankForYou(features, prefs), [features, prefs]);
  const why = (f: Feature, g: Goal) => g === "yield" ? `${pct(f.yield)} gross yield (est.)` : g === "value" ? `${formatPsf(f.psf, currency)} median` : g === "growth" ? `${pct(f.change, 1, true)} on a year earlier` : `${count(f.sales)} sales in 12 months`;

  return (
    <>
      <div className="dpi-backdrop fixed inset-0 z-[46] md:bg-transparent md:backdrop-blur-none" onClick={onClose} aria-hidden />
      <section role="dialog" aria-modal="true" aria-label="Buildings for you" className="dpi-glass fixed inset-x-0 bottom-0 z-[47] max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4 md:inset-x-auto md:bottom-4 md:left-4 md:max-h-[calc(100dvh-6rem)] md:w-[392px] md:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Buildings for you</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Pick what matters. The list is a filter and sort of DLD figures, not advice. Your choices stay in this browser.</p>
        <fieldset className="mt-3">
          <legend className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">What matters most</legend>
          <div className="grid gap-1.5">
            {GOALS.map((g) => (
              <label key={g.id} className={`flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 ring-1 ${prefs.goal === g.id ? "bg-cyan-300/15 ring-cyan-300/60" : "bg-white/[0.06] ring-white/10"}`}>
                <input type="radio" name="goal" className="mt-1" checked={prefs.goal === g.id} onChange={() => update({ ...prefs, goal: g.id })} />
                <span><span className="block text-sm font-medium">{g.label}</span><span className="block text-xs text-[var(--muted)]">{g.hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--muted)]">Budget up to ({currency})
            <input inputMode="numeric" value={budget} placeholder="Any" onChange={(e) => { setBudget(e.target.value); const n = num(e.target.value); update({ ...prefs, maxPrice: n ? Math.round(convertToAed(n, currency)) : null }); }}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-base text-[var(--fg)] outline-none focus:border-cyan-300 md:text-sm" />
          </label>
          <label className="text-xs text-[var(--muted)]">Gross yield at least (%)
            <input inputMode="decimal" value={minYield} placeholder="Any" onChange={(e) => { setMinYield(e.target.value); const n = num(e.target.value); update({ ...prefs, minYield: n ? Math.min(n, 100) / 100 : null }); }}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-base text-[var(--fg)] outline-none focus:border-cyan-300 md:text-sm" />
          </label>
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted)]">Budget is compared with each building&apos;s median sale price. Only buildings with 5 or more sales in 12 months are listed.</p>
        <h3 className="mt-3 text-sm font-semibold">{results.length ? `${results.length} to look at` : "No buildings match"}</h3>
        {results.length === 0 && <p className="mt-1 text-sm text-[var(--muted)]">Try a higher budget or a lower yield.</p>}
        <ol className="mt-1 divide-y divide-white/10">
          {results.map((f) => (
            <li key={f.slug}>
              <button type="button" onClick={() => { onPick(f.slug); onClose(); }} className="flex w-full items-baseline justify-between gap-3 py-2 text-start hover:text-cyan-200">
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{f.name}</span><span className="block truncate text-xs text-[var(--muted)]">{f.community} · median {formatMoney(f.price, currency)}</span></span>
                <span className="shrink-0 text-xs tabular-nums">{why(f, prefs.goal)}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-[var(--muted)]">Source: {SOURCES.dldSales}; {SOURCES.dldRents}{periodEnd ? `, data to ${periodEnd}` : ""}. {DISCLAIMER}</p>
      </section>
    </>
  );
}
