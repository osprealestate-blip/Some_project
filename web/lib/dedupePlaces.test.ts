import { describe, expect, it } from "vitest";
import { dedupePlaces } from "./dedupePlaces";

describe("dedupePlaces", () => {
  it("drops the same name at the same distance, keeps order", () => {
    const r = dedupePlaces([
      { name: "Bus stop", distance_m: 120 },
      { name: "Cafe", distance_m: 150 },
      { name: "bus stop ", distance_m: 123 },
    ]);
    expect(r.map((p) => p.name)).toEqual(["Bus stop", "Cafe"]);
  });
  it("keeps the same name at a different distance", () => {
    expect(dedupePlaces([{ name: "Bus stop", distance_m: 120 }, { name: "Bus stop", distance_m: 400 }])).toHaveLength(2);
  });
});
