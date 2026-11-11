import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const alt = "Dubai building intelligence";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard("Dubai, building by building", "Prices, rents and yields you can check");
}
