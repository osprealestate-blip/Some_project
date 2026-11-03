import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LAUNCH_COMMUNITIES, isLaunchCommunity } from "./communities";

describe("launch communities", () => {
  it("recognises codes given as numbers or padded strings", () => {
    expect(isLaunchCommunity(392)).toBe(true);
    expect(isLaunchCommunity(" 681 ")).toBe(true);
    expect(isLaunchCommunity("333")).toBe(false);
    expect(isLaunchCommunity(null)).toBe(false);
  });

  it("each launch community exists in the bundled polygons with its official name", () => {
    const file = path.join(__dirname, "..", "public", "data", "dubai_communities.geojson");
    const geo = JSON.parse(fs.readFileSync(file, "utf8")) as {
      features: { properties: { code?: string; name: string } }[];
    };
    for (const c of LAUNCH_COMMUNITIES) {
      const f = geo.features.find((x) => x.properties.code === c.code);
      expect(f, c.label).toBeDefined();
      expect(f!.properties.name).toBe(c.officialName);
    }
  });
});
