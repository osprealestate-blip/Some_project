/** The five facility kinds shown on the building card, in order. Distances are straight-line, never routed;
 *  no travel minutes are shown (those need a routing service). */
export type FacilityId = "metro" | "hospital" | "school" | "mall" | "park";

export const FACILITIES: { id: FacilityId; label: string; colour: string }[] = [
  { id: "metro", label: "Metro", colour: "#22d3ee" },
  { id: "hospital", label: "Hospital", colour: "#f87171" },
  { id: "school", label: "School", colour: "#fbbf24" },
  { id: "mall", label: "Mall", colour: "#c084fc" },
  { id: "park", label: "Park", colour: "#4ade80" },
];

export type NearestFacility = { id: FacilityId; name: string; distanceM: number; lng: number; lat: number; approx: boolean };

/** "0.8 km" always in km with one decimal under 10 km, so figures line up and read as straight-line distance. */
export function km(m: number): string {
  const k = m / 1000;
  return `${k < 10 ? k.toFixed(1) : Math.round(k)} km`;
}
