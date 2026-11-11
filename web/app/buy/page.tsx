import Link from "next/link";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { formatPsf, formatShortPrice, pct } from "@/lib/format";
import { launchCommunities } from "@/lib/queries";
import { change } from "@/lib/stats";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buy a home · Dubai building intelligence" };

async function loadCards() {
  if (!hasDatabase()) return null;
  try {
    return await launchCommunities();
  } catch {
    return null;
  }
}

export default async function Page() {
  const currency = await getServerCurrency();
  const cards = await loadCards();
  const byCode = new Map(cards?.map((c) => [c.dm_code, c]));
  const asOf = cards?.find((c) => c.summary)?.summary?.period_end ?? null;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Buying a home in Dubai</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
        Find a home at a fair price. We show recorded DLD sales — not asking prices — so you can compare what an apartment is really worth before you make an offer.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Three steps to buy smarter</h2>
        <ol className="mt-4 space-y-4 text-sm list-decimal pl-6 text-[var(--muted)]">
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Browse areas.</span> See median prices, price per sq ft and gross yield for each community.{" "}
            <Link href="/search" className="link">Start searching</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Check a building.</span> Open any building page to see its sales history, rentals and nearby amenities.{" "}
            <Link href="/community/392" className="link">Example: Dubai Marina</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Verify the asking price.</span> Use the fair-price checker to compare an asking price against recent DLD sales of the same bedroom type in the same building.{" "}
            <Link href="/tools/fair-price" className="link">Open the fair-price checker</Link>.
          </li>
        </ol>
      </section>

      {hasDatabase() && cards && cards.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Launch areas at a glance</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Median figures for apartments, last 12 months.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {LAUNCH_COMMUNITIES.map((c) => {
              const d = byCode.get(c.code);
              const s = d?.summary;
              const lfl = s?.like_for_like_change ?? null;
              const yoy = lfl ?? change(s?.sale_median_psf_12m, s?.sale_median_psf_prev_12m);
              return (
                <Link
                  key={c.code}
                  href={`/community/${c.code}`}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]"
                >
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-[var(--muted)]">{c.officialName}</div>
                  {s ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div><dt className="text-xs text-[var(--muted)]">Median price</dt><dd className="tabular-nums">{formatPsf(s.sale_median_psf_12m, currency)}</dd></div>
                      <div><dt className="text-xs text-[var(--muted)]">Year on year</dt><dd className="tabular-nums">{pct(yoy, 1, true)}</dd></div>
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
        </section>
      )}
    </main>
  );
}

function day(d: string | null | undefined): string {
  if (!d) return "–";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const x = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  return `${x.getUTCDate()} ${months[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
}
