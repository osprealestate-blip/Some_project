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

type EntryCard = { title: string; blurb: string; cta: string; href: string };

const ENTRY_CARDS: EntryCard[] = [
  { title: "Check a price", blurb: "Is an asking price fair? Compare it with real sales in the same building.", cta: "Fair-price checker", href: "/tools/fair-price" },
  { title: "I own a home", blurb: "Look up your building, running costs and the most your rent can rise.", cta: "Homeowner tools", href: "/own" },
  { title: "Invest for yield", blurb: "Yields, rents and price trends by building and area.", cta: "Investor view", href: "/invest" },
  { title: "Rent a home", blurb: "Fair rents by building, and your rights at renewal.", cta: "Rent guide", href: "/rent" },
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
          <h1 className="text-3xl font-semibold sm:text-4xl lg:text-5xl tracking-tight">
            Are you paying a fair price?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)] sm:text-xl">
            Check any Dubai apartment against real Dubai Land Department sales. Free, no login.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/tools/fair-price"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent)]/90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Check a price
            </Link>
            <Link
              href="/map"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] px-6 py-3 text-sm font-medium hover:border-[var(--accent)]"
            >
              Explore the map
            </Link>
          </div>
        </div>

        <h2 className="mx-auto mt-12 max-w-2xl text-center text-base font-semibold sm:mt-16">What do you want to do?</h2>
        <div className="mx-auto mt-4 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRY_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 transition-colors hover:border-[var(--accent)]"
            >
              <span className="text-base font-semibold">{card.title}</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">{card.blurb}</span>
              <span className="mt-4 text-sm font-medium text-[var(--accent)]">{card.cta} <span aria-hidden="true">→</span></span>
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

        </section>
      )}
    </main>
  );
}
