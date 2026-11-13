import { describe, expect, it } from "vitest";
import { buildingVerdict } from "./verdict";

const base = { psf: 1500, yield: 0.07, sales: 40, communityName: "Dubai Marina", communityPsf: 1500, communityYield: 0.065 };

describe("buildingVerdict", () => {
  it("says in line when within 10%", () => {
    expect(buildingVerdict(base)?.text).toMatch(/^Priced in line with Dubai Marina, with a higher rent return/);
  });
  it("says above / below with the percentage", () => {
    expect(buildingVerdict({ ...base, psf: 1800 })?.text).toMatch(/Priced 20% above the Dubai Marina median/);
    expect(buildingVerdict({ ...base, psf: 1200, yield: 0.05 })?.text).toMatch(/20% below.*lower rent return/);
  });
  it("is cautious with few sales", () => {
    expect(buildingVerdict({ ...base, sales: 8 })?.tone).toBe("caution");
    const v = buildingVerdict({ ...base, sales: 2 });
    expect(v?.text).toMatch(/Only 2 counted sales/);
    expect(v?.tone).toBe("caution");
  });
  it("copes with missing rent", () => {
    expect(buildingVerdict({ ...base, yield: null })?.text).toMatch(/rent figures not available/);
  });
});
