import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: { default: "Dubai building intelligence", template: "%s · Dubai building intelligence" },
  description: "Dubai, building by building: prices, rents and yields from official DLD open data.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  // dir is set per locale later; the layout already uses logical (start/end) spacing so Arabic can follow.
  return (
    <html lang="en" dir="ltr">
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />
        <div id="main" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <SiteFooter />
        {modal}
      </body>
    </html>
  );
}
