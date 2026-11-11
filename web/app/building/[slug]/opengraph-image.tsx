import { hasDatabase } from "@/lib/db";
import { OG_SIZE, ogCard } from "@/lib/ogCard";
import { buildingBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const alt = "Building on Dubai building intelligence";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = hasDatabase() ? await buildingBySlug(slug).catch(() => null) : null;
  return b ? ogCard(b.name_en, b.community) : ogCard("Dubai building", "Prices, rents and yields");
}
