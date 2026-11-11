import { describe, expect, it } from "vitest";
import { INTENT_NAV, MAIN_NAV, isActive } from "./nav";

const item = (href: string) => MAIN_NAV.find((n) => n.href === href)!;

describe("nav", () => {
  it("has the five main links in order", () => {
    expect(MAIN_NAV.map((n) => n.label)).toEqual(["Explore Map", "Communities", "Buildings", "Property Tools", "How It Works"]);
  });
  it("links the four guided pages", () => {
    expect(INTENT_NAV.map((n) => n.href)).toEqual(["/buy", "/invest", "/own", "/rent"]);
  });
  it("marks a section active on its own pages and on its detail pages", () => {
    expect(isActive("/map", item("/map"))).toBe(true);
    expect(isActive("/community/392", item("/communities"))).toBe(true);
    expect(isActive("/building/stax", item("/buildings"))).toBe(true);
    expect(isActive("/tools/fair-price", item("/tools"))).toBe(true);
  });
  it("does not match lookalike paths", () => {
    expect(isActive("/mapping", item("/map"))).toBe(false);
    expect(isActive("/", item("/map"))).toBe(false);
  });
});
