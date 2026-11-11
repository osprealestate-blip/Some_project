import Link from "next/link";
import NoData from "@/components/NoData";
import SourceNote from "@/components/SourceNote";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { count, day, formatPsf, formatShortPrice, pct } from "@/lib/format";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { dataFreshness, offPlanProjects, type OffPlanProject } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";
import { SOURCES } from "@/lib/sources";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Off-plan projects",
  description: "Dubai off-plan towers by recorded sales: how many units sold, at what price per sq ft, with status from Dubai Land Department data.",
  path: "/off-plan",
});

const STATUS: Record<string, string> = { ACTIVE: "Under construction", FINISHED: "Completed", NOT_STARTED: "Not started", PENDING: "Pending" };

function Row({ p, currency }: { p: OffPlanProject; currency: Awaited<ReturnType<typeof getServerCurrency>> }) {
  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-base font-semibold"><Link href={`/building/${p.slug}`} className="hover:text-[var(--accent)] hover:underline">{p.name_en}</Link></h3>
        <span className="text-xs text-[var(--muted)]">{p.community}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-[var(--muted)]">Off-plan sales, 12 months</dt><dd className="tabular-nums">{count(p.sales_12m)}</dd></div>
        <div><dt className="text-xs text-[var(--muted)]">Median price per sq ft</dt><dd className="tabular-nums">{formatPsf(p.median_psf, currency)}</dd></div>
        <div><dt className="text-xs text-[var(--muted)]">Median sale price</dt><dd className="tabular-nums">{formatShortPrice(p.median_price, currency)}</dd></div>
        <div><dt className="text-xs text-[var(--muted)]">Latest sale</dt><dd>{day(p.last_sale)}</dd></div>
      </dl>
      {(p.developer || p.dld_status || p.percent_completed != null || p.completion_date) && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          {p.developer ? <>Developer: {p.developer}. </> : null}
          {p.dld_status ? <>Status: {STATUS[p.dld_status] ?? p.dld_status}. </> : null}
          {p.percent_completed != null ? <>{pct(p.percent_completed / 100, 0)} built. </> : null}
          {p.completion_date ? <>Completion date on file: {day(p.completion_date)}. </> : null}
          Source: DLD Projects open data.
        </p>
      )}
    </li>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const code = LAUNCH_COMMUNITIES.some((c) => c.code === area) ? area! : null;
  const currency = await getServerCurrency();
  let rows: OffPlanProject[] = [];
  let failed = false;
  let asOf: string | null = null;
  if (hasDatabase()) {
    try {
      [rows, asOf] = await Promise.all([offPlanProjects(code), dataFreshness().then((f) => f.period_end)]);
    } catch {
      failed = true;
    }
  }
  const chip = (href: string, label: string, on: boolean) => (
    <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] hover:border-[var(--accent)]"}`}>{label}</Link>
  );
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Off-plan projects</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Towers that are still being built, ranked by how many apartments were recorded as sold off-plan in the last 12 months.
        Off-plan prices are the contract price at registration; the building is not finished and nothing here is an offer.
      </p>
      <nav aria-label="Area" className="mt-5 flex flex-wrap gap-2">
        {chip("/off-plan", "All launch areas", code === null)}
        {LAUNCH_COMMUNITIES.map((c) => chip(`/off-plan?area=${c.code}`, c.label, code === c.code))}
      </nav>
      {!hasDatabase() ? <div className="mt-6"><NoData /></div> : failed ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Off-plan data could not be loaded just now. Please try again in a moment.</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">No tower in this area has 3 or more off-plan sales in the last 12 months.</p>
      ) : (
        <ul className="mt-6 grid gap-3">{rows.map((p) => <Row key={p.slug} p={p} currency={currency} />)}</ul>
      )}
      <SourceNote source={`${SOURCES.dldSales}; DLD Projects open data for developer, status and completion`} date={asOf} estimate>
        Apartments only. A tower needs at least 3 off-plan sales to be listed. Completion dates are as filed with the DLD and can change.
      </SourceNote>
    </main>
  );
}
