import { describe, expect, it } from "vitest";
import { histogram } from "./stats";

describe("histogram", () => {
  it("bins values evenly and keeps every value", () => {
    const h = histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5, 8)!;
    expect(h).toHaveLength(5);
    expect(h.reduce((s, b) => s + b.count, 0)).toBe(10);
    expect(h[4].count).toBeGreaterThan(0);
  });
  it("returns null when there are too few values or no spread", () => {
    expect(histogram([1, 2, 3])).toBeNull();
    expect(histogram(Array(10).fill(5))).toBeNull();
  });
});
