import { describe, expect, it } from "vitest";
import { addCollection, cleanName, collectionHref, parseCollections, removeCollection, renameCollection, toggleInCollection, MAX_COLLECTIONS } from "./collections";

describe("collections", () => {
  it("cleans names", () => {
    expect(cleanName("  Near   metro <b> ")).toBe("Near metro b");
    expect(cleanName("   ")).toBeNull();
    expect(cleanName("x".repeat(80))?.length).toBe(40);
  });
  it("adds, renames and removes, refusing duplicates and overflow", () => {
    let l = addCollection([], "Shortlist", "a1");
    expect(addCollection(l, "shortlist", "a2")).toBe(l);
    l = addCollection(l, "Near metro", "a2");
    expect(l.map((c) => c.name)).toEqual(["Shortlist", "Near metro"]);
    expect(renameCollection(l, "a2", "Shortlist")).toBe(l);
    expect(renameCollection(l, "a2", "Metro")[1].name).toBe("Metro");
    expect(removeCollection(l, "a1")).toHaveLength(1);
    let big = l;
    for (let i = 0; i < MAX_COLLECTIONS + 2; i++) big = addCollection(big, `n${i}`, `id${i}`);
    expect(big).toHaveLength(MAX_COLLECTIONS);
  });
  it("toggles a building in a collection", () => {
    const l = addCollection([], "A", "a1");
    const on = toggleInCollection(l, "a1", "princess-tower");
    expect(on[0].slugs).toEqual(["princess-tower"]);
    expect(toggleInCollection(on, "a1", "princess-tower")[0].slugs).toEqual([]);
  });
  it("reads stored JSON defensively", () => {
    expect(parseCollections("nope")).toEqual([]);
    expect(parseCollections('[{"id":"a1","name":"X","slugs":["ok-1","BAD SLUG!",5]},{"id":"bad id","name":"Y"}]')).toEqual([{ id: "a1", name: "X", slugs: ["ok-1"] }]);
  });
  it("builds a share link of name and slugs only", () => {
    expect(collectionHref({ name: "My picks", slugs: ["a", "b"] })).toBe("/collection?name=My%20picks&ids=a,b");
  });
});
