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
