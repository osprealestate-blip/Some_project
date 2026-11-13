"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Currency } from "@/config/currency";
import type { CardData } from "@/lib/cardData";
import { fetchCard, fetchSeries, type SeriesData } from "@/lib/cardClient";
import type { FacilityId, NearestFacility } from "@/lib/facilities";
import type { RouteMap } from "@/lib/routeLines";
import { ROUTE_MODES, type RouteMode } from "@/lib/routing";
import { count, day, formatMoney, formatPsf, formatShortPrice, pct, roomsLabel, sqft } from "@/lib/format";
import type { MapBuildingProps } from "@/lib/mapMetrics";
import { DISCLAIMER, SOURCES } from "@/lib/sources";
import CompareBars from "./CompareBars";
import DataBadge from "./DataBadge";
import Histogram from "./Histogram";
import LineChart from "./LineChart";
import { useLang, useT } from "./LangProvider";
import FacilityChips from "./FacilityChips";
import NearbyPanel from "./NearbyPanel";
import SaveMenu from "./SaveMenu";
import SourceNote from "./SourceNote";

type Feature = MapBuildingProps & { lng: number; lat: number };
type Props = {
  slug: string;
  view: "card" | "panel";
  currency: Currency;
  /** All buildings on the map: used for the instant first paint and the "Similar" tab. */
  features: Feature[];
  onClose: () => void;
  onView: (v: "card" | "panel") => void;
  onSelect: (slug: string) => void;
  /** Location mode: straight lines from the building to the nearest places, drawn on the map behind the card. */
  nearby: boolean;
  hiddenKinds: FacilityId[];
  onNearby: (on: boolean) => void;
  onToggleKind: (id: FacilityId) => void;
  onFacilities: (list: NearestFacility[]) => void;
  routeMode: "line" | RouteMode;
  routes: RouteMap;
  onRouteMode: (m: "line" | RouteMode) => void;
  compared: string[];
  onCompare: (slug: string) => void;
};

type Tab = "overview" | "prices" | "rent" | "nearby" | "sales" | "similar";
const TABS: [Tab, string][] = [["overview", "Overview"], ["prices", "Prices"], ["rent", "Rent"], ["nearby", "Nearby"], ["sales", "Sales"], ["similar", "Similar"]];
type Sheet = "compact" | "expanded" | "full";

function useDesktop() {
  const [d, setD] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const f = () => setD(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return d;
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  const t = useT();
  return (
    <div className="min-w-0 rounded-lg bg-white/[0.06] px-2.5 py-2 ring-1 ring-white/10">
      <div className="truncate text-[11px] text-[var(--muted)]">{t(label)}</div>
      <div className="mt-0.5 truncate text-[15px] font-semibold tabular-nums">{value}</div>
      {note && <div className="truncate text-[10.5px] text-[var(--muted)]">{t(note)}</div>}
    </div>
  );
}

export default function BuildingCard({ slug, view, currency, features, onClose, onView, onSelect, nearby, hiddenKinds, onNearby, onToggleKind, onFacilities, routeMode, routes, onRouteMode, compared, onCompare }: Props) {
  const desktop = useDesktop();
  const t = useT();
  const lang = useLang();
  const feature = useMemo(() => features.find((f) => f.slug === slug) ?? null, [features, slug]);
  const [data, setData] = useState<CardData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [full, setFull] = useState(false); // phone only: the sheet at full height
  const [drag, setDrag] = useState<number | null>(null);
  const [shared, setShared] = useState("");
  const [series, setSeries] = useState<SeriesData | null>(null);
  const [seriesFailed, setSeriesFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    let live = true;
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    setTab(TABS.some(([id]) => id === tabParam) ? (tabParam as Tab) : "overview");
    setData(null);
    setState("loading");
    fetchCard(slug, lang).then((d) => { if (live) { setData(d); setState("ok"); onFacilities(d.facilities); } }).catch(() => { if (live) setState("error"); });
    return () => { live = false; };
    // onFacilities is stable (state setter wrapper).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lang]);

  useEffect(() => { setSeries(null); setSeriesFailed(false); }, [slug]);
  useEffect(() => {
    if ((tab !== "prices" && tab !== "rent") || series || seriesFailed) return;
    let live = true;
    fetchSeries(slug).then((d) => { if (live) setSeries(d); }).catch(() => { if (live) setSeriesFailed(true); });
    return () => { live = false; };
  }, [tab, slug, series, seriesFailed]);
  useEffect(() => { if (view === "card") setFull(false); }, [view]);
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [tab, slug]);

  // Esc: panel back to card, card closed. Focus goes to the close button when the card opens.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (view === "panel") onView("card"); else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, onView, onClose]);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, [slug, view]);

  const sheet: Sheet = view === "card" ? "compact" : full ? "full" : "expanded";
  const showPanel = view === "panel";

  // The tab is kept in the URL, so a shared link opens the same view: building, panel, tab, colour layer and compare list.
  const chooseTab = (id: Tab) => {
    setTab(id);
    const sp = new URLSearchParams(window.location.search);
    if (id === "overview") sp.delete("tab"); else sp.set("tab", id);
    window.history.replaceState(null, "", `/map?${sp.toString()}`);
  };
  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share && !desktop) await navigator.share({ title: data?.name ?? feature?.name ?? t("Building"), url });
      else { await navigator.clipboard.writeText(url); setShared(t("Link copied")); }
    } catch { setShared(url); }
    setTimeout(() => setShared(""), 3000);
  }, [slug, data, feature, desktop]);

  // Phone sheet: drag the handle up or down between compact, expanded and full; down from compact closes.
  const onDown = (e: React.PointerEvent) => { startY.current = e.clientY; setDrag(0); (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (drag !== null) setDrag(e.clientY - startY.current); };
  const onUp = () => {
    const dy = drag ?? 0;
    setDrag(null);
    if (Math.abs(dy) < 8) { // a tap steps up: compact, expanded, full
      if (sheet === "compact") onView("panel"); else if (sheet === "expanded") setFull(true); else setFull(false);
    } else if (dy < -40) { if (sheet === "compact") onView("panel"); else setFull(true); }
    else if (dy > 40) { if (sheet === "full") setFull(false); else if (sheet === "expanded") onView("card"); else onClose(); }
  };

  const name = data?.name ?? feature?.name ?? t("Building");
  const community = data?.community ?? feature?.community ?? "";
  const sum = data?.summary;
  const psf = sum ? sum.psf : feature?.psf ?? null;
  const yld = sum ? sum.yield : feature?.yield ?? null;
  const sales = sum ? sum.sales : feature?.sales ?? 0;
  const periodEnd = data?.periodEnd ?? null;

  // Geometry. Desktop: the card sits bottom-left and grows into a centred panel. Phone: a sheet from the bottom.
  const style: React.CSSProperties = desktop
    ? showPanel
      ? { insetInlineStart: "max(16px, calc(50vw - 460px))", bottom: "calc((100dvh - min(700px, 100dvh - 7rem)) / 2)", width: "min(920px, calc(100vw - 32px))", height: "min(700px, calc(100dvh - 7rem))", borderRadius: 20 }
      : { insetInlineStart: 16, bottom: 16, width: 392, height: "min(500px, calc(100dvh - 6rem))", borderRadius: 20 }
    : {
        insetInlineStart: 0, bottom: 0, width: "100%", borderRadius: "20px 20px 0 0",
        height: `calc(${sheet === "full" ? "100dvh" : sheet === "expanded" ? "74dvh" : "min(60dvh, 470px)"} - ${drag ?? 0}px)`,
      };

  const sim = useMemo(() => {
    if (!feature) return [];
    return features
      .filter((f) => f.slug !== slug && f.community === feature.community && f.sales >= 5 && f.psf != null)
      .sort((a, b) => Math.abs(a.psf! - (feature.psf ?? a.psf!)) - Math.abs(b.psf! - (feature.psf ?? b.psf!)))
      .slice(0, 6);
  }, [features, feature, slug]);

  const cardBody = (
    <div className="flex h-full flex-col gap-2.5 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="building-card-title" className="line-clamp-2 text-[17px] font-semibold leading-tight">{name}</h2>
          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
            {community}{data?.floors ? ` · ${t("{n} floors", { n: data.floors })}` : ""}{data?.approx ? ` · ${t("position approximate")}` : ""}
          </p>
        </div>
        <button ref={showPanel ? undefined : closeRef} type="button" onClick={onClose} aria-label={t("Close building card")} title={t("Close (Esc)")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-base hover:bg-white/20">✕</button>
      </div>
      <div className="rounded-lg border-s-2 border-cyan-300/80 bg-cyan-300/[0.08] px-3 py-2 text-[13px] leading-snug">
        {state === "ok" && data?.verdict ? data.verdict.text : state === "error" ? t("Could not load the summary. Try again, or open the full page.") : <span className="text-[var(--muted)]">{t("Reading the numbers…")}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Price / sq ft" value={formatMoney(psf, currency)} />
        <Tile label="Gross yield (est.)" value={pct(yld)} />
        <Tile label="Sales, 12 mo" value={count(sales)} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{routeMode === "line" ? t("Nearest, straight-line") : t("Nearest · km straight-line, time by route")}</span>
          {data && data.facilities.length > 0 && (
            <button type="button" onClick={() => onNearby(!nearby)} aria-pressed={nearby}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${nearby ? "bg-white/15 text-[var(--fg)] hover:bg-white/25" : "bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/50 hover:bg-cyan-300/25"}`}>
              {nearby ? t("Reset") : t("Show on map")}
            </button>
          )}
        </div>
        {nearby && data?.routing && (
          <div role="group" aria-label={t("Show distances as")} className="mb-1.5 flex gap-1 rounded-full bg-white/[0.07] p-0.5 text-[11px]">
            {([["line", t("Straight line")], ...ROUTE_MODES.map((m) => [m.id, t(m.label)])] as ["line" | RouteMode, string][]).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={routeMode === id} onClick={() => onRouteMode(id)}
                className={`flex-1 rounded-full px-2 py-1 font-semibold ${routeMode === id ? "bg-cyan-300 text-slate-900" : "text-[var(--muted)] hover:text-[var(--fg)]"}`}>{label}</button>
            ))}
          </div>
        )}
        {data ? <FacilityChips facilities={data.facilities} onToggle={nearby ? onToggleKind : undefined} hidden={hiddenKinds} routes={routes} mode={routeMode} /> : <div className="h-[108px] animate-pulse rounded-lg bg-white/[0.06]" />}
      </div>
      <p className="mt-auto text-[10.5px] leading-snug text-[var(--muted)]">
        {t("Source: DLD sales and rents")}{periodEnd ? `, ${t("data to {date}", { date: day(periodEnd) })}` : ""}; {t("places from OpenStreetMap, KHDA, DHA.")}{routeMode !== "line" && ` ${t("Walk and drive times are estimates from OpenStreetMap routing, without traffic or waiting.")}`} {t(DISCLAIMER)}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => onView("panel")} className="min-w-0 flex-1 rounded-xl bg-cyan-300 px-3 py-2.5 text-sm font-semibold text-slate-900 hover:bg-cyan-200">
          {t("Explore building")}
        </button>
        <SaveMenu slug={slug} name={name} />
        <button type="button" onClick={() => onCompare(slug)} aria-pressed={compared.includes(slug)} className="shrink-0 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/20">
          {compared.includes(slug) ? t("✓ Comparing") : t("+ Compare")}
        </button>
      </div>
    </div>
  );

  const panelBody = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-2 border-b border-white/10 px-4 pb-2 pt-3 md:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="building-panel-title" className="line-clamp-2 text-lg font-semibold leading-tight md:text-xl">{name}</h2>
          <p className="truncate text-xs text-[var(--muted)]">
            {community}{data?.project && data.project.toLowerCase() !== name.toLowerCase() ? ` · ${t("Project: {name}", { name: data.project })}` : ""}
            {data?.floors ? ` · ${t("{n} floors", { n: data.floors })}` : ""}{data?.units ? ` · ${t("{n} units", { n: count(data.units) })}` : ""}
          </p>
        </div>
        <SaveMenu slug={slug} name={name} down />
        <button type="button" onClick={share} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">{shared || t("Share")}</button>
        <Link href={`/building/${encodeURIComponent(slug)}`} className="hidden shrink-0 rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-cyan-200 sm:inline-block">{t("Open full page")}</Link>
        {desktop && <button type="button" onClick={() => onView("card")} title={t("Back to the small card (Esc)")} className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20">{t("Shrink")}</button>}
        <button ref={showPanel ? closeRef : undefined} type="button" onClick={onClose} aria-label={t("Close building details")} title={t("Close")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">✕</button>
      </div>
      <div role="tablist" aria-label={t("Building sections")} className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-1.5 md:px-4"
        onKeyDown={(e) => {
          const i = TABS.findIndex(([id]) => id === tab);
          const rtl = document.documentElement.dir === "rtl";
          const nextKey = rtl ? "ArrowLeft" : "ArrowRight", prevKey = rtl ? "ArrowRight" : "ArrowLeft";
          const n = e.key === nextKey ? (i + 1) % TABS.length : e.key === prevKey ? (i + TABS.length - 1) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
          if (n < 0) return;
          e.preventDefault();
          chooseTab(TABS[n][0]);
          (e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[n])?.focus();
        }}>
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" id={`tab-${id}`} aria-controls="building-tabpanel" tabIndex={tab === id ? 0 : -1} aria-selected={tab === id} type="button" onClick={() => chooseTab(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] ${tab === id ? "bg-cyan-300 font-semibold text-slate-900" : "text-[var(--fg)] hover:bg-white/10"}`}>
            {t(label)}
          </button>
        ))}
      </div>
      <div ref={bodyRef} id="building-tabpanel" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`} key={tab} className="dpi-tab-in min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 text-sm md:p-5">
        {state === "loading" && <div className="space-y-3"><div className="h-16 animate-pulse rounded-lg bg-white/[0.06]" /><div className="h-40 animate-pulse rounded-lg bg-white/[0.06]" /></div>}
        {state === "error" && (
          <p>{t("Could not load this building.")} <Link className="link" href={`/building/${encodeURIComponent(slug)}`}>{t("Open the full page")}</Link></p>
        )}
        {data && tab === "overview" && (
          <div className="space-y-4">
            {data.verdict && <div className="rounded-lg border-s-2 border-cyan-300/80 bg-cyan-300/[0.08] px-3 py-2 text-[15px] leading-snug">{data.verdict.text}</div>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Tile label="Median price per sq ft" value={formatPsf(data.summary.psf, currency)} />
              <Tile label="Median sale price" value={formatShortPrice(data.summary.price, currency)} />
              <Tile label="Gross yield (estimate)" value={pct(data.summary.yield)} note="Median across bedroom types" />
              <Tile label={data.summary.rentLevel === "project" ? "Annual rent (whole project)" : "Median annual rent"} value={formatShortPrice(data.summary.rent, currency)} note={t("{n} contracts", { n: count(data.summary.rentCount) })} />
              <Tile label="Change on a year earlier" value={pct(data.summary.change, 1, true)} note="Median per sq ft" />
              <Tile label="Sales, 12 months" value={count(data.summary.sales)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <CompareBars t={t} label="Price per sq ft" building={data.summary.psf} community={data.benchmark.psf} communityName={data.community} format={(n) => formatMoney(n, currency)} />
              <CompareBars t={t} label="Gross yield (est.)" building={data.summary.yield} community={data.benchmark.yield} communityName={data.community} format={(n) => pct(n)} />
            </div>
            <DataBadge saleCount={data.summary.sales} periodEnd={data.periodEnd} t={t} />
            <div>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">{t("Nearest places, straight-line")}</h3>
              <FacilityChips facilities={data.facilities} showNames />
              <p className="mt-1.5 text-xs text-[var(--muted)]">{t("Straight-line distances, not routes. ≈ marks a school whose official position is rounded to about 1 km. Lines on the map: close this panel and press “Show on map”.")}</p>
            </div>
            <SourceNote t={t} source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={data.periodEnd} estimate>{t("Apartments only; 12 months to the newest sale.")}</SourceNote>
          </div>
        )}
        {data && tab === "prices" && (
          <div>
            <h3 className="mb-2 font-semibold">{t("Sale prices by bedroom type")}</h3>
            <div className="overflow-x-auto"><table className="w-full whitespace-nowrap tabular-nums [&_td]:py-1.5 [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]"><tr className="border-b border-white/10"><th className="py-1 text-start font-medium">{t("Type")}</th><th className="text-end font-medium">{t("Sales")}</th><th className="text-end font-medium">{t("Median price")}</th><th className="text-end font-medium">{t("Per sq ft")}</th></tr></thead>
              <tbody>{data.rows.filter((r) => r.sale_count_12m > 0).map((r) => (
                <tr key={r.rooms} className="border-b border-white/10"><td>{t(roomsLabel(r.rooms))}</td><td className="text-end">{count(r.sale_count_12m)}</td><td className="text-end">{r.sale_count_12m >= 3 ? formatShortPrice(r.sale_median_price_12m, currency) : "–"}</td><td className="text-end">{r.sale_count_12m >= 3 ? formatPsf(r.sale_median_psf_12m, currency) : "–"}</td></tr>
              ))}</tbody>
            </table></div>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              {series ? <LineChart title={t("Median sale price per sq ft, by quarter")} points={series.sales} unit="psf" countLabel={t("sales")} currency={currency} />
                : seriesFailed ? <p className="text-[var(--muted)]">{t("The chart could not be loaded.")}</p> : <div className="h-40 animate-pulse rounded bg-white/[0.06]" role="status" aria-label={t("Loading chart")} />}
            </div>
            {(() => {
              const mix = data.rows.filter((r) => r.rooms >= 0 && r.sale_count_12m > 0);
              const total = mix.reduce((n, r) => n + r.sale_count_12m, 0);
              return total > 0 ? (
                <div className="mt-4">
                  <div className="mb-1 text-sm font-semibold">{t("Sales by bedroom type, 12 months")}</div>
                  <ul className="space-y-1">{mix.map((r) => (
                    <li key={r.rooms} className="flex items-center gap-2 text-xs">
                      <span className="w-14 shrink-0 text-[var(--muted)]">{t(roomsLabel(r.rooms))}</span>
                      <span className="h-2.5 flex-1 rounded-full bg-[var(--grid)]"><span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(r.sale_count_12m / total) * 100}%` }} /></span>
                      <span className="w-20 shrink-0 text-end tabular-nums">{r.sale_count_12m} · {Math.round((r.sale_count_12m / total) * 100)}%</span>
                    </li>))}</ul>
                </div>
              ) : null;
            })()}
            {series?.histogram && <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3"><Histogram bins={series.histogram} currency={currency} title={t("Price per sq ft of {n} sales, 12 months", { n: series.histogramCount })} /></div>}
            <p className="mt-1 text-xs text-[var(--muted)]">{t("Rows with fewer than 3 deals show no median; quarters with fewer than 3 sales are left blank in the chart.")}</p>
            <SourceNote t={t} source={SOURCES.dldSales} date={data.periodEnd} />
          </div>
        )}
        {data && tab === "rent" && (
          <div>
            <h3 className="mb-2 font-semibold">{t("Rent and gross yield by bedroom type")}</h3>
            <div className="overflow-x-auto"><table className="w-full whitespace-nowrap tabular-nums [&_td]:py-1.5 [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]"><tr className="border-b border-white/10"><th className="py-1 text-start font-medium">{t("Type")}</th><th className="text-end font-medium">{t("Contracts")}</th><th className="text-end font-medium">{t("Median rent / year")}</th><th className="text-end font-medium">{t("Gross yield*")}</th></tr></thead>
              <tbody>{data.rows.filter((r) => r.rooms >= 0 && r.rent_count_12m > 0).map((r) => (
                <tr key={r.rooms} className="border-b border-white/10"><td>{t(roomsLabel(r.rooms))}</td><td className="text-end">{count(r.rent_count_12m)}</td><td className="text-end">{r.rent_count_12m >= 3 ? formatShortPrice(r.rent_median_12m, currency) : "–"}</td><td className="text-end">{pct(r.gross_yield)}</td></tr>
              ))}</tbody>
            </table></div>
            {!data.rows.some((r) => r.rooms >= 0 && r.rent_count_12m > 0) && <p className="text-[var(--muted)]">{t("No rent contracts counted for this building yet.")}</p>}
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              {series ? <LineChart title={`${t("Median annual rent, by quarter")}${series.rentLevel === "project" ? ` ${t("(whole project)")}` : series.rentLevel === "estimated" ? ` ${t("(estimated)")}` : ""}`} points={series.rents} unit="aed" countLabel={t("contracts")} currency={currency} />
                : seriesFailed ? <p className="text-[var(--muted)]">{t("The chart could not be loaded.")}</p> : <div className="h-40 animate-pulse rounded bg-white/[0.06]" role="status" aria-label={t("Loading chart")} />}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{t("* Estimate: yearly rent as a share of price, before service charges.")}{data.summary.rentLevel === "project" ? ` ${t("Rents are for the whole project: DLD rent contracts name the project, not the tower.")}` : ""}</p>
            <SourceNote t={t} source={SOURCES.dldRents} date={data.periodEnd} estimate />
          </div>
        )}
        {data && tab === "nearby" && (
          <div className="space-y-4">
            <FacilityChips facilities={data.facilities} showNames />
            <NearbyPanel places={data.places} placed={data.lng != null} />
          </div>
        )}
        {data && tab === "sales" && (
          <div>
            <h3 className="mb-2 font-semibold">{t("Latest sales")}</h3>
            {data.sales.length ? (
              <div className="overflow-x-auto"><table className="w-full whitespace-nowrap tabular-nums [&_td]:py-1.5 [&_td]:pe-3 [&_th]:pe-3">
                <thead className="text-xs text-[var(--muted)]"><tr className="border-b border-white/10"><th className="py-1 text-start font-medium">{t("Date")}</th><th className="text-start font-medium">{t("Type")}</th><th className="text-end font-medium">{t("Size")}</th><th className="text-end font-medium">{t("Price")}</th><th className="text-end font-medium">{t("Status")}</th></tr></thead>
                <tbody>{data.sales.map((s, i) => (
                  <tr key={i} className="border-b border-white/10"><td>{day(s.txn_date)}</td><td>{s.rooms == null ? "–" : t(roomsLabel(s.rooms))}</td><td className="text-end">{sqft(s.size_sqft)}</td><td className="text-end">{formatMoney(s.price, currency)}</td><td className="text-end">{s.off_plan == null ? "–" : s.off_plan ? t("Off-plan") : t("Ready")}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="text-[var(--muted)]">{t("No counted sales.")}</p>}
            <SourceNote t={t} source={SOURCES.dldSales} date={data.periodEnd}>{t("Market fields only; unit numbers and parties are never shown.")}</SourceNote>
          </div>
        )}
        {data && tab === "similar" && (
          <div className="space-y-4">
            {data.siblings.length > 0 && (
              <div>
                <h3 className="mb-1.5 font-semibold">{t("Other buildings in {name}", { name: data.project ?? "" })}</h3>
                <ul className="flex flex-wrap gap-2">{data.siblings.map((s) => (
                  <li key={s.slug}><button type="button" onClick={() => onSelect(s.slug)} className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] hover:bg-white/20">{s.name_en}</button></li>
                ))}</ul>
              </div>
            )}
            <div>
              <h3 className="mb-1.5 font-semibold">{t("Similar price in {name}", { name: data.community })}</h3>
              {sim.length ? (
                <ul className="divide-y divide-white/10">{sim.map((f) => (
                  <li key={f.slug}>
                    <button type="button" onClick={() => onSelect(f.slug)} className="flex w-full items-baseline justify-between gap-3 py-2 text-start hover:text-cyan-200">
                      <span className="min-w-0 truncate">{f.name}</span>
                      <span className="shrink-0 tabular-nums text-[var(--muted)]">{formatPsf(f.psf, currency)} · {t("{pct} yield", { pct: pct(f.yield) })}</span>
                    </button>
                  </li>
                ))}</ul>
              ) : <p className="text-[var(--muted)]">{t("No buildings with enough sales to compare.")}</p>}
              <p className="mt-1 text-xs text-[var(--muted)]">{t("Buildings in the same community with the closest median price per sq ft and at least 5 sales. Tap one to see it on the map.")}</p>
            </div>
            <Link className="link inline-block" href={`/compare?ids=${encodeURIComponent(slug)}`}>{t("Compare with other buildings")}</Link>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2 text-xs md:hidden">
        <Link href={`/building/${encodeURIComponent(slug)}`} className="rounded-full bg-cyan-300 px-3 py-1.5 font-semibold text-slate-900">{t("Open full page")}</Link>
        <span className="text-[var(--muted)]">{t("Charts, history, costs")}</span>
      </div>
    </div>
  );

  return (
    <>
      {showPanel && desktop && <div className="dpi-backdrop fixed inset-0 z-30" onClick={() => onView("card")} aria-hidden />}
      <div
        role="dialog"
        aria-modal={showPanel && desktop}
        aria-labelledby={showPanel ? "building-panel-title" : "building-card-title"}
        className={`dpi-glass dpi-enter fixed z-40 overflow-hidden ${drag !== null ? "is-dragging" : ""}`}
        style={style}
        onKeyDown={(e) => {
          // The desktop panel is modal: keep Tab inside it.
          if (e.key !== "Tab" || !showPanel || !desktop) return;
          const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, [tabindex="0"]')].filter((el) => !el.closest("[inert]") && el.tabIndex >= 0);
          if (!items.length) return;
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }}
      >
        <div className="sr-only" role="status" aria-live="polite">{t("{name} selected", { name })}{showPanel ? `, ${t("details open")}` : ""}</div>
        {!desktop && (
          <div role="button" tabIndex={0} aria-label={t("Resize building sheet")} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (sheet === "compact") onView("panel"); else if (sheet === "expanded") setFull(true); else setFull(false); } }}
            className="absolute inset-x-0 top-0 z-10 flex h-6 touch-none cursor-grab items-center justify-center">
            <span className="h-1.5 w-11 rounded-full bg-white/40" />
          </div>
        )}
        <div className={`dpi-fade absolute inset-0 overflow-y-auto ${!desktop ? "pt-3" : ""} ${showPanel ? "pointer-events-none opacity-0" : "opacity-100"}`} aria-hidden={showPanel} inert={showPanel}>{cardBody}</div>
        <div className={`dpi-fade absolute inset-0 ${!desktop ? "pt-4" : ""} ${showPanel ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!showPanel} inert={!showPanel}>{showPanel && panelBody}</div>
      </div>
    </>
  );
}
