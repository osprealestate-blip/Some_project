import { describe, expect, it } from "vitest";
import { toCommunityCard } from "./communityCard";
import type { MasterPage } from "./masterQueries";
import type { CommunitySummary } from "./queries";

const row = (o: Partial<CommunitySummary>): CommunitySummary => ({
  rooms: -1, sale_count_12m: 0, sale_median_psf_12m: null, sale_median_price_12m: null, sale_median_psf_prev_12m: null, rent_count_12m: 0,
  rent_median_12m: null, gross_yield: null, period_end: "2026-10-31", source_date: "2026-10-31", ...o,
} as CommunitySummary);
const bld = (slug: string, sales: number, placed = true) => ({ slug, name: slug, complexKey: null, complexName: null, developer: null, year: null, use: null, sales, offplanSales: 0, psf: 2000, rent: null, rentLevel: null, yield: null, placed });
const page = (o: Partial<MasterPage>): MasterPage => ({ name: "Azizi Venice", summaries: [], series: { sales: [], rents: [] }, figures: true, areas: [], developers: [], buildings: [], ...o });

describe("toCommunityCard", () => {
  it("prefers the same-tower change and takes the middle yield across bedroom types", () => {
    const c = toCommunityCard(page({
      buildings: [bld("a", 40), bld("b", 10, false)],
      summaries: [
        row({ sale_count_12m: 50, sale_median_psf_12m: 2000, sale_median_psf_prev_12m: 1800, like_for_like_change: 0.05, like_for_like_towers: 4, rent_median_12m: 90000, rent_count_12m: 60 }),
        row({ rooms: 1, gross_yield: 0.07 }), row({ rooms: 2, gross_yield: 0.06 }), row({ rooms: 3, gross_yield: 0.09 }),
      ],
    }));
    expect(c.change).toEqual({ value: 0.05, basis: "same-tower", towers: 4 });
    expect(c.yield).toBe(0.07);
    expect(c.placed).toBe(1);
    expect(c.state).toBe("ok");
    expect(c.slug).toBe("azizi-venice");
  });
  it("falls back to the plain median change, and shows nothing when there is no earlier figure", () => {
    const withPrev = toCommunityCard(page({ buildings: [bld("a", 9)], summaries: [row({ sale_count_12m: 9, sale_median_psf_12m: 2200, sale_median_psf_prev_12m: 2000 })] }));
    expect(withPrev.change?.basis).toBe("median");
    expect(withPrev.change?.value).toBeCloseTo(0.1);
    const none = toCommunityCard(page({ buildings: [bld("a", 9)], summaries: [row({ sale_count_12m: 9, sale_median_psf_12m: 2200 })] }));
    expect(none.change).toBeNull();
  });
  it("reports a community with no sales as having none, not as a price of zero", () => {
    const c = toCommunityCard(page({ buildings: [bld("a", 0)], summaries: [row({})] }));
    expect(c.state).toBe("none");
    expect(c.psf).toBeNull();
    expect(c.rent).toBeNull();
    expect(c.top).toEqual([]);
  });
  it("keeps counts when the figure tables are missing", () => {
    const c = toCommunityCard(page({ figures: false, buildings: [bld("a", 12), bld("b", 3)] }));
    expect(c.figures).toBe(false);
    expect(c.sales12m).toBe(15);
    expect(c.psf).toBeNull();
    expect(c.top.map((t) => t.slug)).toEqual(["a", "b"]);
  });
});
