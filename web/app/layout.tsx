import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Dubai building intelligence", template: "%s · Dubai building intelligence" },
  description: "Dubai, building by building: prices, rents and yields from official DLD open data.",
  openGraph: { type: "website", siteName: "Dubai building intelligence", locale: "en_AE" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  // dir is set per locale later; the layout already uses logical (start/end) spacing so Arabic can follow.
  return (
    <html lang="en" dir="ltr">
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        {modal}
      </body>
    </html>
  );
}
