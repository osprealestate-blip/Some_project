import Link from "next/link";
import ComparePicker from "@/components/ComparePicker";
import CompareTable from "@/components/CompareTable";
import NoData from "@/components/NoData";
import SourceNote from "@/components/SourceNote";
import { getConversionNote } from "@/config/currency";
import { figuresFor, latestPeriod, parseIds } from "@/lib/compare";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { buildingSummariesBySlug } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare buildings", description: "Up to four Dubai buildings side by side, from DLD data." };

export default async function Page({ searchParams }: { searchParams: Promise<{ ids?: string | string[] }> }) {
  const sp = await searchParams;
  const slugs = parseIds(sp.ids);
  if (!hasDatabase()) {
    return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">Compare buildings</h1><div className="mt-4"><NoData /></div></main>;
  }
  const currency = await getServerCurrency();
  const items = slugs.length ? await buildingSummariesBySlug(slugs) : [];
  const figures = items.map(figuresFor);
  const missing = slugs.filter((s) => !items.some((i) => i.building.slug === s));
  const note = getConversionNote(currency);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Compare buildings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Put up to four buildings side by side. The figures are shown as they are, with no ranking: a higher or lower number is not better or worse by itself. Change the currency with the selector in the header.
      </p>

      {missing.length > 0 && (
        <p role="status" className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 text-sm">
          No building page for: {missing.join(", ")}. {items.length ? "The others are shown below." : ""}
        </p>
      )}

      <div className="mt-5"><ComparePicker slugs={items.map((i) => i.building.slug)} /></div>

      {figures.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--muted)]">
          Search for a building above to start. You can also open a <Link className="link" href="/buildings">building list</Link> and use the Compare link on any building page.
        </p>
      ) : (
        <>
          {figures.length === 1 && <p className="mt-6 text-sm text-[var(--muted)]">Add at least one more building to compare.</p>}
          <CompareTable figures={figures} currency={currency} />
          <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={latestPeriod(figures)} estimate>
            Apartments only; 12 months to each building&apos;s newest sale. Gross yield = median rent ÷ median price, same bedroom type, median across types. Amounts are stored in AED{note ? `. ${note}` : ""}.
          </SourceNote>
          <p className="mt-2 text-xs text-[var(--muted)]">Share this comparison by copying the page address.</p>
        </>
      )}
    </main>
  );
}
