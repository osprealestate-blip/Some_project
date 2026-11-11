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

type EntryCard = {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

const ENTRY_CARDS: EntryCard[] = [
  {
    title: "Buy a home",
    description:
      "Find a home at a fair price. Compare asking prices to recent DLD sales in the same building, and see median prices and yields by area.",
    primary: { label: "Browse buildings", href: "/search" },
    secondary: { label: "Fair-price checker", href: "/tools/fair-price" },
  },
  {
    title: "Invest for yield",
    description:
      "Compare gross yields, price per sq ft and quarterly trends across communities. See which areas are moving and by how much.",
    primary: { label: "Explore areas", href: "/community/392" },
    secondary: { label: "Building pages", href: "/search" },
  },
  {
    title: "I own a property",
    description:
      "Track your property's value, check rent-increase limits at renewal, and understand running costs. All figures from official DLD data.",
    primary: { label: "Rent increase calculator", href: "/tools/rent-increase" },
    secondary: { label: "Running costs", href: "/search" },
  },
  {
    title: "Rent a home",
    description:
      "See fair market rents by building and bedroom type, and what a landlord can legally charge at renewal under Decree 43 of 2013.",
    primary: { label: "Browse rents", href: "/search" },
    secondary: { label: "Rent increase calculator", href: "/tools/rent-increase" },
  },
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
        <div className="text-center sm:text-left lg:text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl lg:text-5xl tracking-tight">
            Find the right property. Understand the real market.
          </h1>
          <p className="mt-4 text-lg text-[var(--muted)] sm:text-xl max-w-2xl mx-auto sm:mx-0 lg:mx-auto">
            Prices, rents and yields from official Dubai Land Department data. Free, no login.
          </p>
          <div className="mt-8 sm:mt-10">
            <a
              href="/map"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent)]/90 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              Open the map <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <h2 className="mt-12 sm:mt-16 mb-4 text-base font-semibold sm:text-center sm:mx-auto lg:text-center lg:mx-auto max-w-2xl">
          Get started
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto sm:px-6 lg:px-0">
          {ENTRY_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.primary.href}
              className="group rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)] transition-colors"
            >
              <h3 className="text-base font-semibold group-hover:text-[var(--accent)]">{card.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{card.description}</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <span className="text-[var(--muted)]">▸ </span>
                  <a href={card.primary.href} className="link hover:underline">
                    {card.primary.label}
                  </a>
                </li>
                <li>
                  <span className="text-[var(--muted)]">▸ </span>
                  <a href={card.secondary.href} className="link hover:underline">
                    {card.secondary.label}
                  </a>
                </li>
              </ul>
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
