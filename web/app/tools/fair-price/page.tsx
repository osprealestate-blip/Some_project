import FairPriceForm from "@/components/FairPriceForm";
import NoData from "@/components/NoData";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { buildingBySlug } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: 'Fair-price checker', description: 'Compare an asking price with what the same type of apartment sold for in that building. An estimate, not a valuation.', path: '/tools/fair-price' });

export default async function Page({ searchParams }: { searchParams: Promise<{ building?: string }> }) {
  const { building } = await searchParams;
  const b = hasDatabase() && building ? await buildingBySlug(building).catch(() => null) : null;
  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Fair-price checker</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Is an asking price in line with what homes in the same building actually sold for? We compare it with the last 12 months of DLD sales of the same bedroom type.</p>
      <div className="mt-6">
        {hasDatabase() ? <FairPriceForm initial={b ? { slug: b.slug, name: b.name_en, community: b.community } : null} currency={await getServerCurrency()} /> : <NoData />}
      </div>
    </main>
  );
}
