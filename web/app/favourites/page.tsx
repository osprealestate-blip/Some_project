import FavouritesList from "@/components/FavouritesList";
import NoData from "@/components/NoData";
import SourceNote from "@/components/SourceNote";
import { getConversionNote } from "@/config/currency";
import { figuresFor, latestPeriod } from "@/lib/compare";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { cleanSlugs } from "@/lib/favourites";
import { buildingSummariesBySlug } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved buildings",
  description: "Buildings you saved in this browser, with their latest DLD figures.",
  robots: { index: false, follow: true },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  const sp = await searchParams;
  const slugs = cleanSlugs(Array.isArray(sp.ids) ? sp.ids.join(",") : sp.ids);
  if (!hasDatabase()) {
    return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">Saved buildings</h1><div className="mt-4"><NoData /></div></main>;
  }
  const currency = await getServerCurrency();
  const items = slugs.length ? await buildingSummariesBySlug(slugs) : [];
  const figures = items.map(figuresFor);
  const missing = slugs.filter((s) => !items.some((i) => i.building.slug === s));
  const note = getConversionNote(currency);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Saved buildings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Your list is kept in this browser only. There is no account and nothing is sent to us, so it will not follow you to another phone or computer.
        Figures are the latest on the site, not the ones from the day you saved.
      </p>
      <FavouritesList figures={figures} urlSlugs={slugs} missing={missing} currency={currency} />
      {figures.length > 0 && (
        <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={latestPeriod(figures)} estimate>
          Apartments only; 12 months to each building&apos;s newest sale. Gross yield = median rent ÷ median price, same bedroom type, median across types.
          {note ? ` ${note}` : ""} The CSV is always in AED.
        </SourceNote>
      )}
    </main>
  );
}
