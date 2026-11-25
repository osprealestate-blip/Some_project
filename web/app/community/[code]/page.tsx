import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import BuildingMap from "@/components/LazyBuildingMap";
import LineChart from "@/components/LineChart";
import NoData from "@/components/NoData";
import RoomsTable from "@/components/RoomsTable";
import SourceNote from "@/components/SourceNote";
import KeyTerms from "@/components/KeyTerms";
import DataBadge from "@/components/DataBadge";
import Stat from "@/components/Stat";
import ViewToggle from "@/components/ViewToggle";
import Term from "@/components/Term";
import { getConversionNote } from "@/config/currency";
import { launchCommunity } from "@/lib/communities";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { count, formatMoneyShort, formatPsf, pct } from "@/lib/format";
import ConstructionProjects from "@/components/ConstructionProjects";
import { communityBuildings, communityByCode, communitySeries, communitySummaries, constructionProjects, freshnessStamps, matchCoverage } from "@/lib/queries";
import { coverageLines } from "@/lib/matchCoverage";
import CoverageNotice from "@/components/CoverageNotice";
import { EMPTY_TEXT, evidenceState } from "@/lib/coverage";
import LatestSales from "@/components/LatestSales";
import MasterCommunityPage from "@/components/MasterCommunityPage";
import { masterDescription, masterSlug, masterTitle } from "@/lib/masterCommunities";
import { mastersInArea, resolveMaster } from "@/lib/masterQueries";
import { pageMetadata } from "@/lib/seo";
import { clustersInCommunity } from "@/lib/villaClusterQueries";
import { CLUSTER_KIND_LABEL } from "@/lib/villaCluster";
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

/** /community/392 is an official Dubai Municipality area; /community/dubai-marina is a master community (the groups people search for). */
const isOfficialCode = (code: string) => /^\d{1,4}$/.test(code);

async function masterFor(code: string): Promise<string | null> {
  if (!hasDatabase()) return null;
  try { return await resolveMaster(code); } catch { return null; }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  if (!isOfficialCode(code)) {
    const name = await masterFor(code);
    if (!name) return { title: "Community" };
    return pageMetadata({ title: masterTitle(name), description: masterDescription(name), path: `/community/${masterSlug(name)}` });
  }
  const p = await polygon(code);
  if (!p) return { title: "Community" };
  const label = launchCommunity(code)?.label ?? p.name;
  return pageMetadata({ title: label, description: `Sale prices, rents and yields across ${label}, from Dubai Land Department data.`, path: `/community/${code}` });
}

export default async function Page({ params }: Params) {
  const { code } = await params;
  if (isOfficialCode(code)) return <OfficialAreaPage code={code} />;
  const name = await masterFor(code);
  if (!name) notFound();
  if (masterSlug(name) !== code) permanentRedirect(`/community/${masterSlug(name)}`); // /community/jvc -> /community/jumeirah-village-circle
  return <MasterCommunityPage name={name} />;
}

async function OfficialAreaPage({ code }: { code: string }) {
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
  const currency = await getServerCurrency();
  const conversionNote = getConversionNote(currency);
  const [summaries, series, buildings, sites, coverage, clusters] = await Promise.all([communitySummaries(c.id), communitySeries(c.id), communityBuildings(c.id), constructionProjects(code), matchCoverage(c.id).catch(() => null), clustersInCommunity(code).catch(() => [])]);
  const stamps = await freshnessStamps();
  const masters = await mastersInArea(code).catch(() => [] as string[]);
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
      <nav className="text-xs text-[var(--muted)]"><Link className="link" href="/map">Map</Link> / <Link className="link" href="/communities">Communities</Link></nav>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      {official !== title && <p className="text-sm text-[var(--muted)]">Official community name: {official} (DM {code})</p>}
      {masters.length > 0 && (
        <p className="mt-1 text-sm text-[var(--muted)]">
          Official area. The communities people search for inside it:{" "}
          {masters.map((m, i) => <span key={m}>{i > 0 && ", "}<Link className="link" href={`/community/${masterSlug(m)}`}>{m}</Link></span>)}.
        </p>
      )}
      {scope && <p className="mt-2 max-w-2xl text-sm">{scope}</p>}
      <DataBadge saleCount={all?.sale_count_12m} periodEnd={all?.period_end} />
      <CoverageNotice dmCode={code} stamps={stamps} />
      {evidenceState(all?.sale_count_12m) !== "ok" && (
        <p className="mt-2 rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">{evidenceState(all?.sale_count_12m) === "none" ? EMPTY_TEXT.noSales : EMPTY_TEXT.thinSales}</p>
      )}
      <ViewToggle />

      <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat term="price-per-sq-ft" label="Median price per sq ft" value={formatPsf(all?.sale_median_psf_12m, currency)} note={`${count(all?.sale_count_12m ?? 0)} apartment sales in 12 months`} />
        {lfl != null ? (
          <Stat label="Change on a year earlier" value={pct(lfl, 1, true)} note={`Same towers (${count(all?.like_for_like_towers ?? 0)}), per sq ft`} />
        ) : (
          <Stat label="Change on a year earlier" value={pct(plainYoy, 1, true)} note="Median per sq ft" />
        )}
        <Stat label="Median annual rent" value={formatMoneyShort(all?.rent_median_12m, currency)} note={`${count(all?.rent_count_12m ?? 0)} contracts, all bedroom types`} />
        <Stat term="gross-yield" label="Gross yield (estimate)" value={pct(midYield)} note="Median across bedroom types" />
      </section>
      {conversionNote && <p className="mt-2 text-xs text-[var(--muted)]">{conversionNote}</p>}
      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={all?.period_end} estimate>
        Apartments only; 12 months to the newest sale.
        {lfl != null && plainYoy != null && ` The area median itself moved ${pct(plainYoy, 1, true)}, partly because the mix of towers and off-plan sales changed; the same-tower figure compares each tower with itself.`}
      </SourceNote>
      {coverageLines(coverage).length > 0 && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          <strong className="font-medium text-[var(--fg)]">Coverage, last 12 months.</strong> {coverageLines(coverage).join(" ")} Records not tied to a building still count in the area figures above.
        </p>
      )}
      <KeyTerms />

      {(all?.sale_count_ready_12m || all?.sale_count_offplan_12m) ? (
        <section className="adv-only mt-6">
          <h2 className="text-base font-semibold">Ready and off-plan, last 12 months</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat term="off-plan" label="Ready, median per sq ft" value={formatPsf(all?.sale_median_psf_ready_12m, currency)} note={`${count(all?.sale_count_ready_12m ?? 0)} sales; ${pct(readyYoy, 1, true)} on a year earlier`} />
            <Stat term="off-plan" label="Off-plan, median per sq ft" value={formatPsf(all?.sale_median_psf_offplan_12m, currency)} note={`${count(all?.sale_count_offplan_12m ?? 0)} sales; ${pct(offplanYoy, 1, true)} on a year earlier`} />
          </div>
          <SourceNote source={SOURCES.dldSales} date={all?.period_end}>Off-plan = sold by the developer before completion (DLD registration type).</SourceNote>
        </section>
      ) : null}

      <section className="adv-only mt-8">
        <h2 className="text-base font-semibold">By bedroom type, last 12 months</h2>
        <div className="mt-2"><RoomsTable rows={summaries} showSize={false} currency={currency} /></div>
      </section>

      <section className="adv-only mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title="Median sale price per sq ft, by quarter" points={series.sales} unit="psf" countLabel="sales" currency={currency} />
          <SourceNote source={SOURCES.dldSales} date={all?.period_end} />
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
          <LineChart title="Median annual rent, by quarter" points={series.rents} unit="aed" countLabel="contracts" currency={currency} />
          <SourceNote source={SOURCES.dldRents} date={all?.period_end} />
        </div>
      </section>

      {poly && (
        <section className="mt-8 h-80 overflow-hidden rounded-lg border border-[var(--border)]">
          <BuildingMap bounds={poly.bounds} currency={currency} />
        </section>
      )}

      {clusters.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Villa and townhouse clusters</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">One map point per project, at its centre. Sales are counted for the whole project, never for a single villa.</p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {clusters.map((v) => (
              <li key={v.slug} className="flex justify-between gap-3">
                <span className="min-w-0"><Link className="link" href={`/villas/${v.slug}`}>{v.name}</Link> <span className="text-xs text-[var(--muted)]">{CLUSTER_KIND_LABEL[v.kind]}</span></span>
                <span className="shrink-0 tabular-nums text-[var(--muted)]">{count(v.sales)} sales{v.psf ? ` · ${formatPsf(v.psf, currency)}` : ""}</span>
              </li>
            ))}
          </ul>
          <SourceNote source={SOURCES.dldSales} date={all?.period_end}>Last 12 months, matched to each project by its Dubai Land Department project name.</SourceNote>
        </section>
      )}

      {buildings.length > 0 && (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <h2 className="text-base font-semibold">Most traded buildings</h2>
            <ol className="mt-2 space-y-1 text-sm">
              {[...buildings].filter((b) => (b.sale_count_12m ?? 0) > 0).sort((a, b) => (b.sale_count_12m ?? 0) - (a.sale_count_12m ?? 0)).slice(0, 5).map((b) => (
                <li key={b.slug} className="flex justify-between gap-3"><Link className="link" href={`/building/${b.slug}`}>{b.name_en}</Link><span className="tabular-nums text-[var(--muted)]">{count(b.sale_count_12m ?? 0)} sales</span></li>
              ))}
            </ol>
            <SourceNote source={SOURCES.dldSales} date={all?.period_end}>Ranked by recorded sales in the last 12 months. More sales means more data behind the figures, not a better building.</SourceNote>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <h2 className="text-base font-semibold">What matters most to you?</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Open this area on the map coloured by what you care about.</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {[["Value for money", "psf"], ["Rental return", "yield"], ["Most active", "sales"], ["Price movement", "change"]].map(([label, m]) => (
                <li key={m}><Link className="inline-block rounded-full border border-[var(--border)] px-3 py-1.5 hover:bg-[var(--grid)]" href={`/map?f=area:${code}${m === "psf" ? "" : `&m=${m}`}`}>{label}</Link></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <ConstructionProjects rows={sites} />

      <section className="mt-8">
        <h2 className="text-base font-semibold">Buildings ({buildings.length})</h2>
        {buildings.length ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
              <thead className="text-xs text-[var(--muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-1 text-start font-medium">Building</th>
                  <th className="py-1 text-end font-medium">Sales, 12 mo</th>
                  <th className="py-1 text-end font-medium"><Term id="price-per-sq-ft">Per sq ft</Term></th>
                  <th className="py-1 text-end font-medium">Median rent / yr</th>
                  <th className="py-1 text-end font-medium"><Term id="gross-yield">Gross yield</Term>*</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.slug} className="border-b border-[var(--border)]">
                    <td className="py-1.5"><Link className="link" href={`/building/${b.slug}`}>{b.name_en}</Link></td>
                    <td className="py-1.5 text-end">{count(b.sale_count_12m ?? 0)}</td>
                    <td className="py-1.5 text-end">{formatPsf(b.sale_median_psf_12m, currency)}</td>
                    <td className="py-1.5 text-end">
                      {formatMoneyShort(b.rent_median_12m, currency)}
                      {b.rent_median_12m != null && b.rent_level === "project" && <span className="text-xs text-[var(--muted)]"> project</span>}
                      {b.rent_median_12m != null && b.rent_level === "estimated" && <span className="text-xs text-[var(--muted)]"> est.</span>}
                    </td>
                    <td className="py-1.5 text-end">{pct(b.gross_yield)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-[var(--muted)]">{EMPTY_TEXT.noBuildings}</p>}
        <SourceNote source={SOURCES.dldSales} date={all?.period_end} estimate>* Yield is an estimate, shown only where the rent it comes from is shown. “project” = rents for the whole project, because DLD rent contracts name the project, not the tower; “est.” = some rents placed in the tower by unit size.</SourceNote>
      </section>

      {buildings.length > 0 && <LatestSales scope={{ area: code }} currency={currency} periodEnd={all?.period_end} />}

      <p className="mt-6 text-xs text-[var(--muted)]">Boundary: {SOURCES.dm}.</p>
    </main>
  );
}
