import Link from "next/link";
import NoData from "@/components/NoData";
import SourceNote from "@/components/SourceNote";
import { getConversionNote } from "@/config/currency";
import { areaFigures, parseCodes, MAX_AREAS } from "@/lib/areaCompare";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { count, day, formatMoneyShort, formatPsf, pct } from "@/lib/format";
import { areasWithFigures, summariesForCodes } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Compare areas", description: "Dubai communities side by side from DLD data.", path: "/communities/compare", noindex: true });

export default async function Page({ searchParams }: { searchParams: Promise<{ areas?: string | string[] }> }) {
  const codes = parseCodes((await searchParams).areas);
  if (!hasDatabase()) return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">Compare areas</h1><div className="mt-4"><NoData /></div></main>;
  const currency = await getServerCurrency();
  const [options, found] = await Promise.all([areasWithFigures().catch(() => []), summariesForCodes(codes).catch(() => [])]);
  const figs = found.map((f) => {
    const all = f.rows.find((r) => r.rooms === -1);
    return areaFigures({
      code: f.code, name: f.name, sales: all?.sale_count_12m ?? 0, psf: all?.sale_median_psf_12m ?? null, psfPrev: all?.sale_median_psf_prev_12m ?? null,
      likeForLike: all?.like_for_like_change ?? null, rent: all?.rent_median_12m ?? null, rentCount: all?.rent_count_12m ?? 0,
      yields: f.rows.filter((r) => r.rooms >= 0 && r.gross_yield != null).map((r) => r.gross_yield!),
      readySales: all?.sale_count_ready_12m ?? 0, offPlanSales: all?.sale_count_offplan_12m ?? 0, periodEnd: all?.period_end ?? null,
    });
  });
  const note = getConversionNote(currency);
  const rows: [string, (f: (typeof figs)[number]) => string][] = [
    ["Median price per sq ft", (f) => formatPsf(f.psf, currency)],
    ["Change on a year earlier", (f) => (f.yoy == null ? "–" : `${pct(f.yoy, 1, true)} (${f.yoyBasis})`)],
    ["Apartment sales, 12 months", (f) => count(f.sales)],
    ["Median annual rent", (f) => formatMoneyShort(f.rent, currency)],
    ["Rent contracts, 12 months", (f) => count(f.rentCount)],
    ["Gross yield (estimate)", (f) => pct(f.grossYield)],
    ["Off-plan share of sales", (f) => (f.offPlanShare == null ? "–" : `${Math.round(f.offPlanShare * 100)}%`)],
  ];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs text-[var(--muted)]"><Link className="link" href="/communities">Communities</Link> /</p>
      <h1 className="mt-1 text-2xl font-semibold">Compare areas</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Pick up to {MAX_AREAS}. Figures are shown as they are, with no ranking: a higher number is not better or worse by itself.</p>
      <form method="get" className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: MAX_AREAS }, (_, i) => (
          <select key={i} name="areas" aria-label={`Area ${i + 1}`} defaultValue={codes[i] ?? ""} className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm">
            <option value="">{i < 2 ? "Choose an area" : "Add another (optional)"}</option>
            {options.map((o) => <option key={o.dm_code} value={o.dm_code}>{o.name} ({count(o.sales)} sales)</option>)}
          </select>
        ))}
        <button className="rounded-md border border-[var(--accent)] px-3 py-2 text-sm font-medium sm:col-span-2 lg:col-span-4 lg:w-40" type="submit">Compare</button>
      </form>
      {figs.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">{codes.length ? "No figures for those areas yet." : "Choose two or more areas to see them side by side."}</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
              <thead><tr className="border-b border-[var(--border)] text-start"><th className="py-2 text-start font-medium"><span className="sr-only">Figure</span></th>{figs.map((f) => <th key={f.code} className="py-2 text-end font-semibold"><Link className="link" href={`/community/${f.code}`}>{f.name}</Link></th>)}</tr></thead>
              <tbody>
                {rows.map(([label, fn]) => (
                  <tr key={label} className="border-b border-[var(--border)]"><th scope="row" className="py-1.5 text-start font-normal text-[var(--muted)]">{label}</th>{figs.map((f) => <td key={f.code} className="py-1.5 text-end">{fn(f)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {figs.some((f) => f.thin) && <p className="mt-3 text-sm text-[var(--muted)]">Fewer than 30 sales in a year for: {figs.filter((f) => f.thin).map((f) => f.name).join(", ")}. Treat those columns as rough.</p>}
          <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={figs[0].periodEnd} estimate>
            Apartments only. “Same towers” compares each tower with itself; “median” compares area medians, which also move with the mix of flats sold. Areas differ in how many off-plan sales they have.{note ? ` ${note}` : ""}
          </SourceNote>
        </>
      )}
    </main>
  );
}
