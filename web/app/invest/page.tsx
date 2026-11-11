import Link from "next/link";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { launchCommunities } from "@/lib/queries";
import LaunchAreaCards from "@/components/LaunchAreaCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invest for yield" };

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
      <h1 className="text-2xl font-semibold">Invest for yield</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
        Compare gross yields, price per sq ft and quarterly trends across communities. Yield is median annual rent divided by median sale price — it ignores service charges, vacancy and fees, so the real return is lower.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold">How to use this page</h2>
        <ol className="mt-4 space-y-4 text-sm list-decimal pl-6 text-[var(--muted)]">
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Compare yields across areas.</span> Gross yield is shown for each bedroom type on building and community pages. A higher yield does not always mean a better investment — it can reflect lower prices, higher rents, or both.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Look at price trends.</span> Quarterly charts on community pages show how median price per sq ft has moved over time. <Link href="/community/392" className="link">Example: Dubai Marina</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Check data quality.</span> Every figure shows its source and date. Where rents are estimated or drawn from the whole project rather than a single tower, the page says so.
          </li>
        </ol>
      </section>

      {hasDatabase() && cards && cards.length > 0 && (
        <LaunchAreaCards cards={cards} currency={currency} title="Launch areas at a glance" />
      )}
    </main>
  );
}
