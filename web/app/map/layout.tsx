import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Map", description: "Explore Dubai buildings on a 3D map, coloured by price, rent or yield. Figures from Dubai Land Department data.", path: "/map" });

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
