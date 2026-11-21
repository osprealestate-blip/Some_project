import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import HeroSkyline from "@/components/HeroSkyline";
import { compactCount, homeStats } from "@/lib/homeStats";
import { getT } from "@/lib/lang";
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
  { title: "Explore buildings", href: "/map", blurb: "See every building on a 3D map, coloured by price, rent or yield." },
  { title: "Compare", href: "/compare", blurb: "Put up to four buildings side by side on registered prices and rents." },
  { title: "Understand investment", href: "/invest", blurb: "Yields, price per sq ft and trends by area and building." },
  { title: "Research a building", href: "/tools/fair-price", blurb: "Check an asking price against recent registered sales in the same building." },
];

export default async function Home() {
  const { t } = await getT();
  const currency = await getServerCurrency();
  const conversionNote = getConversionNote(currency);
  const [cards, stats] = await Promise.all([loadCards(), homeStats()]);
  const byCode = new Map(cards?.map((c) => [c.dm_code, c]));
  const asOf = cards?.find((c) => c.summary)?.summary?.period_end ?? null;
  const statItems = stats && stats.buildings > 0
    ? [
        { v: compactCount(stats.buildings), l: t("Buildings with figures") },
        { v: compactCount(stats.sales), l: t("Sales on record") },
        { v: compactCount(stats.rents), l: t("Rent contracts on record") },
      ]
    : null;
  return (
    <main>
      <section className="px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-b from-[#3d6a99] via-[#5a85b2] to-[#4c76a3] text-white">
          <HeroSkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 w-full text-[#1d3a58]/20" />
          <div className="relative px-4 pb-6 pt-10 sm:px-8 sm:pt-14 lg:pb-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{t("Understand Dubai, building by building")}</h1>
                <p className="mt-3 max-w-xl text-base text-white/90 sm:text-lg">
                  {t("Registered Dubai Land Department sales and rent contracts for each building. Not asking prices, not listings. Free, no login.")}
                </p>
              </div>
              {statItems ? (
                <dl className="flex gap-6 lg:gap-8">
                  {statItems.map((x) => (
                    <div key={x.l}><dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{x.v}</dd><dt className="text-xs text-white/85 sm:text-sm">{x.l}</dt></div>
                  ))}
                </dl>
              ) : (
                <p className="max-w-56 rounded-lg bg-white/15 px-3 py-2 text-sm">{t("Limited information available. Figures appear once the data is loaded.")}</p>
              )}
            </div>
            <div className="mt-8 text-[var(--fg)]">
              <SearchBox placeholder={t("Search a building or area")} autoFocus={false} />
            </div>
            <p className="mt-2 text-sm font-medium">
              <Link href="/off-plan" className="inline-flex min-h-11 items-center underline underline-offset-4">{t("Off-plan projects")}</Link>
            </p>
          </div>
        </div>
        {stats && <p className="mx-auto mt-2 max-w-6xl px-1 text-xs text-[var(--muted)]">{t("Counts are DLD records in our database")}{stats.sourceDate ? `, ${t("data as of")} ${day(stats.sourceDate)}` : ""}. {t("Source")}: {SOURCES.dldSales}; {SOURCES.dldRents}.</p>}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="mb-4 text-base font-semibold">{t("Where do you want to start?")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRY_CARDS.map((card) => (
            <Link key={card.title} href={card.href} className="flex min-h-24 flex-col justify-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 transition-colors hover:border-[var(--accent)] focus-visible:border-[var(--accent)]">
              <span className="text-base font-semibold">{t(card.title)} <span aria-hidden="true" className="text-[var(--accent)] rtl:inline-block rtl:rotate-180">→</span></span>
              <span className="mt-1 text-sm text-[var(--muted)]">{t(card.blurb)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 className="text-base font-semibold">{t("Launch areas")}</h2>
        {!cards ? (
          <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">
            <p className="font-medium text-[var(--fg)]">{t("Limited information available")}</p>
            <p className="mt-1">{t("Area figures are not available right now. The map and tools still work.")}</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {LAUNCH_COMMUNITIES.map((c) => {
              const d = byCode.get(c.code);
              const s = d?.summary;
              const lfl = s?.like_for_like_change ?? null;
              const yoy = lfl ?? change(s?.sale_median_psf_12m, s?.sale_median_psf_prev_12m);
              return (
                <Link key={c.code} href={`/community/${c.code}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
                  <div className="font-medium">{t(c.label)}</div>
                  <div className="text-xs text-[var(--muted)]">{c.officialName}{c.scope ? " (incl. JBR, Bluewaters, Dubai Harbour)" : ""}</div>
                  {s ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div><dt className="text-xs text-[var(--muted)]">{t("Median price")}</dt><dd className="tabular-nums">{formatPsf(s.sale_median_psf_12m, currency)}</dd></div>
                      <div><dt className="text-xs text-[var(--muted)]">{lfl != null ? t("Year on year, same towers") : t("Year on year")}</dt><dd className="tabular-nums">{pct(yoy, 1, true)}</dd></div>
                      <div><dt className="text-xs text-[var(--muted)]">{t("Median rent")}</dt><dd className="tabular-nums">{formatShortPrice(s.rent_median_12m, currency)}/{t("yr")}</dd></div>
                      <div><dt className="text-xs text-[var(--muted)]">{t("Buildings")}</dt><dd className="tabular-nums">{d?.buildings ?? "–"}</dd></div>
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted)]">{t("Limited information available. Figures appear once DLD data is loaded.")}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
        {asOf && <p className="mt-2 text-xs text-[var(--muted)]">{t("Apartments, 12 months to")} {day(asOf)}. {t("Source")}: {SOURCES.dldSales}; {SOURCES.dldRents}.</p>}
        {conversionNote && <p className="mt-1 text-xs text-[var(--muted)]">{conversionNote}</p>}

      </section>
    </main>
  );
}
