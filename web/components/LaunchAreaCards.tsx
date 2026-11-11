import Link from "next/link";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import type { Currency } from "@/config/currency";
import { day, formatPsf, formatShortPrice, pct } from "@/lib/format";
import type { launchCommunities } from "@/lib/queries";
import { change } from "@/lib/stats";
import { SOURCES } from "@/lib/sources";

type Cards = Awaited<ReturnType<typeof launchCommunities>>;

/** The three launch-area cards used on the guided pages (/buy, /invest). Same figures as the homepage. */
export default function LaunchAreaCards({ cards, currency, title }: { cards: Cards; currency: Currency; title: string }) {
  const byCode = new Map(cards.map((c) => [c.dm_code, c]));
  const asOf = cards.find((c) => c.summary)?.summary?.period_end ?? null;
  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Median figures for apartments, last 12 months.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {LAUNCH_COMMUNITIES.map((c) => {
          const d = byCode.get(c.code);
          const s = d?.summary;
          const lfl = s?.like_for_like_change ?? null;
          const yoy = lfl ?? change(s?.sale_median_psf_12m, s?.sale_median_psf_prev_12m);
          return (
            <Link key={c.code} href={`/community/${c.code}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
              <div className="font-medium">{c.label}</div>
              <div className="text-xs text-[var(--muted)]">{c.officialName}</div>
              {s ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-xs text-[var(--muted)]">Price per sq ft</dt><dd className="tabular-nums">{formatPsf(s.sale_median_psf_12m, currency)}</dd></div>
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
    </section>
  );
}
