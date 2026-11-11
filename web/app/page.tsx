import Link from "next/link";
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

type EntryCard = { title: string; href: string; blurb: string };

const ENTRY_CARDS: EntryCard[] = [
  { title: "I'm buying", href: "/buy", blurb: "Compare an asking price with recent sales in the same building." },
  { title: "I'm investing", href: "/invest", blurb: "Yields, price per sq ft and trends by area and building." },
  { title: "I own a property", href: "/own", blurb: "Look up your building and check the rent increase at renewal." },
  { title: "I'm renting", href: "/rent", blurb: "Fair rents by building and bedrooms, and the legal renewal limit." },
];

export default async function Home() {
  const currency = await getServerCurrency();
  const conversionNote = getConversionNote(currency);
  const cards = await loadCards();
  const byCode = new Map(cards?.map((c) => [c.dm_code, c]));
  const asOf = cards?.find((c) => c.summary)?.summary?.period_end ?? null;
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Is the asking price fair?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)] sm:text-xl">
            Check any Dubai apartment against real Dubai Land Department sales and rents in the same building. Free, no login.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/tools/fair-price"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-base font-semibold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Check a price <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/map"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-6 py-3 text-base font-semibold hover:border-[var(--accent)]"
            >
              Explore the map
            </Link>
          </div>
        </div>

        <h2 className="mx-auto mb-4 mt-12 max-w-2xl text-center text-base font-semibold sm:mt-16">
          What do you want to do?
        </h2>
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRY_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="flex min-h-24 flex-col justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)] focus-visible:border-[var(--accent)]"
            >
              <span className="text-base font-semibold">{card.title} <span aria-hidden="true" className="text-[var(--accent)]">→</span></span>
              <span className="mt-1 text-sm text-[var(--muted)]">{card.blurb}</span>
            </Link>
          ))}
        </div>

        <div className="mt-10 sm:mt-14 border-t border-[var(--border)] pt-8 sm:pt-10">
          <SearchBox placeholder="Try “Princess Tower” or “JVC”" autoFocus={false} />
        </div>
      </section>

      {hasDatabase() && (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
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
      )}
    </main>
  );
}
