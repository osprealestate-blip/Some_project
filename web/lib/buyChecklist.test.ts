import { describe, expect, it } from "vitest";
import { buyChecklist, OFFICIAL_LINKS } from "./buyChecklist";

const base = { offPlan: false, sales12m: 30, rentLevel: "building" as const, rentCount: 20, hasCompletionYear: true };
const ids = (f: Parameters<typeof buyChecklist>[0]) => buyChecklist(f).map((i) => i.id);

describe("buyChecklist", () => {
  it("has the core checks for a ready building", () => {
    expect(ids(base)).toEqual(["deed", "snag", "charges", "comps", "advice"]);
  });
  it("adds off-plan checks", () => {
    expect(ids({ ...base, offPlan: true })).toContain("handover");
  });
  it("adds data-driven flags", () => {
    const i = ids({ ...base, sales12m: 2, rentLevel: "project" as const, hasCompletionYear: false });
    expect(i).toEqual(expect.arrayContaining(["few", "rent", "year"]));
  });
  it("states no law or fee amounts", () => {
    const text = buyChecklist({ ...base, offPlan: true, sales12m: 1, rentLevel: null, rentCount: 0, hasCompletionYear: false }).map((i) => i.text + (i.why ?? "")).join(" ");
    expect(text).not.toMatch(/\d+\s?%|AED|RERA|law requires/i);
  });
  it("links only to https official hosts", () => {
    for (const l of OFFICIAL_LINKS) expect(l.url).toMatch(/^https:\/\/[a-z.]+\.gov\.ae$/);
  });
});
