import { describe, expect, it } from "vitest";
import { parsePrefs, rankForYou, type Prefs } from "./forYou";

const f = (slug: string, o: Partial<{ psf: number; yield: number | null; price: number; change: number | null; sales: number }> = {}) =>
  ({ slug, name: slug, community: "X", psf: 1500, yield: 0.06, price: 1_500_000, change: 0.02, sales: 20, ...o });
const list = [f("a", { yield: 0.08 }), f("b", { yield: 0.05, price: 900_000 }), f("c", { yield: null }), f("d", { sales: 2, yield: 0.12 }), f("e", { yield: 0.07, price: 3_000_000 })];
const prefs = (o: Partial<Prefs>): Prefs => ({ goal: "yield", maxPrice: null, minYield: null, ...o });

describe("rankForYou", () => {
  it("sorts by yield and drops thin or yield-less buildings", () => {
    expect(rankForYou(list, prefs({})).map((x) => x.slug)).toEqual(["a", "e", "b"]);
  });
  it("applies budget and minimum yield", () => {
    expect(rankForYou(list, prefs({ maxPrice: 2_000_000 })).map((x) => x.slug)).toEqual(["a", "b"]);
    expect(rankForYou(list, prefs({ minYield: 0.075 })).map((x) => x.slug)).toEqual(["a"]);
  });
  it("sorts value by cheapest per sq ft", () => {
    const l = [f("p", { psf: 2000 }), f("q", { psf: 1200 })];
    expect(rankForYou(l, prefs({ goal: "value" })).map((x) => x.slug)).toEqual(["q", "p"]);
  });
  it("parses stored prefs defensively", () => {
    expect(parsePrefs("junk").goal).toBe("yield");
    expect(parsePrefs('{"goal":"growth","maxPrice":-5,"minYield":0.06}')).toEqual({ goal: "growth", maxPrice: null, minYield: 0.06 });
  });
});
