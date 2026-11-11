import BuildingMap from "@/components/BuildingMap";
import SearchBox from "@/components/SearchBox";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import NoData from "@/components/NoData";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  if (!hasDatabase()) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Explore the map</h1>
        <div className="mt-4"><NoData /></div>
      </main>
    );
  }
  const currency = await getServerCurrency();
  return (
    <main className="relative h-[70dvh] min-h-[420px] w-full">
      <BuildingMap currency={currency} />
      <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center">
        <div className="pointer-events-auto w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 p-4 shadow-sm">
          <h1 className="text-lg font-semibold">Explore the map</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Tap or hover a building to see its details. Prices, rents and yields from official Dubai Land Department data.</p>
          <div className="mt-3"><SearchBox placeholder="Try “Princess Tower” or “JVC”" autoFocus={false} /></div>
        </div>
      </div>
    </main>
  );
}
