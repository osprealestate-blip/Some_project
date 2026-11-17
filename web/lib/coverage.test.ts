import { describe, expect, it } from "vitest";
import { ageDays, evidenceState, freshnessParts, reviewStatus } from "./coverage";

describe("coverage wording", () => {
  it("marks launch areas hand-checked and others automatic", () => {
    expect(reviewStatus("392").checked).toBe(true);
    expect(reviewStatus(681).checked).toBe(true);
    expect(reviewStatus("101").checked).toBe(false);
    expect(reviewStatus(null).checked).toBe(false);
  });
  it("formats freshness and says when a date is missing", () => {
    expect(freshnessParts({ salesTo: "2026-10-30", rentsTo: null, projectsAsOf: "2026-07-06" })).toEqual([
      "Sales to 30 Oct 2026", "Rents to date not available", "Projects file 6 Jul 2026",
    ]);
    expect(freshnessParts({ salesTo: "nonsense" })[0]).toBe("Sales to date not available");
  });
  it("computes age in days", () => {
    expect(ageDays("2026-07-06", new Date("2026-11-16T00:00:00Z"))).toBe(133);
    expect(ageDays(null, new Date())).toBeNull();
  });
  it("classifies evidence", () => {
    expect([0, 2, 3, null].map(evidenceState)).toEqual(["none", "thin", "ok", "none"]);
  });
});
