/** "For you": a plain filter and sort of the buildings on the map by what the visitor said matters. No scoring model and
 *  no prediction. The reason shown next to each result is the figure it was ranked on. */
import type { MapBuildingProps } from "./mapMetrics";

export type Goal = "yield" | "value" | "growth" | "activity";
export type Prefs = { goal: Goal; maxPrice: number | null; minYield: number | null };

export const DEFAULT_PREFS: Prefs = { goal: "yield", maxPrice: null, minYield: null };
export const PREFS_KEY = "dpi-prefs";
export const MIN_SALES = 5; // fewer counted sales than this and a median is not reliable

export const GOALS: { id: Goal; label: string; hint: string }[] = [
  { id: "yield", label: "Rental income", hint: "Highest gross yield first" },
  { id: "value", label: "Lower price per sq ft", hint: "Cheapest per sq ft first" },
  { id: "growth", label: "Recent price change", hint: "Biggest rise on a year earlier first. Past change, not a forecast" },
  { id: "activity", label: "Busy market", hint: "Most sales in 12 months first" },
];

export function parsePrefs(raw: string | null): Prefs {
  try {
    const v = JSON.parse(raw ?? "null");
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null);
    const goal = GOALS.some((g) => g.id === v?.goal) ? (v.goal as Goal) : DEFAULT_PREFS.goal;
    return { goal, maxPrice: num(v?.maxPrice), minYield: num(v?.minYield) };
  } catch { return DEFAULT_PREFS; }
}

type F = Pick<MapBuildingProps, "slug" | "name" | "community" | "psf" | "yield" | "price" | "change" | "sales">;

export function rankForYou<T extends F>(features: T[], p: Prefs, limit = 8): T[] {
  const ok = features.filter((f) =>
    f.sales >= MIN_SALES && f.psf != null &&
    (p.maxPrice == null || (f.price != null && f.price <= p.maxPrice)) &&
    (p.minYield == null || (f.yield != null && f.yield >= p.minYield)));
  const by: Record<Goal, (f: T) => number | null> = {
    yield: (f) => f.yield,
    value: (f) => (f.psf == null ? null : -f.psf),
    growth: (f) => f.change,
    activity: (f) => f.sales,
  };
  return ok.filter((f) => by[p.goal](f) != null).sort((a, b) => by[p.goal](b)! - by[p.goal](a)!).slice(0, limit);
}
