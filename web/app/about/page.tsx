import { DISCLAIMER, SOURCES } from "@/lib/sources";
import { BANDS } from "@/lib/rentIncrease";
import { LIFE_GROUPS } from "@/lib/lifeScore";

export const metadata = { title: "How the figures are made" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 text-sm leading-relaxed sm:p-6">
      <h1 className="text-2xl font-semibold">How the figures are made</h1>
      <p className="font-medium">{DISCLAIMER}</p>

      <section>
        <h2 className="text-base font-semibold">Sources</h2>
        <ul className="mt-2 list-disc ps-5">
          <li>Sales: {SOURCES.dldSales}. Only sales are counted (no mortgages or gifts).</li>
          <li>Rents: {SOURCES.dldRents}. Contracts covering several units are left out.</li>
          <li>Schools: {SOURCES.khda}. Health: {SOURCES.dha}. Transport, shops and parks: {SOURCES.osm}.</li>
          <li>Map: OpenFreeMap tiles, {SOURCES.osm}. {SOURCES.dm}.</li>
        </ul>
        <p className="mt-2">Every figure shows the date of the newest data it uses. No personal data is stored or shown: no owner, buyer, seller or tenant details and no unit numbers.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Cleaning</h2>
        <p className="mt-2">Deals under 10 m², sales under AED 50,000, rents under AED 5,000 a year, and dates in the future or before 1990 are kept on file but not counted. Prices use medians, not averages, so one unusual deal can&apos;t move them much. A median needs at least 3 deals.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Matching deals to buildings</h2>
        <p className="mt-2">DLD sales carry a building name but no map position, and spellings vary. Names are tidied (case, punctuation, words like “Tower”) and grouped within each community. Where the DLD plot number is known, names on the same single-building plot are merged. DLD rent contracts name only the project, so a building with several towers in one project shows the project&apos;s rents and says so. Map positions come from OpenStreetMap building names, or are placed by hand.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Gross yield</h2>
        <p className="mt-2">Median annual rent divided by median sale price, for the same bedroom type and the same 12 months. It ignores service charges, vacancy and fees, so the real return is lower. It is an estimate.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Fair-price checker</h2>
        <p className="mt-2">Takes the 12 months of sales up to the newest sale for the same bedroom type, in the same building (or the community, when the building has fewer than 5). The estimate is the median price per sq ft times your size; the range is the middle half of those sales (25th to 75th percentile). It is not a valuation: floor, view, condition and layout are not known.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Rent increase calculator</h2>
        <p className="mt-2">Dubai Decree No. 43 of 2013 sets the most a rent can rise at renewal, by how far it is below the average rent for similar homes (the RERA rental index):</p>
        <ul className="mt-2 list-disc ps-5">{BANDS.map((b) => <li key={b.text}>{b.text}</li>)}</ul>
        <p className="mt-2">The landlord must give written notice at least 90 days before the contract ends. The official average comes from the DLD Rental Index calculator; our own market figure is an estimate from Ejari contracts.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Life Score (basic)</h2>
        <p className="mt-2">Out of 100. Each group earns its full points when the nearest place is within 400 m (about a five-minute walk), falling to none at 2 km. Distances are straight lines, not walking routes.</p>
        <ul className="mt-2 list-disc ps-5">{LIFE_GROUPS.map((g) => <li key={g.id}>{g.label}: {g.weight} points</li>)}</ul>
      </section>
    </main>
  );
}
