import Link from "next/link";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rent a home · Dubai building intelligence" };

export default async function Page() {
  const currency = await getServerCurrency();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Renting a home</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
        See fair market rents by building and bedroom type, and what a landlord can legally charge at renewal under Decree 43 of 2013. Rents are from actual Ejari contracts — not asking prices.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold">How rent works in Dubai</h2>
        <ol className="mt-4 space-y-4 text-sm list-decimal pl-6 text-[var(--muted)]">
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Fair market rent.</span> We show median annual rent from Ejari contracts for each building and bedroom type, over the last 12 months.{" "}
            <Link href="/search" className="link">Find a building</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Rent increases at renewal.</span> Dubai law caps how much a landlord can raise the rent, based on how far your current rent is below the market average for similar homes.{" "}
            <Link href="/tools/rent-increase" className="link">Use the rent increase calculator</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Notice period.</span> The landlord must give written notice of any increase at least 90 days before the contract ends.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Rent increase bands (Decree 43 of 2013)</h2>
        <table className="mt-3 w-full text-sm border-collapse [&_td]:border-b [&_td]:border-[var(--border)] [&_td]:p-3">
          <thead>
            <tr className="text-xs text-[var(--muted)]">
              <th className="text-start font-medium">Your rent vs market average</th>
              <th className="text-end font-medium">Max increase</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="text-[var(--fg)]">Below market by 10% or less</td><td className="text-end">No increase</td></tr>
            <tr><td className="text-[var(--fg)]">Below market by 11–20%</td><td className="text-end">Up to 5%</td></tr>
            <tr><td className="text-[var(--fg)]">Below market by 21–30%</td><td className="text-end">Up to 10%</td></tr>
            <tr><td className="text-[var(--fg)]">Below market by 31–40%</td><td className="text-end">Up to 15%</td></tr>
            <tr><td className="text-[var(--fg)]">Below market by more than 40%</td><td className="text-end">Up to 20%</td></tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Bands are from Dubai Decree No. 43 of 2013. The official average comes from the RERA Rental Index calculator; our market figure is an estimate from Ejari contracts.
        </p>
      </section>

      {hasDatabase() && (
        <section className="mt-10">
          <p className="text-sm text-[var(--muted)]">
            Search for a building to see its median rents by bedroom type, or use the rent increase calculator to check your renewal rights.
          </p>
        </section>
      )}
    </main>
  );
}
