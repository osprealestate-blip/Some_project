import { describe, expect, it } from "vitest";
import { makeT } from "./i18n";
import { compareDifferences } from "./compareSummary";

const t = makeT("en");
const a = { name: "A", psf: 2000, yield: 0.05, sales: 40, change: 0.02 };
const b = { name: "B", psf: 1500, yield: 0.07, sales: 10, change: 0.01 };

describe("compareDifferences", () => {
  it("states price, yield and data gaps", () => {
    const r = compareDifferences([a, b], t);
    expect(r).toHaveLength(3);
    expect(r[0]).toContain("33% above B");
    expect(r[1]).toContain("B shows the highest");
    expect(r[2]).toContain("A has the most recorded sales");
  });
  it("skips small gaps and missing data", () => {
    expect(compareDifferences([a, { ...a, name: "C", psf: 2010, yield: null }], t)).toEqual([]);
    expect(compareDifferences([a], t)).toEqual([]);
  });
});
