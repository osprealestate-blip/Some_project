"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Currency } from "@/config/currency";
import type { CommunityCardData } from "@/lib/communityCard";
import { count, formatMoneyShort, formatPsf, pct } from "@/lib/format";
import { SOURCES } from "@/lib/sources";
import { useLang, useT } from "./LangProvider";
import SourceNote from "./SourceNote";

const cache = new Map<string, Promise<CommunityCardData>>();
function fetchCommunity(slug: string): Promise<CommunityCardData> {
  let p = cache.get(slug);
  if (!p) {
    p = fetch(`/api/community-card/${encodeURIComponent(slug)}`).then((r) => (r.ok ? (r.json() as Promise<CommunityCardData>) : Promise.reject(new Error("community"))));
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}

const TONE = { Available: "var(--good)", Partial: "var(--warn)", "Not available": "var(--muted)" } as const;

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-[var(--grid)] px-2.5 py-2">
      <div className="text-[11px] leading-tight text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 truncate text-[15px] font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-[10.5px] leading-tight text-[var(--muted)]">{note}</div>}
    </div>
  );
}

type Props = {
  slug: string;
  /** The name the map already has, shown while the figures load. */
  name: string;
  currency: Currency;
  onClose: () => void;
  /** Open one of its buildings (switches the map back to Buildings). */
  onPickBuilding: (slug: string) => void;
  /** Show all of its buildings on the map (Buildings view, filtered to this community). */
  onShowBuildings: () => void;
  onSheetHeight?: (px: number) => void;
};

/** What the map says about one community: the same figures and rules as its page, short. Every figure has its source and date;
 *  where there is too little the card says so instead of showing a guess. */
export default function CommunityCard({ slug, name, currency, onClose, onPickBuilding, onShowBuildings, onSheetHeight }: Props) {
  const t = useT();
  const lang = useLang();
  const [data, setData] = useState<CommunityCardData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [box, setBox] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let live = true;
    setData(null);
    setState("loading");
    fetchCommunity(slug).then((d) => { if (live) { setData(d); setState("ok"); } }).catch(() => { if (live) setState("error"); });
    return () => { live = false; };
  }, [slug]);

  // Phones: tell the map how much of the screen the sheet covers, so the community is framed above it.
  useEffect(() => {
    if (!box || !onSheetHeight) return;
    const report = () => onSheetHeight(window.matchMedia("(min-width: 768px)").matches ? 0 : box.getBoundingClientRect().height);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(box);
    return () => { ro.disconnect(); onSheetHeight(0); };
  }, [box, onSheetHeight]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const title = data ? (lang === "ar" && data.nameAr ? data.nameAr : data.name) : name;
  const d = data;
  const showFigures = !!d && d.figures && d.state === "ok";
  const noteFor = (d2: CommunityCardData) =>
    !d2.figures ? t("Price, rent and yield figures for communities are not computed on this database yet. The buildings below and their own figures are unaffected.")
    : d2.buildings === 0 ? t("No building pages exist for this community yet.")
    : d2.state === "none" ? t("No apartment sales were counted here in the last 12 months, so there is no price figure. That is a gap in the data, not a price of zero.")
    : d2.state === "thin" ? t("Fewer than 3 sales were counted in the last 12 months, so medians are not shown. Treat anything here as a single example, not a typical price.")
    : null;

  return (
    <section
      ref={setBox}
      role="dialog"
      aria-label={t("Community figures")}
      className="dpi-glass dpi-enter fixed inset-x-0 bottom-0 z-40 flex max-h-[46dvh] flex-col rounded-t-2xl md:inset-x-auto md:bottom-9 md:start-20 md:max-h-[calc(100dvh-9rem)] md:w-[23rem] md:rounded-2xl"
    >
      <div className="flex items-start gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          {d && (
            <p className="text-xs text-[var(--muted)]">
              {t("{n} buildings", { n: count(d.buildings) })}
              {d.developments > 0 && <> · {t("{n} developments", { n: count(d.developments) })}</>}
              {d.placed > 0 && <> · {t("{n} on the map", { n: count(d.placed) })}</>}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label={t("Close")} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5">✕</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-2">
        {state === "loading" && <p role="status" className="text-sm text-[var(--muted)]">{t("Loading…")}</p>}
        {state === "error" && <p role="alert" className="text-sm text-[var(--muted)]">{t("Could not load the figures for this community.")}</p>}
        {d && (
          <>
            {noteFor(d) && <p role="note" className="rounded-lg border border-dashed border-[var(--border)] p-2.5 text-xs text-[var(--muted)]">{noteFor(d)}</p>}
            {showFigures && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Tile label={t("Median price per sq ft")} value={formatPsf(d.psf, currency)} note={t("{n} apartment sales in 12 months", { n: count(d.sales12m) })} />
                  <Tile
                    label={t("Change on a year earlier")}
                    value={d.change ? pct(d.change.value, 1, true) : "–"}
                    note={d.change ? (d.change.basis === "same-tower" ? t("Same towers ({n}), per sq ft", { n: count(d.change.towers ?? 0) }) : t("Median per sq ft")) : t("Not enough sales a year earlier")}
                  />
                  <Tile label={t("Median annual rent")} value={formatMoneyShort(d.rent, currency)} note={d.rent != null ? t("{n} contracts, all bedroom types", { n: count(d.rents12m) }) : t("Too few rent contracts to show a rent")} />
                  <Tile label={t("Gross yield (estimate)")} value={pct(d.yield)} note={d.yield != null ? t("Median across bedroom types") : t("Shown only where a rent is shown")} />
                </div>
                {(d.ready || d.offplan) && (
                  <dl className="mt-2 grid gap-1 text-xs">
                    {d.ready && <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t("Ready, median per sq ft")}</dt><dd className="font-medium tabular-nums">{formatPsf(d.ready.psf, currency)} · {t("{n} sales", { n: count(d.ready.sales) })}</dd></div>}
                    {d.offplan && <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t("Off-plan, median per sq ft")}</dt><dd className="font-medium tabular-nums">{formatPsf(d.offplan.psf, currency)} · {t("{n} sales", { n: count(d.offplan.sales) })}</dd></div>}
                  </dl>
                )}
              </>
            )}

            {d.top.length > 0 && (
              <div className="mt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("Busiest buildings")}</h3>
                <ul className="mt-1 divide-y divide-[var(--border)]">
                  {d.top.map((b) => (
                    <li key={b.slug}>
                      <button type="button" onClick={() => onPickBuilding(b.slug)} className="flex min-h-9 w-full items-baseline justify-between gap-2 py-1.5 text-start text-[13px] hover:text-[var(--accent)]">
                        <span className="min-w-0 truncate font-medium">{b.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-[var(--muted)]">{b.psf != null ? `${formatPsf(b.psf, currency)} · ` : ""}{t("{n} sales", { n: count(b.sales) })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(showFigures || d.sales12m > 0) && (
              <SourceNote t={t} source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={d.periodEnd} estimate>
                {t("Apartments only; 12 months to the newest sale. Rents are contracts tied to its buildings or their projects, so they are a sample, not every rent.")}
              </SourceNote>
            )}

            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium">{t("What we know about this community")}</summary>
              <ul className="mt-1.5 space-y-1.5">
                {d.evidence.map((r) => (
                  <li key={r.id} className="grid grid-cols-[auto_1fr] items-baseline gap-x-2">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: TONE[r.level] }} />
                    <span><strong className="font-medium">{t(r.label)}:</strong> {t(r.level)}<span className="block text-[var(--muted)]">{t(r.detail, r.vars)}</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[var(--muted)]">{t("Not available means we hold nothing reliable, not that the answer is zero.")}</p>
            </details>
          </>
        )}
      </div>

      <div className="flex gap-2 border-t border-[var(--border)] px-4 py-2.5">
        {d && d.placed > 0 && <button type="button" onClick={onShowBuildings} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-sm font-medium text-white">{t("Show its buildings")}</button>}
        <Link href={`/community/${slug}`} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--grid)]">{t("Open community page")}</Link>
      </div>
    </section>
  );
}
