import { describe, expect, it } from "vitest";
import { makeQueryCache } from "./queryCache";

describe("makeQueryCache", () => {
  it("reuses a result within the time limit and reloads after it", async () => {
    let t = 0;
    let calls = 0;
    const c = makeQueryCache(1000, 10, () => t);
    const load = async () => ++calls;
    expect(await c.get("a", load)).toBe(1);
    t = 500;
    expect(await c.get("a", load)).toBe(1);
    t = 1500;
    expect(await c.get("a", load)).toBe(2);
  });
  it("shares one call between identical queries running together", async () => {
    let calls = 0;
    const c = makeQueryCache(1000, 10);
    const load = () => new Promise<number>((r) => setTimeout(() => r(++calls), 5));
    const [x, y] = await Promise.all([c.get("k", load), c.get("k", load)]);
    expect([x, y, calls]).toEqual([1, 1, 1]);
  });
  it("does not cache failures", async () => {
    const c = makeQueryCache(1000, 10);
    await expect(c.get("f", async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(await c.get("f", async () => 7)).toBe(7);
  });
  it("is off when the time limit is 0 and evicts the oldest past the size limit", async () => {
    let calls = 0;
    const off = makeQueryCache(0, 10);
    await off.get("a", async () => ++calls);
    await off.get("a", async () => ++calls);
    expect(calls).toBe(2);
    const small = makeQueryCache(1000, 2);
    for (const k of ["a", "b", "c"]) await small.get(k, async () => ++calls);
    const before = calls;
    await small.get("a", async () => ++calls);
    expect(calls).toBe(before + 1);
  });
});
