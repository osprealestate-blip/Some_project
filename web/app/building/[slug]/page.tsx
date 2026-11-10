import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BuildingMap from "@/components/BuildingMap";
import LineChart from "@/components/LineChart";
import KeyDistances from "@/components/KeyDistances";
import NearbyPanel from "@/components/NearbyPanel";
import NoData from "@/components/NoData";
import RoomsTable from "@/components/RoomsTable";
import SourceNote from "@/components/SourceNote";
import Stat from "@/components/Stat";
import { hasDatabase } from "@/lib/db";
import { aed, aedShort, count, day, pct, psf, roomsLabel, sqft } from "@/lib/format";
import {
  buildingBySlug, buildingSeries, buildingSummaries, nearbyPlaces, recentSales, siblingBuildings,
} from "@/lib/queries";
import { SOURCES } from "@/lib/sources";
import { change } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!hasDatabase()) return { title: "Building" };
  const b = await buildingBySlug(slug).catch(() => null);
  return b ? { title: `${b.name_en}, ${b.community}`, description: `Sale prices, rents and yields for ${b.name_en} in ${b.community}, from DLD data.` } : { title: "Building" };
}

const METHOD_TEXT: Record<string, string> = {
  land_number: "DLD sales matched by name, confirmed by the DLD plot number",
  land_number_tower: "DLD sales matched by name; tower picked on a shared DLD plot",
  land_number_plot: "DLD sales matched by name to a DLD plot with several towers",
  name: "DLD sales matched by building name",
  manual: "Checked by hand",
};

const POSITION_TEXT: Record<string, string> = {
  osm: "Map position from OpenStreetMap.",
  manual: "Map position placed by hand.",
  plot: "Approximate map position: another tower on the same plot.",
  project: "Approximate map position: another tower of the same project.",
  site: "Approximate map position: the development's site in OpenStreetMap.",
};

export default async function Page({ params }: Params) {
  const { slug } = await params;
  if (!hasDatabase()) {
    return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 className="text-xl font-semibold">Building</h1><div className="mt-4"><NoData /></div></main>;
  }
  const b = await buildingBySlug(slug);
  if (!b) notFound();
  const [summaries, series, sales, places, siblings] = await Promise.all([
    buildingSummaries(b.id), buildingSeries(b), recentSales(b.id), nearbyPlaces(b), siblingBuildings(b),
  ]);
  const all = summaries.find((s) => s.rooms === -1);
  const yoy = change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m);
  const yields = summaries.filter((s) => s.rooms >= 0 && s.gross_yield != null).map((s) => s.gross_yield!).sort((a, c) => a - c);
  const midYield = yields.length ? yields[Math.floor((yields.length - 1) / 2)] : null;
  const rentLevel = all?.rent_level ?? series.rentLevel;
  const periodEnd = all?.period_end ?? null;
  const placed = b.lng != null && b.lat != null;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <nav className="text-xs text-[var(--muted)]">
        <Link className="link" href="/">Map</Link> /{" "}
        {b.dm_code ? <Link className="link" href={`/community/${b.dm_code}`}>{b.community}</Link> : b.community}
      </nav>
      <h1 className="mt-1 text-2xl font-semibold">{b.name_en}</h1>
      <p className="text-sm text-[var(--muted)]">
        {b.community}{b.community !== b.community_official ? ` (${b.community_official})` : ""}
        {b.project && b.project.toLowerCase() !== b.name_en.toLowerCase() ? ` · Project: ${b.project}` : ""}
        {b.floors ? ` · ${b.floors} floors` : ""}
        {b.unit_count ? ` · ${count(b.unit_count)} units` : ""}
      </p>

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Median price per sq ft" value={psf(all?.sale_median_psf_12m)} note={`${count(all?.sale_count_12m ?? 0)} sales in 12 months`} />
        <Stat label="Change on a year earlier" value={pct(yoy, 1, true)} note="Median per sq ft" />
        <Stat label="Median annual rent" value={aedShort(all?.rent_median_12m)} note={rentLevel === "project" ? "Whole project (rents are filed per project)" : rentLevel === "estimated" ? `Estimated: ${count(all?.rent_count_12m ?? 0)} contracts, some placed by unit size` : `${count(all?.rent_count_12m ?? 0)} contracts`} />
        <Stat label="Gross yield (estimate)" value={pct(midYield)} note="Median across bedroom types" />
      </section>
      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={periodEnd} estimate>
        Apartments only; 12 months to the newest sale. Gross yield = median rent ÷ median price, same bedroom type.
      </SourceNote>

      <section className="mt-8">
        <h2 className="text-base font-semibold">By bedroom type, last 12 months</h2>
        <div className="mt-2"><RoomsTable rows={summaries} /></div>
        <p className="mt-1 text-xs text-[var(--muted)]">* Estimate. Rows need 3 or more deals for a median.{rentLevel === "project" ? " Rents are for the whole project, because DLD rent contracts name the project, not the tower." : ""}{rentLevel === "estimated" ? " Rent contracts do not name the tower, so some were placed in this building because their exact size and bedrooms match flats sold here and in no other tower nearby. Estimated." : ""}</p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title="Median sale price per sq ft, by quarter" points={series.sales} unit="psf" countLabel="sales" />
          <SourceNote source={SOURCES.dldSales} date={periodEnd} />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title={`Median annual rent, by quarter${series.rentLevel === "project" ? " (whole project)" : series.rentLevel === "estimated" ? " (estimated)" : ""}`} points={series.rents} unit="aed" countLabel="contracts" />
          <SourceNote source={SOURCES.dldRents} date={periodEnd} />
        </div>
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
                  <th className="py-1 text-end font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="py-1.5">{day(s.txn_date)}</td>
                    <td className="py-1.5">{s.rooms == null ? "–" : roomsLabel(s.rooms)}</td>
                    <td className="py-1.5 text-end">{sqft(s.size_sqft)}</td>
                    <td className="py-1.5 text-end">{aed(s.price)}</td>
                    <td className="py-1.5 text-end">{Math.round(s.price_psf).toLocaleString("en-AE")}</td>
                    <td className="py-1.5 text-end">{s.off_plan == null ? "–" : s.off_plan ? "Off-plan" : "Ready"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-[var(--muted)]">No counted sales.</p>}
        <SourceNote source={SOURCES.dldSales} date={periodEnd}>Market fields only; unit numbers and parties are never shown.</SourceNote>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-base font-semibold">Nearby</h2>
          <div className="mt-2"><NearbyPanel places={places} placed={placed} /></div>
        </div>
        <div className="h-72 overflow-hidden rounded-lg border border-[var(--border)] lg:h-auto lg:min-h-72">
          {placed ? <BuildingMap focus={{ lng: b.lng!, lat: b.lat! }} /> : <div className="flex h-full items-center justify-center p-4 text-sm text-[var(--muted)]">Map position not confirmed yet.</div>}
        </div>
      </section>

      {placed && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">How far to key places</h2>
          <div className="mt-2"><KeyDistances lng={b.lng!} lat={b.lat!} places={places} /></div>
        </section>
      )}

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
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
