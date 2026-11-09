import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import BuildingMap from "@/components/BuildingMap";
import LineChart from "@/components/LineChart";
import NoData from "@/components/NoData";
import RoomsTable from "@/components/RoomsTable";
import SourceNote from "@/components/SourceNote";
import Stat from "@/components/Stat";
import { launchCommunity } from "@/lib/communities";
import { hasDatabase } from "@/lib/db";
import { aedShort, count, pct, psf } from "@/lib/format";
import { communityBuildings, communityByCode, communitySeries, communitySummaries } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";
import { change } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

type Feature = { properties: { code?: string; name: string }; geometry: { type: string; coordinates: unknown } };

/** Name and bounding box from the bundled Dubai Municipality polygons, so the page works before data loads. */
async function polygon(code: string): Promise<{ name: string; bounds: [[number, number], [number, number]] } | null> {
  const file = path.join(process.cwd(), "public", "data", "dubai_communities.geojson");
  const geo = JSON.parse(await fs.readFile(file, "utf8")) as { features: Feature[] };
  const f = geo.features.find((x) => String(x.properties.code) === code);
  if (!f) return null;
  const pts: number[][] = [];
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") pts.push(c as number[]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(f.geometry.coordinates);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { name: f.properties.name, bounds: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]] };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const p = await polygon(code);
  return { title: p?.name ?? "Community" };
}

export default async function Page({ params }: Params) {
  const { code } = await params;
  const poly = await polygon(code);
  const c = hasDatabase() ? await communityByCode(code) : null;
  if (!poly && !c) notFound();
  const title = c?.name_common ?? c?.name_official ?? poly!.name;
  const official = c?.name_official ?? poly?.name ?? "";

  if (!c) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="mt-4"><NoData /></div>
      </main>
    );
  }
  const [summaries, series, buildings] = await Promise.all([communitySummaries(c.id), communitySeries(c.id), communityBuildings(c.id)]);
  const all = summaries.find((s) => s.rooms === -1);
  const plainYoy = change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m);
  const lfl = all?.like_for_like_change ?? null;
  const readyYoy = change(all?.sale_median_psf_ready_12m, all?.sale_median_psf_ready_prev_12m);
  const offplanYoy = change(all?.sale_median_psf_offplan_12m, all?.sale_median_psf_offplan_prev_12m);
  const scope = launchCommunity(code)?.scope;
  const yields = summaries.filter((s) => s.rooms >= 0 && s.gross_yield != null).map((s) => s.gross_yield!).sort((a, b) => a - b);
  const midYield = yields.length ? yields[Math.floor((yields.length - 1) / 2)] : null;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <nav className="text-xs text-[var(--muted)]"><Link className="link" href="/">Map</Link> / Communities</nav>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      {official !== title && <p className="text-sm text-[var(--muted)]">Official community name: {official} (DM {code})</p>}
      {scope && <p className="mt-2 max-w-2xl text-sm">{scope}</p>}

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Median price per sq ft" value={psf(all?.sale_median_psf_12m)} note={`${count(all?.sale_count_12m ?? 0)} apartment sales in 12 months`} />
        {lfl != null ? (
          <Stat label="Change on a year earlier" value={pct(lfl, 1, true)} note={`Same towers (${count(all?.like_for_like_towers ?? 0)}), per sq ft`} />
        ) : (
          <Stat label="Change on a year earlier" value={pct(plainYoy, 1, true)} note="Median per sq ft" />
        )}
        <Stat label="Median annual rent" value={aedShort(all?.rent_median_12m)} note={`${count(all?.rent_count_12m ?? 0)} contracts, all bedroom types`} />
        <Stat label="Gross yield (estimate)" value={pct(midYield)} note="Median across bedroom types" />
      </section>
      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={all?.period_end} estimate>
        Apartments only; 12 months to the newest sale.
        {lfl != null && plainYoy != null && ` The area median itself moved ${pct(plainYoy, 1, true)}, partly because the mix of towers and off-plan sales changed; the same-tower figure compares each tower with itself.`}
      </SourceNote>

      {(all?.sale_count_ready_12m || all?.sale_count_offplan_12m) ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold">Ready and off-plan, last 12 months</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Ready, median per sq ft" value={psf(all?.sale_median_psf_ready_12m)} note={`${count(all?.sale_count_ready_12m ?? 0)} sales; ${pct(readyYoy, 1, true)} on a year earlier`} />
            <Stat label="Off-plan, median per sq ft" value={psf(all?.sale_median_psf_offplan_12m)} note={`${count(all?.sale_count_offplan_12m ?? 0)} sales; ${pct(offplanYoy, 1, true)} on a year earlier`} />
          </div>
          <SourceNote source={SOURCES.dldSales} date={all?.period_end}>Off-plan = sold by the developer before completion (DLD registration type).</SourceNote>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-semibold">By bedroom type, last 12 months</h2>
        <div className="mt-2"><RoomsTable rows={summaries} showSize={false} /></div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title="Median sale price per sq ft, by quarter" points={series.sales} unit="psf" countLabel="sales" />
          <SourceNote source={SOURCES.dldSales} date={all?.period_end} />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title="Median annual rent, by quarter" points={series.rents} unit="aed" countLabel="contracts" />
          <SourceNote source={SOURCES.dldRents} date={all?.period_end} />
        </div>
      </section>

      {poly && (
        <section className="mt-8 h-80 overflow-hidden rounded-lg border border-[var(--border)]">
          <BuildingMap bounds={poly.bounds} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-base font-semibold">Buildings ({buildings.length})</h2>
        {buildings.length ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 text-start font-medium">Building</th>
                  <th className="py-1 text-end font-medium">Sales, 12 mo</th>
                  <th className="py-1 text-end font-medium">Per sq ft</th>
                  <th className="py-1 text-end font-medium">Median rent / yr</th>
                  <th className="py-1 text-end font-medium">Gross yield*</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.slug} className="border-b border-[var(--border)]">
                    <td className="py-1.5"><Link className="link" href={`/building/${b.slug}`}>{b.name_en}</Link></td>
                    <td className="py-1.5 text-end">{count(b.sale_count_12m ?? 0)}</td>
                    <td className="py-1.5 text-end">{psf(b.sale_median_psf_12m)}</td>
                    <td className="py-1.5 text-end">
                      {aedShort(b.rent_median_12m)}
                      {b.rent_median_12m != null && b.rent_level === "project" && <span className="text-xs text-[var(--muted)]"> project</span>}
                      {b.rent_median_12m != null && b.rent_level === "estimated" && <span className="text-xs text-[var(--muted)]"> est.</span>}
                    </td>
                    <td className="py-1.5 text-end">{pct(b.gross_yield)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-[var(--muted)]">No buildings matched here yet.</p>}
        <SourceNote source={SOURCES.dldSales} date={all?.period_end} estimate>* Yield is an estimate, shown only where the rent it comes from is shown. “project” = rents for the whole project, because DLD rent contracts name the project, not the tower; “est.” = some rents placed in the tower by unit size.</SourceNote>
      </section>
      <p className="mt-6 text-xs text-[var(--muted)]">Boundary: {SOURCES.dm}.</p>
    </main>
  );
}
