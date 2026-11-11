import Link from "next/link";
import Term from "@/components/Term";
import { BANDS } from "@/lib/rentIncrease";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: 'Rent a home', description: 'What apartments rent for in Dubai buildings, and the most a landlord can raise the rent.', path: '/rent' });

export default function Page() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Renting a home</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] leading-relaxed">
        See median rents by building and bedroom type, and what a landlord can charge at renewal under Decree 43 of 2013. Rents come from registered Ejari contracts, not asking prices.
      </p>

      <section className="mt-10">
        <h2 className="text-base font-semibold">How rent works in Dubai</h2>
        <ol className="mt-4 space-y-4 text-sm list-decimal pl-6 text-[var(--muted)]">
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Market rent.</span> Building pages show median annual rent from <Term id="ejari">Ejari</Term> contracts for each bedroom type over the last 12 months.{" "}
            <Link href="/search" className="link">Find a building</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Rent increases at renewal.</span> The cap depends on how far the current rent is below the average for similar homes.{" "}
            <Link href="/tools/rent-increase" className="link">Use the rent increase calculator</Link>.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Notice of an increase.</span> The landlord must give written notice of any increase at least 90 days before the contract ends.
          </li>
          <li className="text-[var(--fg)]">
            <span className="font-semibold">Notice to end a tenancy.</span> A landlord who wants the tenant out when the contract ends must give 12 months&rsquo; notice by notary public or registered mail, and only for the reasons Dubai law allows (such as the owner&rsquo;s own use or sale). Law No. 33 of 2008.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Rent increase bands (Decree 43 of 2013)</h2>
        <table className="mt-3 w-full text-sm border-collapse [&_td]:border-b [&_td]:border-[var(--border)] [&_td]:p-3">
          <thead>
            <tr className="text-xs text-[var(--muted)]">
              <th scope="col" className="text-start font-medium">Current rent compared with the average</th>
              <th scope="col" className="text-end font-medium">Maximum increase</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b) => {
              const [range, cap] = b.text.split(": ");
              return (
                <tr key={b.text}><td className="text-[var(--fg)]">{range}</td><td className="text-end">{cap.charAt(0).toUpperCase() + cap.slice(1)}</td></tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-[var(--muted)]">
          The official average comes from the RERA Rental Index calculator on the Dubai Land Department site, and it decides disputes. Our market figure is an estimate from Ejari contracts. Estimate based on DLD data. Not a valuation or financial advice. Check the rules with RERA or a lawyer before acting on them.
        </p>
      </section>
    </main>
  );
}
