import { DISCLAIMER, SOURCES } from "@/lib/sources";
import { BANDS } from "@/lib/rentIncrease";
import { LIFE_GROUPS } from "@/lib/lifeScore";
import { GLOSSARY, termAnchor } from "@/lib/glossary";
import { pageMetadata } from "@/lib/seo";
import { GOOD_COMPS, MIN_COMPS } from "@/lib/fairPrice";

export const metadata = pageMetadata({ title: 'How it works', description: 'Where the figures come from, how they are calculated, and what they do not tell you.', path: '/how-it-works' });

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 text-sm leading-relaxed sm:p-6">
      <h1 className="text-2xl font-semibold">How the figures are made</h1>
      <p className="font-medium">{DISCLAIMER}</p>

      <section aria-labelledby="glossary">
        <h2 id="glossary" className="text-base font-semibold">What the words mean</h2>
        <dl className="mt-2 space-y-3">
          {GLOSSARY.map((g) => (
            <div key={g.id} id={termAnchor(g.id)} className="scroll-mt-20 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 target:border-[var(--accent)]">
              <dt className="font-semibold">{g.term}</dt>
              <dd className="mt-1">{g.short}</dd>
              <dd className="mt-1 text-[var(--muted)]">{g.long}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="at-a-glance">
        <h2 id="at-a-glance" className="text-base font-semibold">Each figure at a glance</h2>
        <p className="mt-2">Where it comes from, what it means and where it falls short. Every figure on a page also shows the date of the newest data behind it.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-xs text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="py-1 pe-3 text-start font-medium">Figure</th>
                <th className="py-1 pe-3 text-start font-medium">Source</th>
                <th className="py-1 pe-3 text-start font-medium">What it is</th>
                <th className="py-1 text-start font-medium">Limits</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-medium">Median sale price, price per sq ft</th>
                <td className="py-2 pe-3">{SOURCES.dldSales}</td>
                <td className="py-2 pe-3">Completed sales in the last 12 months, apartments only. Off-plan sales are included and shown separately on area pages.</td>
                <td className="py-2">A building with few sales can swing; the confidence label says how many sales it rests on.</td>
              </tr>
              <tr className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-medium">Change on a year earlier</th>
                <td className="py-2 pe-3">{SOURCES.dldSales}</td>
                <td className="py-2 pe-3">Median price per sq ft now against the 12 months before. Areas compare each tower with itself.</td>
                <td className="py-2">Reflects which flats sold as well as prices. Needs at least 3 sales in each period.</td>
              </tr>
              <tr className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-medium">Median annual rent</th>
                <td className="py-2 pe-3">{SOURCES.dldRents}</td>
                <td className="py-2 pe-3">Registered Ejari rent contracts in the last 12 months.</td>
                <td className="py-2">Contracts name the project, not the tower, so some are the whole project&apos;s or placed by unit size. Both are labelled.</td>
              </tr>
              <tr className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-medium">Gross yield</th>
                <td className="py-2 pe-3">{`${SOURCES.dldSales}; ${SOURCES.dldRents}`}</td>
                <td className="py-2 pe-3">Median rent divided by median price, same bedroom type.</td>
                <td className="py-2">Before service charges, vacancy and fees. An estimate, not a return.</td>
              </tr>
              <tr className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-medium">Monthly cost and net yield</th>
                <td className="py-2 pe-3">{`${SOURCES.dldSales}; ${SOURCES.dldRents}`}</td>
                <td className="py-2 pe-3">Price, size and rent are DLD medians. Mortgage rate, service charge and utilities are general assumptions you can change.</td>
                <td className="py-2">The assumptions are not this building&apos;s figures. Agent, trustee and bank fees are not included.</td>
              </tr>
              <tr className="border-b border-[var(--border)] align-top">
                <th scope="row" className="py-2 pe-3 text-start font-medium">Nearby places and distances</th>
                <td className="py-2 pe-3">{`${SOURCES.osm}; ${SOURCES.khda}; ${SOURCES.dha}`}</td>
                <td className="py-2 pe-3">Straight-line distances from the building&apos;s map position.</td>
                <td className="py-2">Not walking or driving time. Approximate map positions are flagged on the building page.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="confidence">
        <h2 id="confidence" className="text-base font-semibold">Data confidence</h2>
        <p className="mt-2">Building and area pages show how many sales the headline figures rest on: <strong>Good</strong> for {GOOD_COMPS} or more sales in the last 12 months, <strong>Limited</strong> for {MIN_COMPS} to {GOOD_COMPS - 1}, <strong>Low</strong> for fewer. It is a count of sales, not a judgement of the building, and it uses the same thresholds as the fair-price checker.</p>
      </section>

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
        <p className="mt-2">Records far out of line with their neighbours are also set aside, because they are usually a typo, a part-share or an internal transfer rather than a market deal. A sale counts as out of line below 40% or above 250% of the median price per sq ft in the same tower that year (5 or more sales), or below 25% or above 400% of the area median when the tower has fewer. A rent counts as out of line below a third or above three times the median for the same bedroom type in the same project that year (or the area). They stay on file and are rechecked every time the figures are recalculated.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Matching deals to buildings</h2>
        <p className="mt-2">DLD sales carry a building name but no map position, and spellings vary. Names are tidied (case, punctuation, words like “Tower”) and grouped within each community. Where the DLD plot number is known, names on the same single-building plot are merged. DLD rent contracts name only the project, never the tower. Where a contract&apos;s exact flat size and bedrooms match flats sold in only one tower nearby, and that tower has sold that layout at least 6 times, it is placed in that tower and the rent is marked as estimated; otherwise a building with several towers in one project shows the project&apos;s rents and says so. Map positions come from OpenStreetMap names (buildings, and construction sites for towers still being built), or are placed by hand. Where a tower has no position of its own, it is shown at another tower on the same plot or in the same project, or at its development&apos;s site, and its page says the position is approximate.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Gross yield</h2>
        <p className="mt-2">Median annual rent divided by median sale price, for the same bedroom type and the same 12 months. It ignores service charges, vacancy and fees, so the real return is lower. It is an estimate, and it is only shown next to the rent it comes from. Where a tower has fewer than 3 rents of its own for a bedroom type, the project&apos;s rents are used and marked “project”.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Year-on-year change</h2>
        <p className="mt-2">For an area, the headline change compares each tower with itself: the change in the tower&apos;s median price per sq ft over the last 12 months against the 12 months before, for towers with at least 3 sales in both, averaged by this year&apos;s number of sales. The plain change of the area median also moves when the mix changes, for example when fewer expensive off-plan units are sold, even if every tower&apos;s price went up. Area pages also show ready and off-plan sales separately.</p>
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
        <h2 className="text-base font-semibold">How far to key places</h2>
        <p className="mt-2">Building pages show the distance to the nearest school, the nearest point of Sheikh Zayed Road, Business Bay, Downtown, DIFC, Kite Beach, Jumeirah Beach and DXB airport. Distance is a straight line; drive time is an estimate (road distance about 1.35 times the straight line, at typical off-peak speeds, plus a few minutes to park). Each row links to the real road route on OpenStreetMap. Rush-hour commute times come later.</p>
      </section>

      <section>
        <h2 className="text-base font-semibold">Life Score (basic)</h2>
        <p className="mt-2">Out of 100. Each group earns its full points when the nearest place is within 400 m (about a five-minute walk), falling to none at 2 km. Distances are straight lines, not walking routes.</p>
        <ul className="mt-2 list-disc ps-5">{LIFE_GROUPS.map((g) => <li key={g.id}>{g.label}: {g.weight} points</li>)}</ul>
      </section>
    </main>
  );
}
