import LaunchAreaCards from "@/components/LaunchAreaCards";
import NoData from "@/components/NoData";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import Link from "next/link";
import { areasWithBuildings, launchCommunities } from "@/lib/queries";
import { isLaunchCommunity } from "@/lib/communities";
import { count } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: 'Communities', description: 'Dubai communities with median sale price, rent and gross yield from Dubai Land Department data.', path: '/communities' });

async function loadCards() {
  if (!hasDatabase()) return null;
  try {
    return await launchCommunities();
  } catch {
    return null;
  }
}

async function loadMore() {
  if (!hasDatabase()) return [];
  try {
    return (await areasWithBuildings()).filter((a) => !isLaunchCommunity(a.dm_code));
  } catch {
    return [];
  }
}

export default async function Page() {
  const currency = await getServerCurrency();
  const cards = await loadCards();
  const more = await loadMore();
  const scope = LAUNCH_COMMUNITIES.find((c) => c.scope)?.scope;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Communities</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Three areas are checked by hand first: Dubai Marina, JVC and Business Bay. Sales and rents for the rest of Dubai are loaded, and more areas get their own pages as they are checked.
      </p>
      {cards && cards.length > 0 ? <LaunchAreaCards cards={cards} currency={currency} title="Areas covered today" /> : <div className="mt-6"><NoData /></div>}
      {more.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">More areas with building pages ({more.length})</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Matched automatically from DLD names and <strong className="font-medium text-[var(--fg)]">not yet hand-checked</strong>. Treat building names and map positions as unconfirmed. Sales counts are apartment sales in the last 12 months.</p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {more.map((a) => (
              <li key={a.dm_code} className="flex justify-between gap-3 border-b border-[var(--border)] py-1.5">
                <Link className="link" href={`/community/${a.dm_code}`}>{a.name}</Link>
                <span className="tabular-nums text-[var(--muted)]">{count(a.buildings)} bldgs · {count(a.sales)} sales</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">Source: DLD open data. Areas without building pages are not listed; their sales and rents are still loaded where the data was pushed.</p>
        </section>
      )}
      {scope && <p className="mt-4 max-w-2xl text-xs text-[var(--muted)]">Dubai Marina: {scope}</p>}
    </main>
  );
}
