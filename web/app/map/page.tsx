import type { Metadata } from "next";
import BuildingMap from "@/components/BuildingMap";
import MapWelcome from "@/components/MapWelcome";
import { getServerCurrency } from "@/lib/currency";
import { getT } from "@/lib/lang";
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
  const { t } = await getT();
  return (
    <main className="relative h-[calc(100dvh-3.5rem-1px)] min-h-[420px] w-full md:h-[calc(100dvh-4rem-1px)]">
      <BuildingMap currency={currency} cardMode />
      <h1 className="sr-only">{t("Explore the map")}</h1>
      <MapWelcome />
    </main>
  );
}
