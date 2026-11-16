/** Turns the homepage search card into a /buildings link. Only filters the Buildings page really supports are sent. */
export type HeroMode = "buy" | "rent";
export type HeroType = "residential" | "commercial";

/** Price steps in AED. The filter is on median sale price, so it only applies to Buy. */
export const PRICE_STEPS = [1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000] as const;

export type HeroQuery = { mode: HeroMode; community: string; rooms: number; maxPrice: number | null };

export function heroHref(q: HeroQuery): string {
  const sp = new URLSearchParams({ c: q.community, sort: q.mode === "rent" ? "rent" : "sales" });
  if (Number.isInteger(q.rooms) && q.rooms >= 0 && q.rooms <= 4) sp.set("rooms", String(q.rooms));
  if (q.mode === "buy" && q.maxPrice != null && q.maxPrice > 0) sp.set("maxPrice", String(Math.round(q.maxPrice)));
  return `/buildings?${sp}`;
}
