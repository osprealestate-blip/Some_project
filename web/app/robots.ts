import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/search", "/compare", "/favourites"] }],
    sitemap: absoluteUrl("/sitemap.xml", siteUrl()),
    host: siteUrl(),
  };
}
