import { describe, expect, it } from "vitest";
import { inDubai, minutesLabel, parseOsrm, RateLimiter, routeKey, routeUrl, routingConfig, TtlCache } from "./routing";

const ok = { code: "Ok", routes: [{ duration: 485, distance: 620, geometry: { type: "LineString", coordinates: [[55.14, 25.08], [55.141, 25.081]] } }] };

describe("routingConfig", () => {
  it("is off by default and when only half is set", () => {
    expect(routingConfig({}).enabled).toBe(false);
    expect(routingConfig({ ROUTING_ENABLED: "1", ROUTING_FOOT_URL: "https://a.example" }).enabled).toBe(false);
    expect(routingConfig({ ROUTING_FOOT_URL: "https://a.example", ROUTING_CAR_URL: "https://b.example" }).enabled).toBe(false);
  });
  it("needs https addresses and the switch", () => {
    expect(routingConfig({ ROUTING_ENABLED: "1", ROUTING_FOOT_URL: "http://a.example", ROUTING_CAR_URL: "https://b.example" }).enabled).toBe(false);
    const c = routingConfig({ ROUTING_ENABLED: "1", ROUTING_FOOT_URL: "https://a.example/", ROUTING_CAR_URL: "https://b.example" });
    expect(c.enabled).toBe(true);
    expect(c.urls.walk).toBe("https://a.example");
  });
});

describe("parseOsrm", () => {
  it("reads minutes and the line", () => {
    const r = parseOsrm(ok)!;
    expect(r.minutes).toBe(8);
    expect(r.distanceM).toBe(620);
    expect(r.coords).toHaveLength(2);
  });
  it("returns null for anything that is not a clean route", () => {
    expect(parseOsrm(null)).toBeNull();
    expect(parseOsrm({ code: "NoRoute", routes: [] })).toBeNull();
    expect(parseOsrm({ code: "Ok", routes: [] })).toBeNull();
    expect(parseOsrm({ code: "Ok", routes: [{ duration: "x", distance: 1, geometry: { type: "LineString", coordinates: [[1, 2], [3, 4]] } }] })).toBeNull();
    expect(parseOsrm({ code: "Ok", routes: [{ duration: 60, distance: 1, geometry: { type: "LineString", coordinates: [[1, 2]] } }] })).toBeNull();
  });
  it("never shows 0 minutes", () => {
    expect(parseOsrm({ ...ok, routes: [{ ...ok.routes[0], duration: 10 }] })!.minutes).toBe(1);
  });
});

describe("labels and keys", () => {
  it("labels the mode", () => {
    expect(minutesLabel(8, "walk")).toBe("8 min walk");
    expect(minutesLabel(12, "drive")).toBe("12 min drive");
    expect(minutesLabel(95, "walk")).toBe("1 h 35 min walk"); expect(minutesLabel(120, "drive")).toBe("2 h drive");
  });
  it("builds an OSRM url with lng,lat order", () => {
    expect(routeUrl("https://x.example", [55.1, 25.1], [55.2, 25.2])).toContain("/route/v1/driving/55.10000,25.10000;55.20000,25.20000?");
  });
  it("keys round to about a metre", () => {
    expect(routeKey("walk", [55.1400001, 25.08], [55.15, 25.09])).toBe(routeKey("walk", [55.14, 25.08], [55.15, 25.09]));
    expect(routeKey("walk", [55.14, 25.08], [55.15, 25.09])).not.toBe(routeKey("drive", [55.14, 25.08], [55.15, 25.09]));
  });
  it("keeps routes inside Dubai", () => {
    expect(inDubai(55.14, 25.08)).toBe(true);
    expect(inDubai(2.35, 48.85)).toBe(false);
    expect(inDubai(NaN, 25)).toBe(false);
  });
});

describe("TtlCache and RateLimiter", () => {
  it("expires and evicts", () => {
    let t = 0;
    const c = new TtlCache<number>(2, 1000, () => t);
    c.set("a", 1); c.set("b", 2); c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBe(2);
    t = 1500;
    expect(c.get("b")).toBeUndefined();
  });
  it("limits per key per window", () => {
    let t = 0;
    const l = new RateLimiter(2, 1000, () => t);
    expect([l.allow("x"), l.allow("x"), l.allow("x"), l.allow("y")]).toEqual([true, true, false, true]);
    t = 1001;
    expect(l.allow("x")).toBe(true);
  });
});
