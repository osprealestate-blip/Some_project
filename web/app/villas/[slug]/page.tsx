import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BuildingMap from "@/components/LazyBuildingMap";
import NoData from "@/components/NoData";
import VillaFigures from "@/components/VillaFigures";
import { getServerCurrency } from "@/lib/currency";
import { hasDatabase } from "@/lib/db";
import { makeT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { villaCard } from "@/lib/villaCardData";
import { CLUSTER_KIND_LABEL } from "@/lib/villaCluster";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!hasDatabase()) return { title: "Villa cluster" };
  const c = await villaCard(slug).catch(() => null);
  return c
    ? pageMetadata({ title: `${c.name}${c.community ? `, ${c.community}` : ""}`, description: `Sales and bedroom mix for the ${c.name} ${c.kind === "townhouse" ? "townhouses" : "villas"}${c.community ? ` in ${c.community}` : ""}, from Dubai Land Department data.`, path: `/villas/${c.slug}` })
    : { title: "Villa cluster" };
}

/** One villa or townhouse project as a whole: aggregate figures only, never a single villa. */
export default async function Page({ params }: Params) {
  const { slug } = await params;
  if (!hasDatabase()) return <main className="mx-auto max-w-3xl p-4 sm:p-6"><NoData /></main>;
  const data = await villaCard(slug).catch(() => null);
  if (!data) notFound();
  const t = makeT("en");
  const currency = await getServerCurrency();
  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <nav className="text-xs text-[var(--muted)]">
        <Link className="link" href="/map">Map</Link>
        {data.community && data.dmCode && <> / <Link className="link" href={`/community/${data.dmCode}`}>{data.community}</Link></>}
      </nav>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{CLUSTER_KIND_LABEL[data.kind]}</p>
      <h1 className="text-2xl font-semibold">{data.name}</h1>
      {data.community && <p className="text-sm text-[var(--muted)]">{data.community}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section aria-label="Figures" className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4"><VillaFigures data={data} currency={currency} t={t} /></section>
        <div className="h-72 overflow-hidden rounded-lg border border-[var(--border)] md:h-auto md:min-h-72">
          <BuildingMap focus={{ lng: data.lng, lat: data.lat }} currency={currency} controls="legend" />
        </div>
      </div>
      <p className="mt-4 text-xs"><Link className="link" href={`/map?villa=${encodeURIComponent(data.slug)}`}>Show it on the 3D map</Link></p>
    </main>
  );
}
