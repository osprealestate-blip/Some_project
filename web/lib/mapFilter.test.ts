import { describe, expect, it } from "vitest";
import { facilityIntent, filterParam, nearLabel, parseFilter } from "./mapFilter";

describe("parseFilter", () => {
  it("reads the three kinds", () => {
    expect(parseFilter("near:metro")).toEqual({ type: "near", value: "metro" });
    expect(parseFilter("dev:Emaar Properties")).toEqual({ type: "dev", value: "Emaar Properties" });
    expect(parseFilter("area:392")).toEqual({ type: "area", value: "392" });
    expect(parseFilter("under:1500000")).toEqual({ type: "under", value: "1500000" });
  });
  it("rejects anything else", () => {
    for (const bad of [null, "", "near:airport", "area:abc", "x:1", "near", "dev:", "under:abc", "under:12"]) expect(parseFilter(bad)).toBeNull();
  });
  it("round trips", () => expect(filterParam({ type: "near", value: "park" })).toBe("near:park"));
});

describe("facilityIntent", () => {
  it("finds facility words, whole or started", () => {
    expect(facilityIntent("near a metro")).toEqual(["metro"]);
    expect(facilityIntent("close to schools")).toEqual(["school"]);
    expect(facilityIntent("metr")).toEqual(["metro"]);
    expect(facilityIntent("mall and park")).toEqual(["mall", "park"]);
  });
  it("ignores other text", () => {
    expect(facilityIntent("princess tower")).toEqual([]);
    expect(facilityIntent("jvc")).toEqual([]);
  });
});

it("labels say straight-line", () => expect(nearLabel("metro")).toBe("Within 0.8 km of a metro station (straight-line)"));
