import { launchCommunity } from "@/lib/communities";
import { hasDatabase } from "@/lib/db";
import { resolveMaster } from "@/lib/masterQueries";
import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const alt = "Community on Dubai building intelligence";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let label = launchCommunity(code)?.label ?? null;
  if (!label && !/^\d+$/.test(code) && hasDatabase()) label = await resolveMaster(code).catch(() => null);
  return ogCard(label ?? "Dubai community", "Community prices, rents and yields");
}
