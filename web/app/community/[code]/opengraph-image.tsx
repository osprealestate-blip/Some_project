import { launchCommunity } from "@/lib/communities";
import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const alt = "Community on Dubai building intelligence";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return ogCard(launchCommunity(code)?.label ?? "Dubai community", "Community prices, rents and yields");
}
