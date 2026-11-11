import Link from "next/link";
import NoData from "@/components/NoData";
import SourceNote from "@/components/SourceNote";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { count, formatMoneyShort, formatPsf, pct, roomsLabel } from "@/lib/format";
import { exploreBuildings, parseFilters } from "@/lib/explore";
import { communityBuildings, communityByCode, launchCommunities, type BuildingListItem } from "@/lib/queries";
import { SOURCES } from "@/lib/sources";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: 'Buildings', description: 'Dubai buildings with median sale price, rent and gross yield from Dubai Land Department data.', path: '/buildings' });

const SORTS = {
  sales: { label: "Most sales", key: (b: BuildingListItem) => b.sale_count_12m },
  psf: { label: "Price per sq ft", key: (b: BuildingListItem) => b.sale_median_psf_12m },
  rent: { label: "Rent", key: (b: BuildingListItem) => b.rent_median_12m },
  yield: { label: "Gross yield", key: (b: BuildingListItem) => b.gross_yield },
} as const;
type SortId = keyof typeof SORTS;

type SP = { c?: string; sort?: string; q?: string; rooms?: string; maxPrice?: string; minYield?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  if (!hasDatabase()) {
    return <main className="mx-auto max-w-5xl p-4 sm:p-6"><h1 className="text-2xl font-semibold">Buildings</h1><div className="mt-4"><NoData /></div></main>;
  }
  const code = LAUNCH_COMMUNITIES.some((c) => c.code === sp.c) ? sp.c! : LAUNCH_COMMUNITIES[0].code;
  const sort: SortId = sp.sort && sp.sort in SORTS ? (sp.sort as SortId) : "sales";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const currency = await getServerCurrency();
  const community = await communityByCode(code);
  const filters = parseFilters(new URLSearchParams({ rooms: sp.rooms ?? "", maxPrice: sp.maxPrice ?? "", minYield: sp.minYield ?? "" }), code);
  const filtered = filters.rooms !== -1 || filters.maxPrice != null || filters.minYield != null;
  let filterFailed = false;
  const [rows, totals] = await Promise.all([
    filtered ? exploreBuildings(filters).catch(() => { filterFailed = true; return []; }) : community ? communityBuildings(community.id) : [],
    launchCommunities().catch(() => []),
  ]);
  const total = totals.find((t) => t.dm_code === code)?.buildings ?? rows.length;
  const periodEnd = totals.find((t) => t.dm_code === code)?.summary?.period_end ?? null;

  const needle = q.toLowerCase();
  const key = SORTS[sort].key;
  const shown = rows
    .filter((b) => !needle || b.name_en.toLowerCase().includes(needle))
    // Buildings with no figure for the chosen sort go last, in their original order.
    .sort((a, b) => (key(b) ?? -Infinity) - (key(a) ?? -Infinity) || 0);
  const href = (over: Partial<SP>) => {
    const p = new URLSearchParams({
      c: code, sort, ...(q ? { q } : {}),
      ...(sp.rooms ? { rooms: sp.rooms } : {}), ...(sp.maxPrice ? { maxPrice: sp.maxPrice } : {}), ...(sp.minYield ? { minYield: sp.minYield } : {}),
      ...over,
    });
    return `/buildings?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Buildings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Every building with enough DLD sales to get a page. Pick an area, then sort or filter by name.</p>

      <nav aria-label="Area" className="mt-5 flex flex-wrap gap-2">
        {LAUNCH_COMMUNITIES.map((c) => (
          <Link
            key={c.code}
            href={`/buildings?c=${c.code}&sort=${sort}`}
            aria-current={c.code === code ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-lg border px-4 text-sm ${c.code === code ? "border-[var(--accent)] bg-[var(--panel)] font-semibold" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="c" value={code} />
        <label className="min-w-0 flex-1 basis-48 font-medium">Name
          <input name="q" defaultValue={q} placeholder="Part of a building name" className="mt-1 min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-normal" />
        </label>
        <label className="font-medium">Bedrooms
          <select name="rooms" defaultValue={sp.rooms ?? ""} className="mt-1 block min-h-11 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-normal">
            <option value="">Any</option>
            {[0, 1, 2, 3, 4].map((r) => <option key={r} value={r}>{roomsLabel(r)}</option>)}
          </select>
        </label>
        <label className="font-medium">Typical price up to (AED)
          <input name="maxPrice" inputMode="numeric" defaultValue={sp.maxPrice ?? ""} placeholder="1,500,000" className="mt-1 min-h-11 w-40 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-normal" />
        </label>
        <label className="font-medium">Gross yield at least (%)
          <input name="minYield" inputMode="decimal" defaultValue={sp.minYield ?? ""} placeholder="7" className="mt-1 min-h-11 w-24 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-normal" />
        </label>
        <label className="font-medium">Sort by
          <select name="sort" defaultValue={sort} className="mt-1 block min-h-11 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-normal">
            {(Object.keys(SORTS) as SortId[]).map((id) => <option key={id} value={id}>{SORTS[id].label}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-md bg-[var(--accent)] px-5 font-medium text-white">Apply</button>
      </form>

      <p className="mt-4 text-sm text-[var(--muted)]" role="status">
        {filtered ? `${count(rows.length)} building${rows.length === 1 ? "" : "s"} match your filters${filters.rooms !== -1 ? ` for ${roomsLabel(filters.rooms).toLowerCase()}` : ""}. "Typical price" is the median sale price in the last 12 months. ` : rows.length < total ? `The ${count(rows.length)} buildings with the most sales, of ${count(total)}. ` : ""}
        {shown.length === rows.length ? "" : `${count(shown.length)} match “${q}”.`}
      </p>

      {shown.length ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm tabular-nums [&_td]:pe-3 [&_th]:pe-3">
            <thead className="text-xs text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="py-1 text-start font-medium">Building</th>
                <th className="py-1 text-end font-medium"><Link className="link" href={href({ sort: "sales" })}>Sales, 12 mo</Link></th>
                <th className="py-1 text-end font-medium"><Link className="link" href={href({ sort: "psf" })}>Per sq ft</Link></th>
                <th className="py-1 text-end font-medium"><Link className="link" href={href({ sort: "rent" })}>Median rent / yr</Link></th>
                <th className="py-1 text-end font-medium"><Link className="link" href={href({ sort: "yield" })}>Gross yield*</Link></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.slug} className="border-b border-[var(--border)]">
                  <td className="py-2"><Link className="link" href={`/building/${b.slug}`}>{b.name_en}</Link></td>
                  <td className="py-2 text-end">{count(b.sale_count_12m ?? 0)}</td>
                  <td className="py-2 text-end">{formatPsf(b.sale_median_psf_12m, currency)}</td>
                  <td className="py-2 text-end">
                    {formatMoneyShort(b.rent_median_12m, currency)}
                    {b.rent_median_12m != null && b.rent_level === "project" && <span className="text-xs text-[var(--muted)]"> project</span>}
                    {b.rent_median_12m != null && b.rent_level === "estimated" && <span className="text-xs text-[var(--muted)]"> est.</span>}
                  </td>
                  <td className="py-2 text-end">{pct(b.gross_yield)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="mt-4 text-sm text-[var(--muted)]">{filterFailed ? "The filters could not be applied just now. Please try again." : filtered ? "No buildings match those filters. Try a higher price or a lower yield." : "No buildings match that name."}</p>}

      <SourceNote source={`${SOURCES.dldSales}; ${SOURCES.dldRents}`} date={periodEnd} estimate>
        * Gross yield is an estimate, shown only where the rent it comes from is shown. “project” = rents for the whole project, because DLD rent contracts name the project, not the tower; “est.” = some rents placed in the tower by unit size. A dash means too few deals for a median.
      </SourceNote>
    </main>
  );
}
