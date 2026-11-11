/**
 * Colouring buildings on the map by a metric the visitor picks.
 *
 * Every metric is split into 5 classes by 4 break values (class 0 is below the first break, class 4 at or above
 * the last). Breaks come from one of three scales:
 *  - "recommended": fixed Dubai bands below, so colours mean the same thing wherever you look;
 *  - "quantile": equal numbers of buildings per colour, from the buildings on the map;
 *  - "custom": the visitor's own low and high value, split evenly.
 * Buildings without a value are drawn in a neutral grey and listed as "No data" in the legend.
 *
 * Pure functions only: tested in mapMetrics.test.ts.
 */
import { Currency, DEFAULT_CURRENCY, convertFromAed, convertToAed } from "@/config/currency";
import { count, formatPsf, formatShortPrice, pct } from "@/lib/format";
import { SOURCES } from "@/lib/sources";

export type MetricId = "psf" | "yield" | "price" | "rent" | "change" | "sales";
export type ScaleMode = "recommended" | "quantile" | "custom";
export type PaletteId = "heat" | "blues" | "greens" | "viridis" | "gold" | "diverging";

/** One building on the map. Money is AED; yield and change are fractions (0.065 = 6.5%). */
export type MapBuildingProps = {
  slug: string;
  name: string;
  community: string | null;
  psf: number | null;
  yield: number | null;
  price: number | null;
  rent: number | null;
  change: number | null;
  sales: number;
  /** "building" | "project" | "estimated": how the rent was linked (see the building page). */
  rentLevel: string | null;
  /** True when the map position is approximate (plot, project or site), not the tower's own footprint. */
  approx: boolean;
};

type MetricDef = {
  label: string;
  /** Legend title, says the period. */
  title: string;
  /** Recommended Dubai bands, in AED or fractions. */
  breaks: [number, number, number, number];
  palette: PaletteId;
  estimate?: boolean;
  source: string;
  /** Value as the visitor reads and types it (converted currency, or percent). */
  toDisplay: (v: number, c: Currency) => number;
  fromDisplay: (v: number, c: Currency) => number;
  /** Short value for the legend and the hover card. */
  format: (v: number, c: Currency) => string;
  /** Unit beside the custom range inputs. */
  unit: (c: Currency) => string;
};

const money = {
  toDisplay: (v: number, c: Currency) => convertFromAed(v, c),
  fromDisplay: (v: number, c: Currency) => convertToAed(v, c),
};
const percent = {
  toDisplay: (v: number) => Math.round(v * 1000) / 10,
  fromDisplay: (v: number) => v / 100,
  unit: () => "%",
};

export const METRICS: Record<MetricId, MetricDef> = {
  psf: {
    label: "Price per sq ft",
    title: "Median price per sq ft, 12 months",
    breaks: [1000, 1500, 2000, 2800],
    palette: "heat",
    source: SOURCES.dldSales,
    ...money,
    format: (v, c) => formatPsf(v, c).replace("/sq ft", ""),
    unit: (c) => `${c}/sq ft`,
  },
  yield: {
    label: "Rental yield",
    title: "Gross rental yield (estimate)",
    breaks: [0.05, 0.06, 0.07, 0.08],
    palette: "greens",
    estimate: true,
    source: `${SOURCES.dldSales}; ${SOURCES.dldRents}`,
    ...percent,
    format: (v) => pct(v),
  },
  price: {
    label: "Median price",
    title: "Median sale price, 12 months",
    breaks: [800_000, 1_200_000, 1_800_000, 3_000_000],
    palette: "heat",
    source: SOURCES.dldSales,
    ...money,
    format: (v, c) => formatShortPrice(v, c),
    unit: (c) => c,
  },
  rent: {
    label: "Median rent",
    title: "Median annual rent, 12 months",
    breaks: [60_000, 90_000, 130_000, 200_000],
    palette: "blues",
    source: SOURCES.dldRents,
    ...money,
    format: (v, c) => formatShortPrice(v, c),
    unit: (c) => `${c}/yr`,
  },
  change: {
    label: "12-month change",
    title: "Change in median price per sq ft on a year earlier",
    breaks: [-0.05, 0, 0.05, 0.1],
    palette: "diverging",
    source: SOURCES.dldSales,
    ...percent,
    format: (v) => pct(v, 0, true),
  },
  sales: {
    label: "Sales activity",
    title: "Number of sales, 12 months",
    breaks: [5, 15, 40, 100],
    palette: "viridis",
    source: SOURCES.dldSales,
    toDisplay: (v) => v,
    fromDisplay: (v) => v,
    format: (v) => count(Math.round(v)),
    unit: () => "sales",
  },
};

export const METRIC_IDS = Object.keys(METRICS) as MetricId[];

/** Five colours, low to high. Sequential ramps from ColorBrewer / viridis, readable on light and dark maps. */
export const PALETTES: Record<PaletteId, { label: string; colors: [string, string, string, string, string] }> = {
  heat: { label: "Warm (yellow to red)", colors: ["#ffe08a", "#fdb44b", "#f4793e", "#d7422f", "#9c1127"] },
  blues: { label: "Blue", colors: ["#cfe1f5", "#86b4e8", "#3f86d9", "#1f5aa6", "#123a6e"] },
  greens: { label: "Green", colors: ["#e5f5c4", "#addd8e", "#5fbf6e", "#238443", "#0b5a2c"] },
  viridis: { label: "Viridis", colors: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"] },
  gold: { label: "Gold", colors: ["#f3e6c4", "#e3c27a", "#c99a3c", "#9c6f1c", "#5e4108"] },
  diverging: { label: "Red to green", colors: ["#c8312f", "#f29e6d", "#ece6c8", "#8fcf7e", "#1e8a45"] },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

export const NO_DATA_COLOR = "#9aa3ad";

export type MapSettings = { metric: MetricId; palette: PaletteId; mode: ScaleMode; min: number | null; max: number | null };

export const DEFAULT_SETTINGS: MapSettings = { metric: "psf", palette: METRICS.psf.palette, mode: "recommended", min: null, max: null };

export function metricValue(p: MapBuildingProps, m: MetricId): number | null {
  const v = p[m];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Class 0..breaks.length for a value, or -1 when there is no value. */
export function classify(value: number | null | undefined, breaks: readonly number[]): number {
  if (value == null || !Number.isFinite(value)) return -1;
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i++;
  return i;
}

/** Round to 2 significant figures so legend labels read "1,500", not "1,487.3". */
export function nice(v: number): number {
  if (v === 0 || !Number.isFinite(v)) return 0;
  const mag = 10 ** (Math.floor(Math.log10(Math.abs(v))) - 1);
  return Math.round(v / mag) * mag;
}

/** Four breaks splitting the values into five groups of about equal size. Duplicates are dropped. */
export function quantileBreaks(values: readonly number[], classes = 5): number[] {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length < classes) return [];
  const out: number[] = [];
  for (let k = 1; k < classes; k++) {
    const pos = (k / classes) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const q = sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (pos - lo);
    const n = nice(q);
    if (!out.length || n > out[out.length - 1]) out.push(n);
  }
  return out;
}

/** Four breaks evenly between low and high (low is the first break, high the last). */
export function evenBreaks(low: number, high: number, classes = 5): number[] {
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return [];
  const step = (high - low) / (classes - 2);
  return Array.from({ length: classes - 1 }, (_, i) => low + step * i);
}

/** The breaks for the current settings. Falls back to the recommended bands when a scale can't be built. */
export function resolveBreaks(s: MapSettings, values: readonly number[]): number[] {
  const rec = [...METRICS[s.metric].breaks];
  if (s.mode === "quantile") {
    const q = quantileBreaks(values);
    return q.length >= 2 ? q : rec;
  }
  if (s.mode === "custom" && s.min != null && s.max != null) {
    const e = evenBreaks(s.min, s.max);
    return e.length ? e : rec;
  }
  return rec;
}

/** Colours for the classes: the 5-colour palette, trimmed evenly when a quantile scale has fewer classes. */
export function classColors(palette: PaletteId, classes: number): string[] {
  const c = PALETTES[palette]?.colors ?? PALETTES.heat.colors;
  if (classes >= c.length) return [...c];
  if (classes <= 1) return [c[c.length - 1]];
  return Array.from({ length: classes }, (_, i) => c[Math.round((i * (c.length - 1)) / (classes - 1))]);
}

export function colorFor(value: number | null, breaks: readonly number[], palette: PaletteId): string {
  const k = classify(value, breaks);
  return k < 0 ? NO_DATA_COLOR : classColors(palette, breaks.length + 1)[k];
}

export type LegendItem = { cls: number; color: string; label: string; count: number };

/** Legend rows, low to high, then "No data". Counts are the buildings in each class. */
export function legendItems(
  metric: MetricId, breaks: readonly number[], palette: PaletteId, values: readonly (number | null)[], currency: Currency = DEFAULT_CURRENCY,
): LegendItem[] {
  const def = METRICS[metric];
  const f = (v: number) => def.format(v, currency);
  const colors = classColors(palette, breaks.length + 1);
  const counts = new Array(breaks.length + 1).fill(0);
  let none = 0;
  for (const v of values) {
    const k = classify(v, breaks);
    if (k < 0) none++;
    else counts[k]++;
  }
  const items: LegendItem[] = colors.map((color, i) => ({
    cls: i,
    color,
    count: counts[i],
    label: i === 0 ? `Under ${f(breaks[0])}` : i === breaks.length ? `${f(breaks[i - 1])} and over` : `${f(breaks[i - 1])} to ${f(breaks[i])}`,
  }));
  items.push({ cls: -1, color: NO_DATA_COLOR, label: "No data", count: none });
  return items;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Settings saved in the browser, read back defensively (old or hand-edited values fall back to defaults). */
export function parseSettings(raw: string | null | undefined): MapSettings {
  let o: Record<string, unknown> = {};
  try {
    const v = raw ? JSON.parse(raw) : null;
    if (v && typeof v === "object") o = v as Record<string, unknown>;
  } catch {
    /* fall back to defaults */
  }
  const metric = oneOf(o.metric, METRIC_IDS, DEFAULT_SETTINGS.metric);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    metric,
    palette: oneOf(o.palette, PALETTE_IDS, METRICS[metric].palette),
    mode: oneOf(o.mode, ["recommended", "quantile", "custom"] as const, "recommended"),
    min: num(o.min),
    max: num(o.max),
  };
}

/** Mix a #rrggbb colour with white (amount 0..1): the hover and selected tint of a building. */
export function tint(hex: string, amount = 0.5): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0");
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Adds _color, _tint and _cls to each building for the current settings, and returns the legend breaks. */
export function colourise<T extends { properties: MapBuildingProps }>(
  features: readonly T[], s: MapSettings,
): { features: (T & { properties: T["properties"] & { _color: string; _tint: string; _cls: number } })[]; breaks: number[]; values: (number | null)[] } {
  const values = features.map((f) => metricValue(f.properties, s.metric));
  const breaks = resolveBreaks(s, values.filter((v): v is number => v != null));
  const colors = classColors(s.palette, breaks.length + 1);
  const out = features.map((f, i) => {
    const k = classify(values[i], breaks);
    const color = k < 0 ? NO_DATA_COLOR : colors[k];
    return { ...f, properties: { ...f.properties, _color: color, _tint: tint(color, 0.55), _cls: k } };
  });
  return { features: out, breaks, values };
}
