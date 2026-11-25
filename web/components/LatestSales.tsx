"use client";
import Link from "next/link";
import { useState } from "react";
import type { Currency } from "@/config/currency";
import { useLang, useT } from "@/components/LangProvider";
import { day, formatMoney, roomsLabel, sqft } from "@/lib/format";
import { LATEST_DEFAULT, LATEST_MAX, type LatestSale } from "@/lib/latestSalesShared";
import { SOURCES } from "@/lib/sources";
import SourceNote from "./SourceNote";

const AR_ROOMS = (r: number) => (r === 0 ? "استوديو" : r >= 4 ? "4+ غرف" : `${r} ${r === 1 ? "غرفة" : "غرف"}`);

/** A small list people open if they want it: the newest sales in this community, newest first. Nothing is fetched until it is opened. */
export default function LatestSales({ scope, currency, periodEnd }: { scope: { master: string } | { area: string }; currency: Currency; periodEnd?: string | null }) {
  const t = useT();
  const lang = useLang();
  const [rows, setRows] = useState<LatestSale[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [limit, setLimit] = useState(LATEST_DEFAULT);
  const qs = "master" in scope ? `master=${encodeURIComponent(scope.master)}` : `area=${encodeURIComponent(scope.area)}`;

  async function load(n: number) {
    setState("loading");
    try {
      const r = await fetch(`/api/latest-sales?${qs}&limit=${n}`);
      if (!r.ok) throw new Error();
      setRows(((await r.json()) as { rows: LatestSale[] }).rows);
      setLimit(n);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <details className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && rows === null && state !== "loading") void load(LATEST_DEFAULT); }}>
      <summary className="cursor-pointer text-base font-semibold">{t("Latest sales")}</summary>
      <p className="mt-2 text-sm text-[var(--muted)]">{t("The newest apartment sales we counted here, newest first.")}</p>
      {state === "loading" && rows === null && <p className="mt-3 text-sm text-[var(--muted)]" role="status">{t("Loading…")}</p>}
      {state === "error" && <p className="mt-3 text-sm text-[var(--muted)]" role="status">{t("Could not load the sales. Try again later.")} <button type="button" className="link" onClick={() => void load(limit)}>{t("Try again")}</button></p>}
      {rows && rows.length === 0 && <p className="mt-3 text-sm text-[var(--muted)]">{t("No counted sales in the last 12 months.")}</p>}
      {rows && rows.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {rows.map((r, i) => (
              <li key={i} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/building/${r.slug}`} className="link min-w-0 truncate font-medium">{r.building}</Link>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(r.price, currency)}</span>
                </div>
                <div className="text-xs text-[var(--muted)]">{r.area}</div>
                <div className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
                  {day(r.txn_date)}
                  {r.rooms != null && <> · {lang === "ar" ? AR_ROOMS(r.rooms) : roomsLabel(r.rooms)}</>}
                  {" · "}{sqft(r.size_sqft)}
                  {" · "}{formatMoney(r.price_psf, currency)}/{t("sq ft")}
                  {r.off_plan != null && <> · <span className="whitespace-nowrap">{r.off_plan ? t("Off-plan") : t("Ready")}</span></>}
                </div>
              </li>
            ))}
          </ul>
          {rows.length >= limit && limit < LATEST_MAX && (
            <button type="button" className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--grid)]" onClick={() => void load(Math.min(LATEST_MAX, limit + LATEST_DEFAULT))}>{t("Show more")}</button>
          )}
          <SourceNote t={t} source={SOURCES.dldSales} date={periodEnd ?? rows[0].txn_date}>
            {t("Market fields only: no unit numbers, floors or parties. A price here is what that flat sold for, not what yours would.")}
          </SourceNote>
        </>
      )}
    </details>
  );
}
