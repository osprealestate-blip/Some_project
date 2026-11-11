import Link from "next/link";

export const metadata = { title: "I own a property" };

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">I own a property</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
        Look up your building, check rent-increase limits at renewal, and see running costs. Figures come from official DLD data, not asking prices. They are not a valuation of your home.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold">What you can do</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/tools/rent-increase" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]">
            <h3 className="font-semibold">Rent increase at renewal</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">See the most a landlord can raise a rent under Decree 43 of 2013, based on how far the rent is below the market average.</p>
          </Link>
          <Link href="/search" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]">
            <h3 className="font-semibold">Look up your building</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">Search for your building to see recorded sales, price per sq ft, median rents and gross yield by bedroom type.</p>
          </Link>
          <Link href="/search" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 hover:border-[var(--accent)]">
            <h3 className="font-semibold">Running costs</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">The monthly cost calculator and the Golden Visa price check are on each building page. Search for your building to open them.</p>
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">What to keep in mind</h2>
        <ul className="mt-4 space-y-3 text-sm text-[var(--muted)] list-disc pl-6">
          <li className="text-[var(--fg)]">
            Rent increase limits come from Dubai Decree No. 43 of 2013 and depend on how far the current rent is below the RERA rental index average.
          </li>
          <li className="text-[var(--fg)]">
            Gross yield ignores service charges, vacancy and fees, so the real return is lower.
          </li>
          <li className="text-[var(--fg)]">
            The Golden Visa check looks at the price threshold only. It does not confirm eligibility; title deed, mortgage and off-plan rules also apply.
          </li>
        </ul>
      </section>
    </main>
  );
}
