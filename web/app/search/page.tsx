import Link from "next/link";
import NoData from "@/components/NoData";
import SearchBox from "@/components/SearchBox";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { formatPsf } from "@/lib/format";
import { search } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: 'Search', description: 'Search Dubai buildings and communities.', path: '/search', noindex: true });

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const currency = await getServerCurrency();
  const results = hasDatabase() && q.trim().length >= 2 ? await search(q.slice(0, 80), 40) : [];
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Search{q ? `: “${q}”` : ""}</h1>
      <div className="mt-3 max-w-md"><SearchBox placeholder="Search a building or area" /></div>
      {!hasDatabase() ? <div className="mt-4"><NoData /></div> : results.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">No matches. Try part of the building name, for example “Marina Gate” or “Bloom”.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)] text-sm">
          {results.map((r) => (
            <li key={`${r.kind}-${r.slug}`} className="flex items-baseline justify-between gap-2 py-2">
              <Link className="link" href={r.kind === "building" ? `/building/${r.slug}` : `/community/${r.slug}`}>{r.name}</Link>
              <span className="text-xs text-[var(--muted)]">{r.kind === "community" ? "Area" : `${r.community ?? ""}${r.psf ? ` · ${formatPsf(r.psf, currency)}` : ""}`}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
