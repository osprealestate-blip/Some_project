import { describe, expect, it } from "vitest";
import { describeChange, update } from "./whatChanged";

const s = (periodEnd: string, sales12m: number | null, psf: number | null, rent: number | null) => ({ periodEnd, sales12m, psf, rent });

describe("whatChanged", () => {
  it("first visit has nothing to compare", () => {
    const r = update(undefined, s("2026-09-30", 10, 1000, 80000));
    expect(r.base).toBeNull();
    expect(describeChange(r)).toBeNull();
  });
  it("same data date keeps the base and says nothing new", () => {
    const r1 = update(undefined, s("2026-09-30", 10, 1000, 80000));
    const r2 = update(r1, s("2026-09-30", 10, 1000, 80000));
    expect(r2).toEqual(r1);
  });
  it("a new data date moves the old figures to base and describes the difference", () => {
    const r = update(update(undefined, s("2026-09-30", 10, 1000, 80000)), s("2026-10-30", 12, 1100, 76000));
    expect(r.base?.periodEnd).toBe("2026-09-30");
    expect(describeChange(r)).toEqual(["Sales in 12 months: 10 then, 12 now.", "Median price per sq ft +10%.", "Median rent −5%."]);
    // staying on the same new date keeps the same description
    expect(update(r, s("2026-10-30", 12, 1100, 76000))).toEqual(r);
  });
  it("skips figures missing on either date", () => {
    const r = update(update(undefined, s("2026-09-30", null, null, null)), s("2026-10-30", null, null, null));
    expect(describeChange(r)).toEqual(["Not enough figures on both dates to compare."]);
  });
});
