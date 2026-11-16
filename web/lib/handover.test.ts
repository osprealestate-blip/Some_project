import { describe, expect, it } from "vitest";
import { handoverSummary, type ConstructionProject } from "./queries";

const p = (completion_date: string | null): ConstructionProject => ({ name: "x", developer: null, dld_status: "ACTIVE", percent_completed: null, completion_date });

describe("handoverSummary", () => {
  it("counts off-plan not-started projects with a planned date", () => {
    const np = { ...p("2028-12-22"), dld_status: "NOT_STARTED", no_of_units: 245 };
    expect(handoverSummary([np], new Date("2026-11-16"))).toEqual({ underConstruction: 1, dueNext12m: 0, overdue: 0, undated: 0 });
  });
});

describe("handoverSummary", () => {
  it("counts due, overdue and undated separately", () => {
    const s = handoverSummary([p("2027-03-01"), p("2028-06-01"), p("2026-01-01"), p(null)], new Date("2026-11-16"));
    expect(s).toEqual({ underConstruction: 4, dueNext12m: 1, overdue: 1, undated: 1 });
  });
  it("is all zero for no projects", () => {
    expect(handoverSummary([], new Date())).toEqual({ underConstruction: 0, dueNext12m: 0, overdue: 0, undated: 0 });
  });
});
