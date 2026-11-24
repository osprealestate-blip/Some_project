/** Rent evidence tiers: which kind of rent record stands behind a rent or yield figure, in plain words.
 *  "tower" = contracts matched to this building; "project" = contracts for the whole project (they name the project,
 *  not the tower); "estimated" = some contracts placed in the tower by unit size; "community" = only the area's
 *  rents exist; "none" = not enough to show anything. */
export type RentTierId = "tower" | "project" | "estimated" | "community" | "none";

export type RentTier = { id: RentTierId; label: string; line: string; kind: "Actual" | "Estimated" | "Not available" };

export type RentTierInput = {
  rentLevel: "building" | "project" | "estimated" | null | undefined;
  rentCount: number | null | undefined;
  communityRent?: number | null;
  offPlan?: boolean;
};

const MIN_CONTRACTS = 3;

export function rentTier(i: RentTierInput): RentTier {
  const n = i.rentCount ?? 0;
  if (i.offPlan) return { id: "none", kind: "Not available", label: "Off-plan: no rent yet", line: "Off-plan (not completed yet), so there are no rent contracts for this building." };
  if (i.rentLevel && n >= MIN_CONTRACTS) {
    if (i.rentLevel === "building") return { id: "tower", kind: "Actual", label: "Rents for this tower", line: `${n} registered contracts matched to this building.` };
    if (i.rentLevel === "estimated") return { id: "estimated", kind: "Estimated", label: "Estimated from unit size", line: `${n} contracts; some name only the project and were placed here by unit size.` };
    return { id: "project", kind: "Actual", label: "Rents for the whole project", line: `${n} contracts for the project. They do not name the tower, so this is not this tower's own rent.` };
  }
  if (i.communityRent != null) return { id: "community", kind: "Actual", label: "Area rents only", line: "Too few rent contracts for this building or its project. Only the area's median is available, so no yield is shown here." };
  return { id: "none", kind: "Not available", label: "Not enough rent evidence", line: "Too few rent contracts to show a rent or a yield for this building." };
}

/** Yield is only meaningful when the rent behind it is a tower, project or estimated rent. */
export function yieldAllowed(t: RentTier): boolean {
  return t.id === "tower" || t.id === "project" || t.id === "estimated";
}
