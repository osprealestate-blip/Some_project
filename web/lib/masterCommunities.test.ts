import { describe, expect, it } from "vitest";
import {
  communityState, filterBuildings, filterIndex, findMaster, groupBuildings, isOffPlan, masterAbbreviation, masterEvidence, masterNameAr,
  masterSlug, sortBuildings, sortGroups, sortIndex, MASTER_AR, type IndexRow, type MasterBuilding,
} from "./masterCommunities";
import { parseFilter } from "./mapFilter";
import { AR } from "./i18nAr";
import { isTranslatedPath } from "./i18n";

const b = (o: Partial<MasterBuilding> & { slug: string }): MasterBuilding => ({
  name: o.slug, complexKey: null, complexName: null, developer: null, year: null, use: null, sales: 0, offplanSales: 0, psf: null, rent: null,
  rentLevel: null, yield: null, placed: true, ...o,
});

describe("slugs", () => {
  it("turns names into link names and drops the bracketed abbreviation", () => {
    expect(masterSlug("Jumeirah Village Circle (JVC)")).toBe("jumeirah-village-circle");
    expect(masterSlug("Mohammed Bin Rashid City (MBR City)")).toBe("mohammed-bin-rashid-city");
    expect(masterSlug("Za'abeel")).toBe("zaabeel");
    expect(masterSlug("Azizi Venice")).toBe("azizi-venice");
    expect(masterSlug("Dubai Production City (IMPZ)")).toBe("dubai-production-city");
  });
  it("finds a community by slug or by its abbreviation", () => {
    const names = ["Dubai Marina", "Jumeirah Village Circle (JVC)", "Jumeirah Lake Towers (JLT)", "Mohammed Bin Rashid City (MBR City)"];
    expect(masterAbbreviation(names[1])).toBe("jvc");
    expect(masterAbbreviation(names[3])).toBe("mbr-city");
    expect(findMaster("dubai-marina", names)).toBe("Dubai Marina");
    expect(findMaster("JVC", names)).toBe(names[1]);
    expect(findMaster("mbr-city", names)).toBe(names[3]);
    expect(findMaster("nowhere", names)).toBeNull();
    expect(findMaster("", names)).toBeNull();
  });
  it("gives every master community a distinct slug", () => {
    const slugs = Object.keys(MASTER_AR).map(masterSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("evidence", () => {
  it("says Available, Partial or Not available with the reason, never a score", () => {
    const rows = masterEvidence({ buildings: 10, placed: 4, sales12m: 120, rents12m: 5, handChecked: false });
    expect(rows.map((r) => [r.id, r.level])).toEqual([["sales", "Available"], ["rents", "Partial"], ["position", "Partial"], ["names", "Partial"]]);
    expect(rows[2].detail).toContain("{p} of {n}");
    expect(rows[2].vars).toEqual({ p: 4, n: 10 });
  });
  it("marks an empty community honestly", () => {
    const rows = masterEvidence({ buildings: 2, placed: 0, sales12m: 0, rents12m: 0, handChecked: false });
    expect(rows.slice(0, 3).every((r) => r.level === "Not available")).toBe(true);
    expect(masterEvidence({ buildings: 2, placed: 2, sales12m: 2, rents12m: 40, handChecked: true }).map((r) => r.level)).toEqual(["Partial", "Available", "Available", "Available"]);
  });
  it("uses the same 3-sale floor as the medians", () => {
    expect(communityState(0, 5)).toBe("none");
    expect(communityState(2, 5)).toBe("thin");
    expect(communityState(3, 5)).toBe("ok");
    expect(communityState(50, 0)).toBe("none");
  });
});

describe("buildings list", () => {
  const rows = [
    b({ slug: "a", name: "Alpha", sales: 10, psf: 1500, yield: 0.07, rent: 90000, developer: "Azizi", offplanSales: 9, complexKey: "x:venice-1", complexName: "Venice 1" }),
    b({ slug: "b", name: "Bravo", sales: 40, psf: 2100, yield: 0.05, rent: 120000, complexKey: "x:venice-1", complexName: "Venice 1" }),
    b({ slug: "c", name: "Charlie", sales: 0 }),
    b({ slug: "d", name: "Delta", sales: 5, psf: 900, yield: null, offplanSales: 1 }),
  ];
  it("sorts with empty figures last in both directions", () => {
    expect(sortBuildings(rows, "sales").map((r) => r.slug)).toEqual(["b", "a", "d", "c"]);
    expect(sortBuildings(rows, "psf-high").map((r) => r.slug)).toEqual(["b", "a", "d", "c"]);
    expect(sortBuildings(rows, "psf-low").map((r) => r.slug)).toEqual(["d", "a", "b", "c"]);
    expect(sortBuildings(rows, "yield").map((r) => r.slug)).toEqual(["a", "b", "c", "d"]);
    expect(sortBuildings(rows, "name").map((r) => r.slug)).toEqual(["a", "b", "c", "d"]);
    expect(rows.map((r) => r.slug)).toEqual(["a", "b", "c", "d"]); // input untouched
  });
  it("calls a building off-plan when more than half of its recent sales were", () => {
    expect(isOffPlan(rows[0])).toBe(true);
    expect(isOffPlan(rows[3])).toBe(false);
    expect(isOffPlan(rows[2])).toBe(false);
    expect(isOffPlan({ sales: 4, offplanSales: 2 })).toBe(false);
  });
  it("filters by search words and by ready or off-plan", () => {
    expect(filterBuildings(rows, { q: "azizi" }).map((r) => r.slug)).toEqual(["a"]);
    expect(filterBuildings(rows, { q: "venice" }).map((r) => r.slug)).toEqual(["a", "b"]);
    expect(filterBuildings(rows, { ready: "offplan" }).map((r) => r.slug)).toEqual(["a"]);
    expect(filterBuildings(rows, { ready: "ready" }).map((r) => r.slug)).toEqual(["b", "d"]);
    expect(filterBuildings(rows, {}).length).toBe(4);
  });
  it("groups sibling towers: counts add up, medians become a range", () => {
    const g = groupBuildings(rows);
    expect(g.length).toBe(3);
    const venice = g.find((x) => x.key === "x:venice-1")!;
    expect(venice.towers.length).toBe(2);
    expect(venice.sales).toBe(50);
    expect([venice.psfLow, venice.psfHigh]).toEqual([1500, 2100]);
    expect(sortGroups(g, "sales")[0].key).toBe("x:venice-1");
    expect(g.find((x) => x.key === "solo:c")!.psfLow).toBeNull();
  });
});

describe("index", () => {
  const r = (name: string, o: Partial<IndexRow> = {}): IndexRow => ({ name, slug: masterSlug(name), buildings: 1, placed: 1, sales: 0, psf: null, rent: null, yield: null, yoy: null, handChecked: false, ...o });
  const rows = [r("Zeta", { sales: 5, psf: 900 }), r("Alpha", { sales: 50, psf: 1800, buildings: 9 }), r("Mid", { sales: 0 })];
  it("sorts and keeps communities without a price last", () => {
    expect(sortIndex(rows, "sales").map((x) => x.name)).toEqual(["Alpha", "Zeta", "Mid"]);
    expect(sortIndex(rows, "psf-high").map((x) => x.name)).toEqual(["Alpha", "Zeta", "Mid"]);
    expect(sortIndex(rows, "psf-low").map((x) => x.name)).toEqual(["Zeta", "Alpha", "Mid"]);
    expect(sortIndex(rows, "buildings")[0].name).toBe("Alpha");
    expect(sortIndex(rows, "name").map((x) => x.name)).toEqual(["Alpha", "Mid", "Zeta"]);
  });
  it("searches names, including the Arabic name, and can hide communities with no price", () => {
    expect(filterIndex(rows, "al", false).map((x) => x.name)).toEqual(["Alpha"]);
    expect(filterIndex([r("Dubai Marina")], "مارينا", false).length).toBe(1);
    expect(filterIndex(rows, "", true).map((x) => x.name)).toEqual(["Zeta", "Alpha"]);
  });
});

describe("Arabic and links", () => {
  it("has an Arabic name for the known communities and none invented for others", () => {
    expect(masterNameAr("Dubai Marina")).toBe("دبي مارينا");
    expect(masterNameAr("Some New Place")).toBeNull();
  });
  it("translates the evidence sentences and labels it shows", () => {
    for (const r of [...masterEvidence({ buildings: 10, placed: 4, sales12m: 120, rents12m: 5, handChecked: false }), ...masterEvidence({ buildings: 0, placed: 0, sales12m: 1, rents12m: 40, handChecked: true }), ...masterEvidence({ buildings: 3, placed: 3, sales12m: 0, rents12m: 0, handChecked: false })]) {
      expect(AR[r.label]).toBeTruthy();
      expect(AR[r.detail]).toBeTruthy();
      expect(AR[r.level]).toBeTruthy();
    }
  });
  it("shows the translated pages in Arabic and leaves official areas in English", () => {
    expect(isTranslatedPath("/communities")).toBe(true);
    expect(isTranslatedPath("/community/azizi-venice")).toBe(true);
    expect(isTranslatedPath("/community/392")).toBe(false);
    expect(isTranslatedPath("/buildings")).toBe(false);
  });
  it("accepts a community in a map link", () => {
    expect(parseFilter("master:azizi-venice")).toEqual({ type: "master", value: "azizi-venice" });
    expect(parseFilter("master:Bad Name")).toBeNull();
    expect(parseFilter("area:392")).toEqual({ type: "area", value: "392" });
  });
});
