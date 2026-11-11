import Link from "next/link";
import { notFound } from "next/navigation";
import BuildingMap from "@/components/BuildingMap";
import GoldenVisaChecker from "@/components/GoldenVisaChecker";
import LineChart from "@/components/LineChart";
import MonthlyCostCalculator from "@/components/MonthlyCostCalculator";
import KeyDistances from "@/components/KeyDistances";
import NearbyPanel from "@/components/NearbyPanel";
import NoData from "@/components/NoData";
import RoomsTable from "@/components/RoomsTable";
import SourceNote from "@/components/SourceNote";
import Term from "@/components/Term";
import KeyTerms from "@/components/KeyTerms";
import Stat from "@/components/Stat";
import { convertFromAed, getConversionNote } from "@/config/currency";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { count, day, formatMoney, formatPsf, formatShortPrice, pct, roomsLabel, sqft } from "@/lib/format";
import {
  buildingBySlug, buildingSeries, buildingSummaries, isOffPlanOnly, nearbyPlaces, offPlanRentEstimate, recentSales, siblingBuildings,
} from "@/lib/queries";
import { SOURCES } from "@/lib/sources";
import { change } from "@/lib/stats";

const METHOD_TEXT: Record<string, string> = {
  land_number: "DLD sales matched by name, confirmed by the DLD plot number",
  land_number_tower: "DLD sales matched by name; tower picked on a shared DLD plot",
  land_number_plot: "DLD sales matched by name to a DLD plot with several towers",
  name: "DLD sales matched by building name",
  manual: "Checked by hand",
};

const POSITION_TEXT: Record<string, string> = {
  osm: "Map position from OpenStreetMap.",
  search: "Map position from OpenStreetMap's place search.",
  manual: "Map position placed by hand.",
  plot: "Approximate map position: another tower on the same plot.",
  project: "Approximate map position: another tower of the same project.",
  site: "Approximate map position: the development's site in OpenStreetMap.",
};

type Props = { slug: string; variant?: "page" | "panel" };

/** Everything shown for one building. The standalone page and the panel over the map both render this. */
export default async function BuildingDetail({ slug, variant = "page" }: Props) {
  const panel = variant === "panel";
  if (!hasDatabase()) {
    return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 id={panel ? "building-panel-title" : undefined} className="text-xl font-semibold">Building</h1><div className="mt-4"><NoData /></div></main>;
  }
  const b = await buildingBySlug(slug);
  if (!b) notFound();
  const currency = await getServerCurrency();
  const conversionNote = getConversionNote(currency);
  const [summaries, series, sales, places, siblings] = await Promise.all([
    buildingSummaries(b.id), buildingSeries(b), recentSales(b.id), nearbyPlaces(b), siblingBuildings(b),
  ]);
  const all = summaries.find((s) => s.rooms === -1);
  const noRent = all?.rent_median_12m == null && series.rentLevel == null;
  const unfinished = await isOffPlanOnly(b.id); // every sale in 24 months was off-plan
  const offPlan = noRent && unfinished;
  const offPlanRents = offPlan ? await offPlanRentEstimate(b) : [];
  const yoy = change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m);
  const yields = summaries.filter((s) => s.rooms >= 0 && s.gross_yield != null).map((s) => s.gross_yield!).sort((a, c) => a - c);
  const midYield = yields.length ? yields[Math.floor((yields.length - 1) / 2)] : null;
  const rentLevel = all?.rent_level ?? series.rentLevel;
  const periodEnd = all?.period_end ?? null;
  const placed = b.lng != null && b.lat != null;

  return (
    <main className={panel ? "p-4 sm:p-5" : "mx-auto max-w-5xl p-4 sm:p-6"}>
      <nav className="text-xs text-[var(--muted)]">
        {!panel && <><Link className="link" href="/map">Map</Link> /{" "}</>}
        {b.dm_code ? <Link className="link" href={`/community/${b.dm_code}`}>{b.community}</Link> : b.community}
      </nav>
      <h1 id={panel ? "building-panel-title" : undefined} className="mt-1 text-2xl font-semibold">{b.name_en}</h1>
      <p className="text-sm text-[var(--muted)]">
        {b.community}{b.community !== b.community_official ? ` (${b.community_official})` : ""}
        {b.project && b.project.toLowerCase() !== b.name_en.toLowerCase() ? ` · Project: ${b.project}` : ""}
        {b.floors ? ` · ${b.floors} floors` : ""}
        {b.unit_count ? ` · ${count(b.unit_count)} units` : ""}
      </p>
      {!panel && <p className="mt-1 text-sm"><Link className="link" href={`/compare?ids=${b.slug}`}>Compare with other buildings</Link></p>}

      <section className={`mt-5 grid grid-cols-2 gap-3 ${panel ? "" : "md:grid-cols-4"}`}>
        <Stat term="price-per-sq-ft" label="Median price per sq ft" value={formatPsf(all?.sale_median_psf_12m, currency)} note={`${count(all?.sale_count_12m ?? 0)} sales in 12 months`} />
        <Stat label="Change on a year earlier" value={pct(yoy, 1, true)} note="Median per sq ft" />
        <Stat label={rentLevel === "project" ? "Project median annual rent" : rentLevel === "estimated" ? "Median annual rent (estimated)" : "Median annual rent"} value={formatShortPrice(all?.rent_median_12m, currency)} note={offPlan ? "Not completed yet: no rent contracts" : rentLevel === "project" ? (unfinished ? "Not completed yet: this is the whole project's rent, not this tower's" : "Whole project (rents are filed per project, not per tower)") : rentLevel === "estimated" ? `Estimated: ${count(all?.rent_count_12m ?? 0)} contracts, some placed by unit size` : `${count(all?.rent_count_12m ?? 0)} contracts`} />
        <Stat term="gross-yield" label="Gross yield (estimate)" value={pct(midYield)} note="Median across bedroom types" />
      </section>
      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={periodEnd} estimate>
        Apartments only; 12 months to the newest sale. Gross yield = median rent ÷ median price, same bedroom type.{conversionNote ? ` ${conversionNote}` : ""}
      </SourceNote>
      <KeyTerms />

      <section className="mt-8">
        <h2 className="text-base font-semibold">By bedroom type, last 12 months</h2>
        <div className="mt-2"><RoomsTable rows={summaries} currency={currency} /></div>
        <p className="mt-1 text-xs text-[var(--muted)]">* Estimate. Rows need 3 or more deals for a median.{rentLevel === "project" ? " Rents are for the whole project, because DLD rent contracts name the project, not the tower." : ""}{rentLevel === "estimated" ? " Rent contracts do not name the tower, so some were placed in this building because their exact size and bedrooms match flats sold here and in no other tower nearby. Estimated." : ""}</p>
      </section>

      {offPlan && (
        <section className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <h2 className="text-base font-semibold">Rent: not completed yet</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Every sale here in the last 24 months was off-plan, so the building has no rent contracts yet.
            {offPlanRents.length ? " For comparison, this is what flats of a similar size rent for in the same community:" : ""}
          </p>
          {offPlanRents.length > 0 && (
            <table className="mt-2 w-full text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 text-start font-medium">Type</th>
                  <th className="py-1 text-end font-medium">Size compared</th>
                  <th className="py-1 text-end font-medium">Median annual rent*</th>
                  <th className="py-1 text-end font-medium">Contracts</th>
                </tr>
              </thead>
              <tbody>
                {offPlanRents.map((r) => (
                  <tr key={r.rooms} className="border-b border-[var(--border)]">
                    <td className="py-1.5">{roomsLabel(r.rooms)}</td>
                    <td className="py-1.5 text-end">{sqft(r.sizeLow)} to {sqft(r.sizeHigh)}</td>
                    <td className="py-1.5 text-end">{formatMoney(r.median, currency)}</td>
                    <td className="py-1.5 text-end">{count(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <SourceNote source={SOURCES.dldRents} date={offPlanRents[0]?.to ?? periodEnd} estimate>
            * Estimate from other buildings in {b.community}, not rents of this building.
          </SourceNote>
        </section>
      )}

      <section className={`mt-8 grid gap-6 ${panel ? "" : "lg:grid-cols-2"}`}>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title="Median sale price per sq ft, by quarter" points={series.sales} unit="psf" countLabel="sales" currency={currency} />
          <SourceNote source={SOURCES.dldSales} date={periodEnd} />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title={`Median annual rent, by quarter${series.rentLevel === "project" ? " (whole project)" : series.rentLevel === "estimated" ? " (estimated)" : ""}`} points={series.rents} unit="aed" countLabel="contracts" currency={currency} />
          <SourceNote source={SOURCES.dldRents} date={periodEnd} />
        </div>
      </section>

      <section className={`mt-8 grid gap-6 ${panel ? "" : "lg:grid-cols-2"}`}>
        <MonthlyCostCalculator rows={summaries} periodEnd={periodEnd} currency={currency} />
        <GoldenVisaChecker rows={summaries} periodEnd={periodEnd} currency={currency} />
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Recent sales</h2>
        {sales.length ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 text-start font-medium">Date</th>
                  <th className="py-1 text-start font-medium">Type</th>
                  <th className="py-1 text-end font-medium">Size</th>
                  <th className="py-1 text-end font-medium">Price</th>
                  <th className="py-1 text-end font-medium">Per sq ft</th>
                  <th className="py-1 text-end font-medium"><Term id="off-plan">Status</Term></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="py-1.5">{day(s.txn_date)}</td>
                    <td className="py-1.5">{s.rooms == null ? "–" : roomsLabel(s.rooms)}</td>
                    <td className="py-1.5 text-end">{sqft(s.size_sqft)}</td>
                    <td className="py-1.5 text-end">{formatMoney(s.price, currency)}</td>
                    <td className="py-1.5 text-end">{count(convertFromAed(s.price_psf, currency))}</td>
                    <td className="py-1.5 text-end">{s.off_plan == null ? "–" : s.off_plan ? "Off-plan" : "Ready"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-[var(--muted)]">No counted sales.</p>}
        <SourceNote source={SOURCES.dldSales} date={periodEnd}>Market fields only; unit numbers and parties are never shown.</SourceNote>
      </section>

      <section className={`mt-8 grid gap-6 ${panel ? "" : "lg:grid-cols-[1fr_1fr]"}`}>
        <div>
          <h2 className="text-base font-semibold">Nearby</h2>
          <div className="mt-2"><NearbyPanel places={places} placed={placed} /></div>
        </div>
        {/* In the panel the big map behind already shows the building, highlighted. */}
        {!panel && (
          <div className="h-72 overflow-hidden rounded-lg border border-[var(--border)] lg:h-auto lg:min-h-72">
            {placed ? <BuildingMap focus={{ lng: b.lng!, lat: b.lat! }} currency={currency} controls="legend" /> : <div className="flex h-full items-center justify-center p-4 text-sm text-[var(--muted)]">Map position not confirmed yet.</div>}
          </div>
        )}
      </section>

      {placed && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">How far to key places</h2>
          <div className="mt-2"><KeyDistances lng={b.lng!} lat={b.lat!} places={places} /></div>
        </section>
      )}

      <section className={`mt-8 grid gap-3 ${panel ? "" : "sm:grid-cols-2"}`}>
        <Link href={`/tools/fair-price?building=${b.slug}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
          <div className="font-medium">Is an asking price fair here?</div>
          <p className="mt-1 text-sm text-[var(--muted)]">Check it against recent sales in {b.name_en}.</p>
        </Link>
        <Link href={`/tools/rent-increase?building=${b.slug}`} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent)]">
          <div className="font-medium">Renewing a lease here?</div>
          <p className="mt-1 text-sm text-[var(--muted)]">See the most the rent can go up.</p>
        </Link>
      </section>

      {siblings.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Other buildings in {b.project}</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {siblings.map((s) => <li key={s.slug}><Link className="link" href={`/building/${s.slug}`}>{s.name_en}</Link></li>)}
          </ul>
        </section>
      )}

      <section className="mt-8 text-xs text-[var(--muted)]">
        <h2 className="text-sm font-semibold text-[var(--fg)]">About this page</h2>
        <p className="mt-1">
          {METHOD_TEXT[b.match_method ?? "name"] ?? METHOD_TEXT.name}. Names seen in DLD files: {b.aliases.slice(0, 6).join(", ")}.
          {b.geom_source ? ` ${POSITION_TEXT[b.geom_source] ?? ""}` : " Not on the map yet."}
          {" "}Something wrong? Building pages are hand-checked first in Dubai Marina, JVC and Business Bay.
        </p>
      </section>
    </main>
  );
}
