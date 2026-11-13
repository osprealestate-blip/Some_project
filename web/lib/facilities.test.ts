import { describe, expect, it } from "vitest";
import { km } from "./facilities";

describe("km", () => {
  it("formats metres as km", () => {
    expect(km(800)).toBe("0.8 km");
    expect(km(2440)).toBe("2.4 km");
    expect(km(18400)).toBe("18 km");
  });
});
