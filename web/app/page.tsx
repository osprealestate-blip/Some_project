import Link from "next/link";
import BuildingMap from "@/components/BuildingMap";
import SearchBox from "@/components/SearchBox";
import { getConversionNote } from "@/config/currency";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { day, formatPsf, formatShortPrice, pct } from "@/lib/format";
import { launchCommunities } from "@/lib/queries";
import { change } from "@/lib/stats";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";

async function loadCards() {
  if (!hasDatabase()) return null;
  try {
    return await launchCommunities();
  } catch {
    return null;
  }
}

export default async function Home() {
  const currency = await getServerCurrency();
  const conversionNote = getConversionNote(currency);
  const cards = await loadCards();
  const byCode = new Map(cards?.map((c) => [c.dm_code, c]));
  const asOf = cards?.find((c) => c.summary)?.summary?.period_end ?? null;
  return (
    <main>
      <section className="relative h-[70dvh] min-h-[420px] w-full">
        <BuildingMap currency={currency} />
        <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-start">
          <div className="pointer-events-auto w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 p-4 shadow-sm">
            <h1 className="text-lg font-semibold">Dubai, building by building</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Prices, rents and yields from official Dubai Land Department data. Free, no login.</p>
            <div className="mt-3"><SearchBox placeholder="Try “Princess Tower” or “JVC”" /></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-base font-semibold">Launch areas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {LAUNCH_COMMUNITIES.map((c) => {
            const d = byCode.get(c.code);
            const s = d?.summary;
            const lfl = s?.like_for_like_change ?? null;
            const yoy = lfl ?? change(s?.sale_median_psf_12m, s?.sale_median_psf_prev_12m);
            return (
              <Link key={c.code} href={`/community/${c.code}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-[var(--muted)]">{c.officialName}{c.scope ? " (incl. JBR, Bluewaters, Dubai Harbour)" : ""}</div>
                {s ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><dt className="text-xs text-[var(--muted)]">Median price</dt><dd className="tabular-nums">{formatPsf(s.sale_median_psf_12m, currency)}</dd></div>
                    <div><dt className="text-xs text-[var(--muted)]">{lfl != null ? "Year on year, same towers" : "Year on year"}</dt><dd className="tabular-nums">{pct(yoy, 1, true)}</dd></div>
                    <div><dt className="text-xs text-[var(--muted)]">Median rent</dt><dd className="tabular-nums">{formatShortPrice(s.rent_median_12m, currency)}/yr</dd></div>
                    <div><dt className="text-xs text-[var(--muted)]">Buildings</dt><dd className="tabular-nums">{d?.buildings ?? "–"}</dd></div>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">Figures appear once DLD data is loaded.</p>
                )}
              </Link>
            );
          })}
        </div>
        {asOf && <p className="mt-2 text-xs text-[var(--muted)]">Apartments, 12 months to {day(asOf)}. Source: {SOURCES.dldSales}; {SOURCES.dldRents}.</p>}
        {conversionNote && <p className="mt-1 text-xs text-[var(--muted)]">{conversionNote}</p>}

        <h2 className="mt-10 text-base font-semibold">Tools</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link href="/tools/fair-price" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
            <div className="font-medium">Fair-price checker</div>
            <p className="mt-1 text-sm text-[var(--muted)]">Compare an asking price with recent DLD sales in the same building.</p>
          </Link>
          <Link href="/tools/rent-increase" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
            <div className="font-medium">Rent increase calculator</div>
            <p className="mt-1 text-sm text-[var(--muted)]">How much can the rent go up at renewal? Based on Decree 43 of 2013.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
