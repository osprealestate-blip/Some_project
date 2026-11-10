import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS, METRICS, NO_DATA_COLOR, PALETTES, classColors, classify, colorFor, colourise, evenBreaks, legendItems, nice,
  parseSettings, quantileBreaks, resolveBreaks, tint, type MapBuildingProps,
} from "./mapMetrics";
import { parseTheme } from "./mapThemes";

const b = (over: Partial<MapBuildingProps>): MapBuildingProps => ({
  slug: "x", name: "X", community: null, psf: null, yield: null, price: null, rent: null, change: null, sales: 0, rentLevel: null, approx: false, ...over,
});

describe("classify", () => {
  const breaks = [1000, 1500, 2000, 2800];
  it("puts values in five classes, a break value in the class above", () => {
    expect(classify(900, breaks)).toBe(0);
    expect(classify(1000, breaks)).toBe(1);
    expect(classify(1499, breaks)).toBe(1);
    expect(classify(2799, breaks)).toBe(3);
    expect(classify(2800, breaks)).toBe(4);
    expect(classify(9000, breaks)).toBe(4);
  });
  it("returns -1 for missing values", () => {
    expect(classify(null, breaks)).toBe(-1);
    expect(classify(undefined, breaks)).toBe(-1);
    expect(classify(Number.NaN, breaks)).toBe(-1);
  });
  it("handles negative breaks (12-month change)", () => {
    expect(classify(-0.2, METRICS.change.breaks)).toBe(0);
    expect(classify(0, METRICS.change.breaks)).toBe(2);
    expect(classify(0.12, METRICS.change.breaks)).toBe(4);
  });
});

describe("colours", () => {
  it("maps classes to the palette, low to high, and grey for no data", () => {
    const breaks = [...METRICS.psf.breaks];
    expect(colorFor(500, breaks, "blues")).toBe(PALETTES.blues.colors[0]);
    expect(colorFor(3000, breaks, "blues")).toBe(PALETTES.blues.colors[4]);
    expect(colorFor(null, breaks, "blues")).toBe(NO_DATA_COLOR);
  });
  it("keeps the lightest and darkest colour when there are fewer classes", () => {
    const c = classColors("heat", 3);
    expect(c).toEqual([PALETTES.heat.colors[0], PALETTES.heat.colors[2], PALETTES.heat.colors[4]]);
  });
  it("tints towards white", () => {
    expect(tint("#000000", 0.5)).toBe("#808080");
    expect(tint("#ffffff", 0.5)).toBe("#ffffff");
    expect(tint("not a colour")).toBe("not a colour");
  });
});

describe("scales", () => {
  it("rounds to two significant figures", () => {
    expect(nice(1487.3)).toBe(1500);
    expect(nice(0.0634)).toBeCloseTo(0.063);
    expect(nice(-0.034)).toBeCloseTo(-0.034);
    expect(nice(0)).toBe(0);
  });
  it("splits values into groups of equal size", () => {
    const values = Array.from({ length: 100 }, (_, i) => 1000 + i * 20); // 1,000 .. 2,980
    const q = quantileBreaks(values);
    expect(q).toHaveLength(4);
    const counts = [0, 0, 0, 0, 0];
    for (const v of values) counts[classify(v, q)]++;
    for (const c of counts) expect(c).toBeGreaterThanOrEqual(17);
  });
  it("drops duplicate quantile breaks and needs enough values", () => {
    expect(quantileBreaks([5, 5, 5, 5, 5, 5, 9])).toEqual([5]);
    expect(quantileBreaks([1, 2, 3])).toEqual([]);
  });
  it("builds even breaks between a low and high value", () => {
    expect(evenBreaks(0, 300)).toEqual([0, 100, 200, 300]);
    expect(evenBreaks(300, 0)).toEqual([]);
  });
  it("uses the recommended bands unless another scale can be built", () => {
    expect(resolveBreaks(DEFAULT_SETTINGS, [])).toEqual([...METRICS.psf.breaks]);
    expect(resolveBreaks({ ...DEFAULT_SETTINGS, mode: "quantile" }, [1, 2])).toEqual([...METRICS.psf.breaks]);
    expect(resolveBreaks({ ...DEFAULT_SETTINGS, mode: "custom", min: 1000, max: 4000 }, [])).toEqual([1000, 2000, 3000, 4000]);
    expect(resolveBreaks({ ...DEFAULT_SETTINGS, mode: "custom", min: null, max: 4000 }, [])).toEqual([...METRICS.psf.breaks]);
  });
});

describe("legend", () => {
  it("labels ranges, counts buildings and ends with No data", () => {
    const items = legendItems("psf", [1000, 1500, 2000, 2800], "blues", [900, 1200, 1300, null, 5000]);
    expect(items.map((i) => i.count)).toEqual([1, 2, 0, 0, 1, 1]);
    expect(items[0].label).toBe("Under AED 1,000");
    expect(items[1].label).toBe("AED 1,000 to AED 1,500");
    expect(items[4].label).toBe("AED 2,800 and over");
    expect(items[5]).toMatchObject({ cls: -1, label: "No data", color: NO_DATA_COLOR });
  });
  it("shows yields as percentages and converts money to the chosen currency", () => {
    expect(legendItems("yield", [...METRICS.yield.breaks], "greens", [])[0].label).toBe("Under 5.0%");
    expect(legendItems("rent", [...METRICS.rent.breaks], "blues", [], "USD")[0].label).toMatch(/^Under \$/);
  });
});

describe("colourise", () => {
  it("adds colour, tint and class to each building", () => {
    const out = colourise([{ properties: b({ psf: 2100 }) }, { properties: b({ psf: null }) }], DEFAULT_SETTINGS);
    expect(out.features[0].properties._cls).toBe(3);
    expect(out.features[0].properties._color).toBe(PALETTES.heat.colors[3]);
    expect(out.features[1].properties).toMatchObject({ _cls: -1, _color: NO_DATA_COLOR });
    expect(out.values).toEqual([2100, null]);
  });
});

describe("saved settings", () => {
  it("reads valid settings back", () => {
    const s = { metric: "yield", palette: "viridis", mode: "custom", min: 0.04, max: 0.09 };
    expect(parseSettings(JSON.stringify(s))).toEqual(s);
  });
  it("falls back to defaults for broken or unknown values", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("{oops")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ metric: "owner", palette: "pink", mode: "x", min: "1" }))).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ metric: "rent" })).palette).toBe(METRICS.rent.palette);
  });
  it("reads the theme back", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("satellite")).toBe("light");
    expect(parseTheme(null)).toBe("light");
  });
});
