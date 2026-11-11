import { describe, expect, it } from "vitest";
import { GLOSSARY, glossaryEntry, termAnchor } from "./glossary";

describe("glossary", () => {
  it("covers the terms the brief names", () => {
    const ids = GLOSSARY.map((g) => g.id);
    for (const id of ["gross-yield", "price-per-sq-ft", "dld", "ejari", "service-charge", "off-plan"]) expect(ids).toContain(id);
  });
  it("has unique ids and non-empty text", () => {
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
    for (const g of GLOSSARY) {
      expect(g.term.length).toBeGreaterThan(0);
      expect(g.short.length).toBeGreaterThan(20);
      expect(g.long.length).toBeGreaterThan(g.short.length);
    }
  });
  it("short definitions fit a tooltip", () => {
    for (const g of GLOSSARY) expect(g.short.length).toBeLessThanOrEqual(200);
  });
  it("looks entries up and builds anchors", () => {
    expect(glossaryEntry("ejari").term).toBe("Ejari");
    expect(termAnchor("dld")).toBe("term-dld");
  });
});
