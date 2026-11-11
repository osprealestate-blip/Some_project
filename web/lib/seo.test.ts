import { describe, expect, it } from "vitest";
import { pageMetadata } from "./seo";
import { absoluteUrl, siteUrl } from "./site";
import { STATIC_PATHS, sitemapEntries } from "./sitemap";

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and trims the slash", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.com/", VERCEL_URL: "x.vercel.app" })).toBe("https://example.com");
  });
  it("adds https to a bare host", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "example.com" })).toBe("https://example.com");
  });
  it("falls back to the Vercel production host, then the deployment host, then localhost", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app", VERCEL_URL: "d.vercel.app" })).toBe("https://prod.vercel.app");
    expect(siteUrl({ VERCEL_URL: "d.vercel.app" })).toBe("https://d.vercel.app");
    expect(siteUrl({})).toBe("http://localhost:3100");
  });
  it("builds absolute urls", () => {
    expect(absoluteUrl("/sitemap.xml", "https://a.test")).toBe("https://a.test/sitemap.xml");
    expect(absoluteUrl("x", "https://a.test")).toBe("https://a.test/x");
  });
});

describe("pageMetadata", () => {
  const m = pageMetadata({ title: "Buildings", description: "d", path: "/buildings" });
  it("sets canonical, Open Graph and Twitter fields", () => {
    expect(m.alternates?.canonical).toBe("/buildings");
    expect(m.openGraph?.title).toBe("Buildings · Dubai building intelligence");
    expect(m.twitter?.title).toBe("Buildings · Dubai building intelligence");
    expect(m.robots).toBeUndefined();
  });
  it("can ask search engines to skip a page", () => {
    expect(pageMetadata({ title: "t", description: "d", path: "/p", noindex: true }).robots).toEqual({ index: false, follow: true });
  });
});

describe("sitemapEntries", () => {
  const urls = sitemapEntries("https://a.test", ["stax", "b-2"], ["392"]).map((e) => e.url);
  it("lists the fixed pages, communities and buildings", () => {
    expect(urls).toContain("https://a.test");
    expect(urls).toContain("https://a.test/map");
    expect(urls).toContain("https://a.test/community/392");
    expect(urls).toContain("https://a.test/building/stax");
    expect(urls).toHaveLength(STATIC_PATHS.length + 3);
  });
  it("leaves out pages that depend on a visitor's input", () => {
    for (const p of ["/search", "/compare", "/favourites"]) expect(urls.some((u) => u.endsWith(p))).toBe(false);
  });
});
