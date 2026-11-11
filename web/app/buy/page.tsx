import Link from "next/link";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { launchCommunities } from "@/lib/queries";
import LaunchAreaCards from "@/components/LaunchAreaCards";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: 'Buy a home', description: 'What apartments sold for in Dubai buildings, with the source and date for every figure.', path: '/buy' });

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
        <LaunchAreaCards cards={cards} currency={currency} title="Launch areas at a glance" />
      )}
    </main>
  );
}
