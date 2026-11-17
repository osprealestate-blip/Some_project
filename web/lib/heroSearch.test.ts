import { describe, expect, it } from "vitest";
import { heroHref } from "./heroSearch";

describe("heroHref", () => {
  it("buy with a budget and bedrooms", () => {
    expect(heroHref({ mode: "buy", community: "392", rooms: 2, maxPrice: 2_000_000 })).toBe("/buildings?c=392&sort=sales&rooms=2&maxPrice=2000000");
  });
  it("rent sorts by rent and ignores the budget", () => {
    expect(heroHref({ mode: "rent", community: "681", rooms: -1, maxPrice: 2_000_000 })).toBe("/buildings?c=681&sort=rent");
  });
  it("studio is bedroom 0", () => {
    expect(heroHref({ mode: "buy", community: "346", rooms: 0, maxPrice: null })).toBe("/buildings?c=346&sort=sales&rooms=0");
  });
});

import { compactCount } from "./homeStats";
describe("compactCount", () => {
  it("rounds down", () => {
    expect(compactCount(1_399_999)).toBe("1.3M");
    expect(compactCount(12_999)).toBe("12k");
    expect(compactCount(4902)).toBe("4,902");
  });
});
