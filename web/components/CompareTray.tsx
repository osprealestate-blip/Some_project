"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Currency } from "@/config/currency";
import type { CardData } from "@/lib/cardData";
import { useLang, useT } from "./LangProvider";
import { fetchCard } from "@/lib/cardClient";
import { km } from "@/lib/facilities";
import { count, day, formatPsf, formatShortPrice, pct } from "@/lib/format";
import { DISCLAIMER } from "@/lib/sources";
import { compareDifferences } from "@/lib/compareSummary";
import { dataConfidence } from "@/lib/confidence";


type Props = { slugs: string[]; names: Record<string, string>; currency: Currency; onRemove: (slug: string) => void; onClear: () => void; onShow: (slug: string) => void };

/** Up to four buildings picked on the map. The tray stays on the map; "Compare" opens the table over it. */
export default function CompareTray({ slugs, names, currency, onRemove, onClear, onShow }: Props) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<Record<string, CardData>>({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    slugs.forEach((s) => fetchCard(s, lang).then((d) => setCards((c) => ({ ...c, [s]: d }))).catch(() => setFailed(true)));
  }, [open, slugs, lang]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  useEffect(() => { if (slugs.length < 2) setOpen(false); }, [slugs.length]);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-compare-active", slugs.length > 0);
    return () => document.documentElement.removeAttribute("data-compare-active");
  }, [slugs.length]);

  if (!slugs.length) return null;
  const rows: [string, (d: CardData) => string][] = [
    ["Price per sq ft", (d) => formatPsf(d.summary.psf, currency)],
    ["Median sale price", (d) => formatShortPrice(d.summary.price, currency)],
    ["Gross yield (est.)", (d) => pct(d.summary.yield)],
    ["Median annual rent", (d) => formatShortPrice(d.summary.rent, currency)],
    ["Change on a year earlier", (d) => pct(d.summary.change, 1, true)],
    ["Sales, 12 months", (d) => count(d.summary.sales)],
    ["Data confidence", (d) => dataConfidence(d.summary.sales, t).label],
    ["Nearest metro", (d) => { const f = d.facilities.find((x) => x.id === "metro"); return f ? km(f.distanceM, t("km")) : "–"; }],
    ["Nearest hospital", (d) => { const f = d.facilities.find((x) => x.id === "hospital"); return f ? km(f.distanceM, t("km")) : "–"; }],
    ["Nearest school", (d) => { const f = d.facilities.find((x) => x.id === "school"); return f ? `${f.approx ? "≈ " : ""}${km(f.distanceM, t("km"))}` : "–"; }],
  ];
  const diffs = compareDifferences(slugs.filter((s) => cards[s]).map((s) => ({ name: names[s] ?? s, psf: cards[s].summary.psf, yield: cards[s].summary.yield, sales: cards[s].summary.sales, change: cards[s].summary.change })), t);
  const period = Object.values(cards)[0]?.periodEnd ?? null;
  return (
    <>
      <div className="dpi-glass fixed inset-x-3 top-16 z-[45] flex items-center gap-2 rounded-2xl px-3 py-2 text-sm md:inset-x-auto md:bottom-4 md:left-1/2 md:top-auto md:-translate-x-1/2" role="region" aria-label={t("Buildings to compare")}>
        <span className="hidden text-xs text-[var(--muted)] sm:inline">{t("Compare")}</span>
        <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {slugs.map((s) => (
            <li key={s} className="flex shrink-0 items-center rounded-full bg-white/10 ps-3 pe-1">
              <button type="button" onClick={() => onShow(s)} className="max-w-[9rem] truncate py-1 text-[13px] hover:text-cyan-200">{names[s] ?? s}</button>
              <button type="button" onClick={() => onRemove(s)} aria-label={t("Remove {name} from compare", { name: names[s] ?? s })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/20">✕</button>
            </li>
          ))}
        </ul>
        <button type="button" disabled={slugs.length < 2} onClick={() => setOpen(true)} className="shrink-0 rounded-full bg-cyan-300 px-3 py-1.5 text-[13px] font-semibold text-slate-900 disabled:opacity-40">
          {slugs.length < 2 ? t("Add one more") : t("Compare {n}", { n: slugs.length })}
        </button>
        <button type="button" onClick={onClear} className="shrink-0 rounded-full px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--fg)]">{t("Clear")}</button>
      </div>
      {open && (
        <>
          <div className="dpi-backdrop fixed inset-0 z-[46]" onClick={() => setOpen(false)} aria-hidden />
          <section role="dialog" aria-modal="true" aria-label={t("Compare buildings")} className="dpi-glass fixed left-1/2 top-1/2 z-[47] max-h-[calc(100dvh-5rem)] w-[min(820px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{t("Compare {n} buildings", { n: slugs.length })}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={t("Close comparison")} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button>
            </div>
            {failed && <p className="mt-2 text-sm text-[var(--warn)]">{t("Some figures could not be loaded.")}</p>}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 text-start">
                    <th className="py-2 pe-3 text-start text-xs font-medium text-[var(--muted)]"> </th>
                    {slugs.map((s) => <th key={s} className="py-2 pe-3 text-start font-semibold"><Link className="link" href={`/building/${encodeURIComponent(s)}`}>{names[s] ?? s}</Link></th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, f]) => (
                    <tr key={label} className="border-b border-white/10">
                      <th scope="row" className="py-2 pe-3 text-start text-xs font-medium text-[var(--muted)]">{t(label)}</th>
                      {slugs.map((s) => <td key={s} className="py-2 pe-3">{cards[s] ? f(cards[s]) : "…"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {diffs.length > 0 && (
              <div className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("What differs")}</h3>
                <ul className="mt-1 list-disc space-y-1 ps-5">{diffs.map((d) => <li key={d}>{d}</li>)}</ul>
                <p className="mt-2 text-xs text-[var(--muted)]">{t("These are gaps in the figures, not a ranking. Data confidence measures how many sales the figures rest on, not the quality of the building.")}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-[var(--muted)]">
              {t("Source: Dubai Land Department sales and rents")}{period ? `, ${t("data to {date}", { date: day(period) })}` : ""}; {t("places from OpenStreetMap, KHDA, DHA.")} {t("Distances are straight-line.")} {t(DISCLAIMER)}
            </p>
            <Link className="link mt-2 inline-block text-sm" href={`/compare?ids=${slugs.map(encodeURIComponent).join(",")}`}>{t("Open the full comparison page")}</Link>
          </section>
        </>
      )}
    </>
  );
}
