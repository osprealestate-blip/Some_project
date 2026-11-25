import Link from "next/link";
import ClusterList from "./ClusterList";
import DataBadge from "./DataBadge";
import LatestSales from "./LatestSales";
import LineChart from "./LineChart";
import MasterBuildingList from "./MasterBuildingList";
import SourceNote from "./SourceNote";
import Stat from "./Stat";
import { getConversionNote } from "@/config/currency";
import { freshnessParts } from "@/lib/coverage";
import { getServerCurrency } from "@/lib/currency";
import { count, formatMoneyShort, formatPsf, pct, roomsLabel } from "@/lib/format";
import { getT } from "@/lib/lang";
import { communityState, isHandChecked, masterEvidence, masterNameAr, masterSlug } from "@/lib/masterCommunities";
import { masterPage } from "@/lib/masterQueries";
import { freshnessStamps } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";
import { change } from "@/lib/stats";
import { clustersInMaster } from "@/lib/villaClusterQueries";

const TONE = { Available: "var(--good)", Partial: "var(--warn)", "Not available": "var(--muted)" } as const;

/** One page per master community: the same figures and rules as the three hand-checked areas, from the buildings in the group.
 *  Every figure carries its source and date; where there is too little, the page says so instead of showing a guess. */
export default async function MasterCommunityPage({ name }: { name: string }) {
  const { t, lang } = await getT();
  const currency = await getServerCurrency();
  const [page, stamps, clusters] = await Promise.all([masterPage(name), freshnessStamps().catch(() => ({ salesTo: null, rentsTo: null, projectsAsOf: null })), clustersInMaster(name).catch(() => [])]);
  const { summaries, series, buildings, areas, developers } = page;
  const all = summaries.find((s) => s.rooms === -1);
  const slug = masterSlug(name);
  const ar = masterNameAr(name);
  const title = lang === "ar" && ar ? ar : name;
  const other = lang === "ar" ? name : ar;
  const placed = buildings.filter((b) => b.placed).length;
  const complexes = new Set(buildings.map((b) => b.complexKey).filter(Boolean)).size;
  const salesFromBuildings = buildings.reduce((n, b) => n + b.sales, 0);
  const sales12m = all?.sale_count_12m ?? salesFromBuildings;
  const state = communityState(sales12m, buildings.length);
  const handChecked = isHandChecked(name);
  const evidence = masterEvidence({ buildings: buildings.length, placed, sales12m, rents12m: all?.rent_count_12m ?? 0, handChecked });

  const plainYoy = change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m);
  const lfl = all?.like_for_like_change ?? null;
  const readyYoy = change(all?.sale_median_psf_ready_12m, all?.sale_median_psf_ready_prev_12m);
  const offplanYoy = change(all?.sale_median_psf_offplan_12m, all?.sale_median_psf_offplan_prev_12m);
  const yields = summaries.filter((s) => s.rooms >= 0 && s.gross_yield != null).map((s) => s.gross_yield!).sort((a, b) => a - b);
  const midYield = yields.length ? yields[Math.floor((yields.length - 1) / 2)] : null;
  const conversionNote = getConversionNote(currency);
  const oneArea = areas.length === 1 ? areas[0] : null;
  const dev = developers.map((d) => d.name).join(", ");

  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Communities", item: "/communities" },
    { "@type": "ListItem", position: 2, name, item: `/community/${slug}` },
  ] };

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, "\\u003c") }} />
      <nav aria-label={t("Breadcrumb")} className="text-xs text-[var(--muted)]"><Link className="link" href="/communities">{t("Communities")}</Link> / {title}</nav>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      {other && <p className="text-sm text-[var(--muted)]" lang={lang === "ar" ? "en" : "ar"}>{other}</p>}
      <p className="mt-2 max-w-2xl text-sm">
        {t("{n} buildings", { n: count(buildings.length) })}
        {complexes > 0 && <> · {t("{n} developments", { n: count(complexes) })}</>}
        {placed > 0 && <> · {t("{n} on the map", { n: count(placed) })}</>}
        {clusters.length > 0 && <> · {t("{n} villa and townhouse clusters", { n: count(clusters.length) })}</>}
      </p>
      {(areas.length > 0 || dev) && (
        <p className="mt-1 max-w-2xl text-xs text-[var(--muted)]">
          {areas.length > 0 && <>{t("Official areas")}: {areas.map((a) => `${a.name} (${a.code})`).join(", ")}. </>}
          {dev && <>{t("Main developers")}: {dev}.</>}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {placed > 0 && <Link href={`/map?f=master:${slug}`} className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white">{t("See on the 3D map")}</Link>}
        {oneArea && <Link href={`/off-plan?area=${oneArea.code}`} className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--grid)]">{t("Off-plan projects here")}</Link>}
        <Link href="/tools/fair-price" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 text-sm hover:bg-[var(--grid)]">{t("Check a price")}</Link>
      </div>

      <DataBadge saleCount={sales12m} periodEnd={all?.period_end} t={t} />
      <p className="mt-1 text-xs text-[var(--muted)]">{t("Data dates")}: {freshnessParts(stamps).join(" · ")}.</p>

      {!page.figures && (
        <p role="note" className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
          {t("Price, rent and yield figures for communities are not computed on this database yet. The buildings below and their own figures are unaffected.")}
        </p>
      )}
      {page.figures && state !== "ok" && (
        <p role="note" className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
          {buildings.length === 0 && clusters.length === 0
            ? t("No building pages exist for this community yet.")
            : state === "none"
              ? t("No apartment sales were counted here in the last 12 months, so there is no price figure. That is a gap in the data, not a price of zero.")
              : t("Fewer than 3 sales were counted in the last 12 months, so medians are not shown. Treat anything here as a single example, not a typical price.")}
        </p>
      )}

      <section aria-label={t("What we know about this community")} className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t("What we know about this community")}</h2>
        <ul className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {evidence.map((r) => (
            <li key={r.id} className="grid grid-cols-[auto_1fr] items-baseline gap-x-2">
              <span aria-hidden className="h-2 w-2 translate-y-[-1px] rounded-full" style={{ background: TONE[r.level] }} />
              <span>
                <strong className="font-medium">{t(r.label)}:</strong> <span className={r.level === "Not available" ? "text-[var(--muted)]" : ""}>{t(r.level)}</span>
                <span className="block text-xs text-[var(--muted)]">{t(r.detail, r.vars)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[var(--muted)]">{t("Not available means we hold nothing reliable, not that the answer is zero.")}</p>
      </section>

      {all && (all.sale_median_psf_12m != null || all.rent_median_12m != null) && (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat term={lang === "en" ? "price-per-sq-ft" : undefined} label={t("Median price per sq ft")} value={formatPsf(all.sale_median_psf_12m, currency)} note={t("{n} apartment sales in 12 months", { n: count(all.sale_count_12m) })} />
            {lfl != null ? (
              <Stat label={t("Change on a year earlier")} value={pct(lfl, 1, true)} note={t("Same towers ({n}), per sq ft", { n: count(all.like_for_like_towers ?? 0) })} />
            ) : (
              <Stat label={t("Change on a year earlier")} value={pct(plainYoy, 1, true)} note={t("Median per sq ft")} />
            )}
            <Stat label={t("Median annual rent")} value={formatMoneyShort(all.rent_median_12m, currency)} note={t("{n} contracts, all bedroom types", { n: count(all.rent_count_12m) })} />
            <Stat term={lang === "en" ? "gross-yield" : undefined} label={t("Gross yield (estimate)")} value={pct(midYield)} note={t("Median across bedroom types")} />
          </section>
          {conversionNote && <p className="mt-2 text-xs text-[var(--muted)]">{conversionNote}</p>}
          <SourceNote t={t} source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={all.period_end} estimate>
            {t("Apartments only; 12 months to the newest sale. Sales are those tied to a building in this community; rents are contracts tied to its buildings or their projects, so they are a sample, not every rent.")}
            {lfl != null && plainYoy != null && ` ${t("The community median itself moved {pct}, partly because the mix of towers and off-plan sales changed; the same-tower figure compares each tower with itself.", { pct: pct(plainYoy, 1, true) })}`}
          </SourceNote>
        </>
      )}

      {state === "ok" && (all?.sale_count_ready_12m || all?.sale_count_offplan_12m) ? (
        <section className="mt-8">
          <h2 className="text-base font-semibold">{t("Ready and off-plan, last 12 months")}</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label={t("Ready, median per sq ft")} value={formatPsf(all.sale_median_psf_ready_12m, currency)} note={t("{n} sales; {pct} on a year earlier", { n: count(all.sale_count_ready_12m ?? 0), pct: pct(readyYoy, 1, true) })} />
            <Stat label={t("Off-plan, median per sq ft")} value={formatPsf(all.sale_median_psf_offplan_12m, currency)} note={t("{n} sales; {pct} on a year earlier", { n: count(all.sale_count_offplan_12m ?? 0), pct: pct(offplanYoy, 1, true) })} />
          </div>
          <SourceNote t={t} source={SOURCES.dldSales} date={all.period_end}>{t("Off-plan = sold by the developer before completion (DLD registration type).")}</SourceNote>
        </section>
      ) : null}

      <ClusterList clusters={clusters} currency={currency} periodEnd={all?.period_end ?? stamps.salesTo} t={t} />

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{t("Buildings")} ({count(buildings.length)})</h2>
          {complexes > 0 && <p className="text-xs text-[var(--muted)]">{t("Sibling towers can be grouped by development.")}</p>}
        </div>
        <div className="mt-3"><MasterBuildingList rows={buildings} currency={currency} /></div>
        <SourceNote t={t} source={SOURCES.dldSales} date={all?.period_end} estimate>
          {t("* Yield is an estimate, shown only where the rent it comes from is shown. “project” = rents for the whole project, because DLD rent contracts name the project, not the tower; “est.” = some rents placed in the tower by unit size. A dash means too few records, not zero.")}
        </SourceNote>
      </section>

      {buildings.length > 0 && <LatestSales scope={{ master: name }} currency={currency} periodEnd={all?.period_end} />}

      {summaries.some((s) => s.rooms >= 0 && (s.sale_count_12m > 0 || s.rent_count_12m > 0)) && (
        <details className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <summary className="cursor-pointer text-base font-semibold">{t("By bedroom type, last 12 months")}</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 text-start font-medium">{t("Type")}</th>
                  <th className="py-1 text-end font-medium">{t("Sales")}</th>
                  <th className="py-1 text-end font-medium">{t("Median price")}</th>
                  <th className="py-1 text-end font-medium">{t("Per sq ft")}</th>
                  <th className="py-1 text-end font-medium">{t("Median rent / yr")}</th>
                  <th className="py-1 text-end font-medium">{t("Gross yield")}*</th>
                </tr>
              </thead>
              <tbody>
                {summaries.filter((s) => s.rooms >= 0 && (s.sale_count_12m > 0 || s.rent_count_12m > 0)).map((r) => (
                  <tr key={r.rooms} className="border-b border-[var(--border)]">
                    <td className="py-1.5">{lang === "ar" ? bedrooms(r.rooms) : roomsLabel(r.rooms)}</td>
                    <td className="py-1.5 text-end">{count(r.sale_count_12m)}</td>
                    <td className="py-1.5 text-end">{formatMoneyShort(r.sale_median_price_12m, currency)}</td>
                    <td className="py-1.5 text-end">{formatPsf(r.sale_median_psf_12m, currency)}</td>
                    <td className="py-1.5 text-end">{formatMoneyShort(r.rent_median_12m, currency)}</td>
                    <td className="py-1.5 text-end">{pct(r.gross_yield)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SourceNote t={t} source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={all?.period_end} estimate />
        </details>
      )}

      {(series.sales.some((p) => p.value != null) || series.rents.some((p) => p.value != null)) && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <LineChart title={t("Median sale price per sq ft, by quarter")} points={series.sales} unit="psf" countLabel={t("sales")} currency={currency} />
            <SourceNote t={t} source={SOURCES.dldSales} date={all?.period_end} />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <LineChart title={t("Median annual rent, by quarter")} points={series.rents} unit="aed" countLabel={t("contracts")} currency={currency} />
            <SourceNote t={t} source={SOURCES.dldRents} date={all?.period_end} />
          </div>
        </section>
      )}

      <p className="mt-6 text-xs text-[var(--muted)]">
        {t("Communities are the groups people search for. They can differ from the official Dubai Municipality areas, which have their own pages.")}{" "}
        {areas.map((a, i) => <span key={a.code}>{i > 0 && ", "}<Link className="link" href={`/community/${a.code}`}>{a.name}</Link></span>)}
      </p>
    </main>
  );
}

function bedrooms(rooms: number): string {
  return rooms === 0 ? "استوديو" : rooms >= 4 ? "4+ غرف" : `${rooms} ${rooms === 1 ? "غرفة" : "غرف"}`;
}
