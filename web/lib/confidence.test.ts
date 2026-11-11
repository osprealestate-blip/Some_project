import { describe, expect, it } from "vitest";
import { dataConfidence } from "./confidence";

describe("dataConfidence", () => {
  it("uses the fair-price thresholds", () => {
    expect(dataConfidence(15).level).toBe("good");
    expect(dataConfidence(14).level).toBe("limited");
    expect(dataConfidence(5).level).toBe("limited");
    expect(dataConfidence(4).level).toBe("low");
  });
  it("handles missing counts", () => {
    expect(dataConfidence(null).level).toBe("low");
    expect(dataConfidence(0).detail).toMatch(/no counted sales/);
    expect(dataConfidence(1).detail).toMatch(/only 1 sale in/);
  });
});
