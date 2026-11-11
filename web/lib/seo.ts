/** Page metadata helpers: one place for the canonical link and the Open Graph / Twitter fields, so a shared link
 *  shows the same title and description as the page. Descriptions never carry a figure: figures live on the page,
 *  next to their source and date. */
import type { Metadata } from "next";

export const SITE_NAME = "Dubai building intelligence";

/** `title` is the page title without the site name (the layout template adds it). `path` is the page's own path. */
export function pageMetadata({ title, description, path, noindex = false }: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, title: `${title} · ${SITE_NAME}`, description, url: path },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE_NAME}`, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
