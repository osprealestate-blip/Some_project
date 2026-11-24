"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEFAULT_CURRENCY, type Currency } from "@/config/currency";
import { count, formatMoneyShort, formatPsf, pct } from "@/lib/format";
import { filterIndex, masterNameAr, sortIndex, type IndexRow, type IndexSort } from "@/lib/masterCommunities";
import { useLang, useT } from "./LangProvider";

/** Every community on one screen: find one by name, or sort by activity, price per sq ft or size. Rows without a figure show
 *  why (no sales counted, too few sales), never a blank that could be read as zero. */
export default function CommunityIndex({ rows, currency = DEFAULT_CURRENCY, figures }: { rows: IndexRow[]; currency?: Currency; figures: boolean }) {
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<IndexSort>("sales");
  const [priced, setPriced] = useState(false);
  const list = useMemo(() => sortIndex(filterIndex(rows, q, priced), sort), [rows, q, priced, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Find a community, e.g. Marina or Azizi")} aria-label={t("Find a community")}
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 text-sm sm:w-72" />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          {t("Sort by")}
          <select value={sort} onChange={(e) => setSort(e.target.value as IndexSort)} className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2 text-[var(--fg)]">
            <option value="sales">{t("Most sales")}</option>
            <option value="psf-high">{t("Price per sq ft, high to low")}</option>
            <option value="psf-low">{t("Price per sq ft, low to high")}</option>
            <option value="buildings">{t("Most buildings")}</option>
            <option value="name">{t("Name A to Z")}</option>
          </select>
        </label>
        {figures && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={priced} onChange={(e) => setPriced(e.target.checked)} className="h-4 w-4" />
            {t("Only with a price figure")}
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]" aria-live="polite">{t("{n} of {m} communities", { n: count(list.length), m: count(rows.length) })}</p>

      {list.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">{t("No community matches. Clear the search.")}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => {
            const ar = masterNameAr(r.name);
            const title = lang === "ar" && ar ? ar : r.name;
            return (
              <li key={r.slug}>
                <Link href={`/community/${r.slug}`} className="block h-full rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{title}</span>
                    <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)]">{r.handChecked ? t("Hand-checked") : t("Auto-matched")}</span>
                  </div>
                  <div className="text-xs text-[var(--muted)]">{t("{n} buildings", { n: count(r.buildings) })} · {t(r.sales === 1 ? "{n} sale in 12 months" : "{n} sales in 12 months", { n: count(r.sales) })}</div>
                  {r.psf != null ? (
                    <dl className="mt-3 grid grid-cols-[1.5fr_1fr_0.8fr] gap-2 whitespace-nowrap text-sm">
                      <div><dt className="text-[11px] text-[var(--muted)]">{t("Per sq ft")}</dt><dd className="tabular-nums">{formatPsf(r.psf, currency)}</dd></div>
                      <div><dt className="text-[11px] text-[var(--muted)]">{t("Rent / yr")}</dt><dd className="tabular-nums">{formatMoneyShort(r.rent, currency)}</dd></div>
                      <div><dt className="text-[11px] text-[var(--muted)]">{t("Gross yield")}</dt><dd className="tabular-nums">{pct(r.yield)}</dd></div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {!figures ? t("Figures not computed yet") : r.sales === 0 ? t("No sales counted in 12 months") : t("Too few sales for a price")}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
