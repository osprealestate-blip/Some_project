import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { siteUrl } from "@/lib/site";
import { LangPage, LangProvider } from "@/components/LangProvider";
import { dirOf, makeT } from "@/lib/i18n";
import { getServerLang } from "@/lib/lang";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Dubai building intelligence", template: "%s · Dubai building intelligence" },
  description: "Dubai, building by building: prices, rents and yields from official DLD open data.",
  openGraph: { type: "website", siteName: "Dubai building intelligence", locale: "en_AE" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();
  const t = makeT(lang);
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body className="flex min-h-dvh flex-col antialiased">
        <LangProvider lang={lang}>
          <a href="#main" className="skip-link">{t("Skip to content")}</a>
          <SiteHeader />
          <div id="main" tabIndex={-1} className="flex-1 outline-none"><LangPage>{children}</LangPage></div>
          <SiteFooter />
        </LangProvider>
      </body>
    </html>
  );
}
