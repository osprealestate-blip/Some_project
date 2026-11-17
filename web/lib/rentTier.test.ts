import { describe, expect, it } from "vitest";
import { rentTier, yieldAllowed } from "./rentTier";

describe("rentTier", () => {
  it("maps each level", () => {
    expect(rentTier({ rentLevel: "building", rentCount: 20 }).id).toBe("tower");
    expect(rentTier({ rentLevel: "project", rentCount: 20 }).id).toBe("project");
    expect(rentTier({ rentLevel: "estimated", rentCount: 5 }).id).toBe("estimated");
  });
  it("falls back to area, then none, when contracts are too few", () => {
    expect(rentTier({ rentLevel: "building", rentCount: 2, communityRent: 90000 }).id).toBe("community");
    expect(rentTier({ rentLevel: null, rentCount: 0 }).id).toBe("none");
  });
  it("off-plan has no rent and never an actual", () => {
    const t = rentTier({ rentLevel: "project", rentCount: 50, offPlan: true });
    expect(t.id).toBe("none");
    expect(t.kind).toBe("Not available");
  });
  it("project and estimated tiers say what they are not", () => {
    expect(rentTier({ rentLevel: "project", rentCount: 9 }).line).toMatch(/not this tower/);
    expect(rentTier({ rentLevel: "estimated", rentCount: 9 }).kind).toBe("Estimated");
  });
  it("allows a yield only for tower, project or estimated", () => {
    expect(yieldAllowed(rentTier({ rentLevel: "project", rentCount: 9 }))).toBe(true);
    expect(yieldAllowed(rentTier({ rentLevel: null, rentCount: 0, communityRent: 1 }))).toBe(false);
  });
});
