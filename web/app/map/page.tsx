import type { Metadata } from "next";
import BuildingMap from "@/components/BuildingMap";
import MapStart from "@/components/MapStart";
import MapTour from "@/components/MapTour";
import SearchBox from "@/components/SearchBox";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import NoData from "@/components/NoData";

import { buildingBySlug } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** A shared building link (/map?building=slug) is titled with the building, so the preview says what it opens. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ building?: string }> }): Promise<Metadata> {
  const { building } = await searchParams;
  if (!building || !hasDatabase()) return {};
  const b = await buildingBySlug(building).catch(() => null);
  return b ? pageMetadata({ title: `${b.name_en}, ${b.community} on the map`, description: `Prices, rents and yields for ${b.name_en} in ${b.community}, from DLD data, on the 3D map.`, path: `/building/${b.slug}` }) : {};
}

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
    <main className="relative h-[calc(100dvh-3.5rem-1px)] min-h-[420px] w-full md:h-[calc(100dvh-4rem-1px)]">
      <BuildingMap currency={currency} cardMode />
      <MapTour />
      <div className="map-intro pointer-events-none absolute inset-x-4 top-4 flex justify-center">
        <div className="pointer-events-auto w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--panel)]/95 p-4 shadow-sm">
          <h1 className="text-lg font-semibold">Explore the map</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Tap a building to see its numbers. Prices, rents and yields from official Dubai Land Department data.</p>
          <div className="mt-3"><SearchBox mapMode placeholder="Try “Princess Tower”, “JVC” or “near a metro”" autoFocus={false} /></div>
          <MapStart />
        </div>
      </div>
    </main>
  );
}
