import LaunchAreaCards from "@/components/LaunchAreaCards";
import NoData from "@/components/NoData";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { LAUNCH_COMMUNITIES } from "@/lib/communities";
import { launchCommunities } from "@/lib/queries";
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

export default async function Page() {
  const currency = await getServerCurrency();
  const cards = await loadCards();
  const scope = LAUNCH_COMMUNITIES.find((c) => c.scope)?.scope;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Communities</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Three areas are checked by hand first: Dubai Marina, JVC and Business Bay. Sales and rents for the rest of Dubai are loaded, and more areas get their own pages as they are checked.
      </p>
      {cards && cards.length > 0 ? <LaunchAreaCards cards={cards} currency={currency} title="Areas covered today" /> : <div className="mt-6"><NoData /></div>}
      {scope && <p className="mt-4 max-w-2xl text-xs text-[var(--muted)]">Dubai Marina: {scope}</p>}
    </main>
  );
}
