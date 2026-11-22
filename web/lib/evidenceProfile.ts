/** What we actually hold for one building, row by row, generated from the data itself.
 *  Describes only: Available / Partial / Not available, with the reason. No scores and no verdicts. */
import { rentTier, type RentTierInput } from "./rentTier";

export type EvidenceLevel = "Available" | "Partial" | "Not available";
export type EvidenceRow = { id: "sales" | "rents" | "position" | "service" | "characteristics"; label: string; level: EvidenceLevel; detail: string };

export type EvidenceInput = {
  sales12m: number | null | undefined;
  rent: RentTierInput;
  /** buildings.geom_source: where the map position came from, or null when the building has none. */
  geomSource: string | null | undefined;
  floors: number | null | undefined;
  unitCount: number | null | undefined;
  completionYear: number | null | undefined;
};

/** Positions taken straight from a map source or placed by hand are exact; the rest are borrowed from a neighbour or an area. */
const EXACT_POSITION: Record<string, string> = { osm: "OpenStreetMap", search: "OpenStreetMap place search", manual: "placed by hand" };
const APPROX_POSITION: Record<string, string> = {
  plot: "another tower on the same plot",
  project: "another tower of the same project",
  site: "the development's site in OpenStreetMap",
  geocoded: "an area-level address match",
};

const MIN_SALES = 3; // same floor as the medians

export function evidenceProfile(i: EvidenceInput): EvidenceRow[] {
  const n = i.sales12m ?? 0;
  const sales: EvidenceRow =
    n >= MIN_SALES ? { id: "sales", label: "Sales", level: "Available", detail: `${n} apartment sales counted in 12 months (DLD).` }
    : n > 0 ? { id: "sales", label: "Sales", level: "Partial", detail: `Only ${n} ${n === 1 ? "sale" : "sales"} in 12 months, too few for a median (DLD).` }
    : { id: "sales", label: "Sales", level: "Not available", detail: "No apartment sales counted in 12 months." };

  const tier = rentTier(i.rent);
  const rents: EvidenceRow =
    tier.id === "tower" ? { id: "rents", label: "Rent evidence", level: "Available", detail: tier.line }
    : tier.id === "project" || tier.id === "estimated" ? { id: "rents", label: "Rent evidence", level: "Partial", detail: tier.line }
    : { id: "rents", label: "Rent evidence", level: "Not available", detail: tier.id === "community" ? "No rent figure for this building; only its area's median exists." : tier.line };

  const src = i.geomSource ?? "";
  const position: EvidenceRow =
    EXACT_POSITION[src] ? { id: "position", label: "Map position", level: "Available", detail: `Source: ${EXACT_POSITION[src]}.` }
    : APPROX_POSITION[src] ? { id: "position", label: "Map position", level: "Partial", detail: `Approximate, taken from ${APPROX_POSITION[src]}.` }
    : { id: "position", label: "Map position", level: "Not available", detail: "Not placed on the map yet." };

  // We hold no building-level service-charge data. Cost figures use a flat, changeable assumption instead.
  const service: EvidenceRow = { id: "service", label: "Service charges", level: "Not available", detail: "No real figure for this building. Cost figures use an assumed rate you can change." };

  const known = [
    i.floors ? `${i.floors} floors` : null,
    i.unitCount ? `${i.unitCount} units` : null,
    i.completionYear ? `completed ${i.completionYear}` : null,
  ].filter((x): x is string => x != null);
  const missing = [!i.floors ? "floors" : null, !i.unitCount ? "units" : null, !i.completionYear ? "completion year" : null].filter((x): x is string => x != null);
  const characteristics: EvidenceRow =
    missing.length === 0 ? { id: "characteristics", label: "Building details", level: "Available", detail: known.join(", ") + "." }
    : known.length === 0 ? { id: "characteristics", label: "Building details", level: "Not available", detail: "Floors, units and completion year are not recorded." }
    : { id: "characteristics", label: "Building details", level: "Partial", detail: `${known.join(", ")}. Not recorded: ${missing.join(", ")}.` };

  return [sales, rents, position, service, characteristics];
}
