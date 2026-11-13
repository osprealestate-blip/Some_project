import Link from "next/link";
import ImportCollection from "@/components/ImportCollection";
import NoData from "@/components/NoData";
import SourceNote from "@/components/SourceNote";
import { getConversionNote } from "@/config/currency";
import { cleanName } from "@/lib/collections";
import { figuresFor, latestPeriod, rentBasis } from "@/lib/compare";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { cleanSlugs } from "@/lib/favourites";
import { count, formatPsf, formatShortPrice, pct } from "@/lib/format";
import { buildingSummariesBySlug } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared list of buildings", description: "A list of Dubai buildings someone shared, with the latest DLD figures.", robots: { index: false, follow: true } };

type SP = { name?: string | string[]; ids?: string | string[] };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Read-only view of a shared list: the link holds only a name and building slugs, so it carries no personal data. */
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const name = cleanName(one(sp.name)) ?? "Shared list";
  const slugs = cleanSlugs(Array.isArray(sp.ids) ? sp.ids.join(",") : sp.ids);
  if (!hasDatabase()) return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">{name}</h1><div className="mt-4"><NoData /></div></main>;
  const currency = await getServerCurrency();
  const items = slugs.length ? await buildingSummariesBySlug(slugs) : [];
  const figures = items.map(figuresFor);
  const note = getConversionNote(currency);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">A list of buildings someone shared with you. It is a plain list: it does not say these buildings are good or bad.</p>
      {figures.length === 0 ? <p className="mt-6 text-sm text-[var(--muted)]">This list is empty, or its buildings no longer have a page. <Link className="link" href="/map">Explore the map</Link></p> : (
        <>
          <ImportCollection name={name} slugs={figures.map((f) => f.slug)} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">{name}</caption>
              <thead className="text-xs text-[var(--muted)]"><tr className="border-b border-[var(--border)] text-start">
                <th scope="col" className="py-2 pe-3 text-start font-medium">Building</th><th scope="col" className="py-2 pe-3 text-start font-medium">Median sale price</th>
                <th scope="col" className="py-2 pe-3 text-start font-medium">Per sq ft</th><th scope="col" className="py-2 pe-3 text-start font-medium">Median annual rent</th><th scope="col" className="py-2 text-start font-medium">Gross yield</th>
              </tr></thead>
              <tbody>{figures.map((f) => (
                <tr key={f.slug} className="border-b border-[var(--border)] align-top">
                  <th scope="row" className="py-2 pe-3 text-start font-normal"><Link className="link font-medium" href={`/map?building=${f.slug}`}>{f.name}</Link><div className="text-xs text-[var(--muted)]">{f.community}</div></th>
                  <td className="py-2 pe-3 tabular-nums">{formatShortPrice(f.medianPrice, currency)}<div className="text-xs text-[var(--muted)]">{f.sales12m == null ? "" : `${count(f.sales12m)} sales`}</div></td>
                  <td className="py-2 pe-3 tabular-nums">{formatPsf(f.psf, currency)}</td>
                  <td className="py-2 pe-3 tabular-nums">{formatShortPrice(f.rent, currency)}<div className="text-xs text-[var(--muted)]">{rentBasis(f)}</div></td>
                  <td className="py-2 tabular-nums">{pct(f.grossYield)}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={latestPeriod(figures)} estimate>Apartments only; 12 months to each building&apos;s newest sale.{note ? ` ${note}` : ""}</SourceNote>
        </>
      )}
    </main>
  );
}
