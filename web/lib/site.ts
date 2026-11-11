/** The site's public address, for canonical links, Open Graph previews, the sitemap and robots.txt.
 *  Order: NEXT_PUBLIC_SITE_URL (set it when a custom domain is chosen), then the Vercel production address, then
 *  the deployment address, then localhost. */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();
  const raw = explicit || (host ? `https://${host}` : "http://localhost:3100");
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export function absoluteUrl(path: string, base: string = siteUrl()): string {
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
