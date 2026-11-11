import type { Metadata } from "next";
import BuildingDetail from "@/components/BuildingDetail";
import { hasDatabase } from "@/lib/db";
import { buildingBySlug } from "@/lib/queries";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  if (!hasDatabase()) return { title: "Building" };
  const b = await buildingBySlug(slug).catch(() => null);
  return b ? pageMetadata({ title: `${b.name_en}, ${b.community}`, description: `Sale prices, rents and yields for ${b.name_en} in ${b.community}, from DLD data.`, path: `/building/${b.slug}` }) : { title: "Building" };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  return <BuildingDetail slug={slug} />;
}
