import { describe, expect, it } from "vitest";
import { LATEST_DEFAULT, LATEST_MAX, parseLatest } from "./latestSalesShared";

const p = (q: string) => parseLatest(new URLSearchParams(q));

describe("latest sales query string", () => {
  it("needs a master community or a numeric area code", () => {
    expect(p("")).toBeNull();
    expect(p("area=abc")).toBeNull();
    expect(p("area=392")?.scope).toEqual({ kind: "area", value: "392" });
    expect(p("master=Dubai%20Marina")?.scope).toEqual({ kind: "master", value: "Dubai Marina" });
  });
  it("keeps the limit in range", () => {
    expect(p("area=392")?.limit).toBe(LATEST_DEFAULT);
    expect(p("area=392&limit=9999")?.limit).toBe(LATEST_MAX);
    expect(p("area=392&limit=0")?.limit).toBe(1);
    expect(p("area=392&limit=x")?.limit).toBe(LATEST_DEFAULT);
  });
});
