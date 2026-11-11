import Link from "next/link";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "I own a property · Dubai building intelligence" };

export default async function Page() {
  const currency = await getServerCurrency();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">I own a property</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
        Track your property&rsquo;s value, check rent-increase limits at renewal, and understand running costs. All figures come from official DLD data — no asking prices, no broker markup.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold">What you can do</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/tools/rent-increase"
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]"
          >
            <h3 className="font-semibold">Rent increase at renewal</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">See the most a landlord can legally raise your rent under Decree 43 of 2013, based on how far your rent is below the market average.</p>
          </Link>
          <Link
            href="/search"
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]"
          >
            <h3 className="font-semibold">Look up your building</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Find your building to see its median sales price, price per sq ft, gross yield and recent transactions.</p>
          </Link>
          <Link
            href="#running-costs"
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]"
          >
            <h3 className="font-semibold">Running costs</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Estimate monthly holding costs — mortgage, service charge, utilities — and net yield on each building page.</p>
          </Link>
        </div>
      </section>

      <section id="running-costs" className="mt-10">
        <h2 className="text-base font-semibold">What to keep in mind</h2>
        <ul className="mt-4 space-y-3 text-sm text-[var(--muted)] list-disc pl-6">
          <li className="text-[var(--fg)]">
            Rent increase limits are set by Dubai law (Decree No. 43 of 2013) and depend on how far your current rent is below the RERA rental index average.
          </li>
          <li className="text-[var(--fg)]">
            Gross yield on building pages ignores service charges, vacancy and fees — the real return is lower.
          </li>
          <li className="text-[var(--fg)]">
            The Golden Visa property threshold checks the price threshold only, not eligibility. Title deed, mortgage and off-plan rules also apply.
          </li>
        </ul>
      </section>

      {hasDatabase() && (
        <section className="mt-10">
          <p className="text-sm text-[var(--muted)]">
            Start by searching for your building above, or open the rent increase calculator to check your renewal rights.
          </p>
        </section>
      )}
    </main>
  );
}
