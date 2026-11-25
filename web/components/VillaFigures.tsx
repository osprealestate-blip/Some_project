import Link from "next/link";
import type { Currency } from "@/config/currency";
import { count, day, formatMoneyShort, formatPsf, sqft } from "@/lib/format";
import type { T } from "@/lib/i18n";
import { SOURCES } from "@/lib/sources";
import { tList } from "@/lib/i18n";
import { bedroomMix, CLUSTER_POINT_NOTE, CLUSTER_SOURCE_LABEL } from "@/lib/villaCluster";
import type { VillaCardData } from "@/lib/villaCardData";

/** The figures of one villa or townhouse cluster, shared by the map card and the page. Aggregates only; each block names
 *  its source and date. No per-villa rows, no owner or tenant details. */
export default function VillaFigures({ data, currency, t }: { data: VillaCardData; currency: Currency; t: T }) {
  const s = data.summary;
  const mix = bedroomMix(data.rows);
  const point = data.point.source ? t(CLUSTER_SOURCE_LABEL[data.point.source] ?? data.point.source) : null;
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Fig label={t("Sales, 12 months")} value={count(s.sales)} />
        <Fig label={t("Median price")} value={s.price != null ? formatMoneyShort(s.price, currency) : "–"} />
        <Fig label={t("Median per sq ft")} value={s.psf != null ? formatPsf(s.psf, currency) : "–"} />
      </dl>
      {s.sales > 0 && s.psf == null && <p className="text-xs text-[var(--muted)]">{t("Fewer than 3 sales in 12 months: no median shown.")}</p>}
      {s.sales === 0 && <p className="text-xs text-[var(--muted)]">{t("No counted sales in the last 12 months.")}</p>}
      {s.rent != null && <p>{t("Median rent")}: <strong>{formatMoneyShort(s.rent, currency)}</strong> {t("a year, from {n} contracts", { n: s.rentCount })}</p>}
      {mix.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("Bedrooms in sales")}</h3>
          <ul className="mt-1 space-y-1">
            {mix.map((m) => (
              <li key={m.rooms} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0">{t(m.label)}</span>
                <span className="h-2 min-w-0 flex-1 rounded-full bg-[var(--grid)]"><span className="block h-2 rounded-full bg-[var(--accent)]" style={{ width: `${m.share}%` }} /></span>
                <span className="w-24 shrink-0 text-end text-[var(--muted)]">{m.share}% · {t("{n} sales", { n: m.sales })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(data.plots != null || (data.sizeMedianSqft != null && data.sizeMedianSqft > 0)) && (
        <p>
          {data.plots != null && <>{t("Plots in this cluster")}: <strong>{count(data.plots)}</strong>. </>}
          {data.sizeMedianSqft != null && data.sizeMedianSqft > 0 && <>{t("Median size")}: <strong>{sqft(data.sizeMedianSqft)}</strong>.</>}
        </p>
      )}
      <div className="space-y-1 text-[11px] leading-snug text-[var(--muted)]">
        <p>{t("Sales and rents: matched to this project by its Dubai Land Department project name, 12 months to {date}. Medians; a sample, not every rent.", { date: day(data.periodEnd) })}</p>
        <p>{t("Source")}: {tList(t, SOURCES.dldSales)}{data.sourceDate ? `, ${t("data to {date}", { date: day(data.sourceDate) })}` : ""}.</p>
        {(data.plots != null || data.sizeMedianSqft) && <p>{t("Plot counts and sizes: Dubai Land Department records, checked {date}.", { date: day(data.auditDate) })}</p>}
        <p>{t(CLUSTER_POINT_NOTE)}{point ? ` ${t("Position: {source}.", { source: point })}` : ""}</p>
        <p>{t("Map: OpenStreetMap contributors via OpenFreeMap. Community: Dubai Municipality.")}</p>
      </div>
      {data.community && data.dmCode && (
        <Link href={`/community/${data.dmCode}`} className="inline-block rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-cyan-200">
          {t("See buildings in {area}", { area: data.community })}
        </Link>
      )}
    </div>
  );
}

function Fig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--grid)]/60 px-1 py-2">
      <dt className="text-[10px] leading-tight text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 whitespace-nowrap text-[13px] font-semibold">{value}</dd>
    </div>
  );
}
