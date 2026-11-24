"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_CURRENCY, type Currency } from "@/config/currency";
import { formatMoneyShort, formatPsf, pct, count } from "@/lib/format";
import {
  filterBuildings, groupBuildings, isOffPlan, sortBuildings, sortGroups, type MasterBuilding, type Readiness, type SortKey,
} from "@/lib/masterCommunities";
import { useT } from "./LangProvider";

const PAGE = 30;

/** The buildings of one community: search, ready or off-plan, sort, and optionally one row per development. Figures are the
 *  same 12-month medians as the building pages; a tower with fewer than 3 sales shows a dash, never a guess. */
export default function MasterBuildingList({ rows, currency = DEFAULT_CURRENCY }: { rows: MasterBuilding[]; currency?: Currency }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [ready, setReady] = useState<Readiness>("all");
  const [sort, setSort] = useState<SortKey>("sales");
  const [grouped, setGrouped] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const hasGroups = useMemo(() => rows.some((r) => r.complexKey != null), [rows]);
  const offplanCount = useMemo(() => rows.filter(isOffPlan).length, [rows]);
  const list = useMemo(() => sortBuildings(filterBuildings(rows, { q, ready }), sort), [rows, q, ready, sort]);
  const groups = useMemo(() => sortGroups(groupBuildings(list), sort === "name" ? "name" : "sales"), [list, sort]);
  const total = grouped ? groups.length : list.length;
  const reset = () => setShown(PAGE);

  const chip = (id: Readiness, label: string) => (
    <button key={id} type="button" aria-pressed={ready === id} onClick={() => { setReady(id); reset(); }}
      className={`min-h-9 rounded-full border px-3 text-sm ${ready === id ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] hover:bg-[var(--grid)]"}`}>
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder={t("Find a building or developer")} aria-label={t("Find a building or developer")}
          className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm sm:w-64" />
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Ready or off-plan")}>
          {chip("all", t("All"))}
          {chip("ready", t("Ready"))}
          {chip("offplan", t("Off-plan"))}
        </div>
        <label className="ms-auto flex items-center gap-2 text-sm text-[var(--muted)]">
          {t("Sort by")}
          <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); reset(); }} className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-[var(--fg)]">
            <option value="sales">{t("Most sales")}</option>
            <option value="psf-high">{t("Price per sq ft, high to low")}</option>
            <option value="psf-low">{t("Price per sq ft, low to high")}</option>
            <option value="yield">{t("Highest gross yield")}</option>
            <option value="rent">{t("Highest rent")}</option>
            <option value="name">{t("Name A to Z")}</option>
          </select>
        </label>
      </div>
      {hasGroups && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={grouped} onChange={(e) => { setGrouped(e.target.checked); reset(); }} className="h-4 w-4" />
          {t("Group towers by development")}
        </label>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]" aria-live="polite">
        {grouped ? t("{n} developments, {m} buildings", { n: count(groups.length), m: count(list.length) }) : t("{n} of {m} buildings", { n: count(list.length), m: count(rows.length) })}
        {ready === "offplan" || offplanCount > 0 ? <> · {t("Off-plan means more than half of a building's sales in 12 months were off-plan (DLD registration type).")}</> : null}
      </p>

      {total === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
          {rows.length === 0 ? t("No building pages exist for this community yet.") : t("No building matches. Clear the search or the filter.")}
        </p>
      ) : grouped ? (
        <ul className="mt-2 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {groups.slice(0, shown).map((g) => (
            <li key={g.key}>
              {g.towers.length === 1 ? (
                <Row b={g.towers[0]} currency={currency} />
              ) : (
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                    <span className="min-w-0 font-medium">{g.name}<span className="ms-2 text-xs font-normal text-[var(--muted)]">{t("{n} towers", { n: g.towers.length })}</span></span>
                    <span className="text-xs tabular-nums text-[var(--muted)]">
                      {t("{n} sales", { n: count(g.sales) })}
                      {g.psfLow != null && g.psfHigh != null && <> · {g.psfLow === g.psfHigh ? formatPsf(g.psfLow, currency) : `${formatPsf(g.psfLow, currency)} – ${formatPsf(g.psfHigh, currency)}`}</>}
                    </span>
                  </summary>
                  <ul className="mb-2 ms-3 divide-y divide-[var(--border)] border-s border-[var(--border)] ps-3">
                    {g.towers.map((b) => <Row key={b.slug} b={b} currency={currency} />)}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {list.slice(0, shown).map((b) => <Row key={b.slug} b={b} currency={currency} />)}
        </ul>
      )}
      {total > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-3 min-h-10 rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--grid)]">
          {t("Show {n} more", { n: Math.min(PAGE, total - shown) })}
        </button>
      )}
    </div>
  );
}

function Row({ b, currency }: { b: MasterBuilding; currency: Currency }) {
  const t = useT();
  const off = isOffPlan(b);
  const meta = [b.developer, b.year ? t("built {year}", { year: b.year }) : null].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
      <div className="min-w-0">
        <Link className="link font-medium" href={`/building/${b.slug}`}>{b.name}</Link>
        {off && <span className="ms-2 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">{t("Off-plan")}</span>}
        {!b.placed && <span className="ms-2 text-xs text-[var(--muted)]">{t("not on the map yet")}</span>}
        {meta && <div className="text-xs text-[var(--muted)]">{meta}</div>}
      </div>
      <dl className="grid w-full grid-cols-[0.7fr_1.35fr_1fr_0.8fr] gap-2 text-[13px] tabular-nums sm:flex sm:w-auto sm:gap-4 sm:text-sm">
        <Cell label={t("Sales")} value={count(b.sales)} />
        <Cell label={t("Per sq ft")} value={formatPsf(b.psf, currency)} />
        <Cell label={t("Rent / yr")} value={formatMoneyShort(b.rent, currency)} note={b.rent != null && b.rentLevel === "project" ? t("project") : b.rent != null && b.rentLevel === "estimated" ? t("est.") : undefined} />
        <Cell label={t("Yield")} value={pct(b.yield)} />
      </dl>
    </li>
  );
}

function Cell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="whitespace-nowrap text-start sm:text-end">
      <dt className="text-[11px] text-[var(--muted)]">{label}</dt>
      <dd>{value}{note && <span className="text-[11px] text-[var(--muted)]"> {note}</span>}</dd>
    </div>
  );
}
