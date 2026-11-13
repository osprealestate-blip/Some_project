"use client";
import type { CardData } from "./cardData";

const cache = new Map<string, Promise<CardData>>();

/** One fetch per building per visit, shared by the card, the panel and the compare table. */
export function fetchCard(slug: string): Promise<CardData> {
  let p = cache.get(slug);
  if (!p) {
    p = fetch(`/api/building-card/${encodeURIComponent(slug)}`).then((r) => (r.ok ? (r.json() as Promise<CardData>) : Promise.reject(new Error("card"))));
    p.catch(() => cache.delete(slug));
    cache.set(slug, p);
  }
  return p;
}

export type SeriesData = { sales: { period: string; value: number | null; count: number }[]; rents: { period: string; value: number | null; count: number }[]; rentLevel: string | null; histogram: { from: number; to: number; count: number }[] | null; histogramCount: number };
const seriesCache = new Map<string, Promise<SeriesData>>();

/** Charts load only when a chart tab is opened, so the card itself stays light. */
export function fetchSeries(slug: string): Promise<SeriesData> {
  let p = seriesCache.get(slug);
  if (!p) {
    p = fetch(`/api/building-series/${encodeURIComponent(slug)}`).then((r) => (r.ok ? (r.json() as Promise<SeriesData>) : Promise.reject(new Error("series"))));
    p.catch(() => seriesCache.delete(slug));
    seriesCache.set(slug, p);
  }
  return p;
}
