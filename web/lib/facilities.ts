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

/** Inner SVG markup of each icon (24x24 box, stroked). One set of drawings for React chips and map pins. */
export const ICON_PATHS: Record<FacilityId, string> = {
  metro: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l2-4M15 21l-2-4"/><circle cx="9.5" cy="14" r=".6"/><circle cx="14.5" cy="14" r=".6"/>',
  hospital: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  school: '<path d="M3 9l9-5 9 5-9 5-9-5z"/><path d="M7 11.5V16c2 2 8 2 10 0v-4.5"/>',
  mall: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8a3 3 0 016 0"/>',
  park: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7"/>',
};

export const iconSvg = (id: FacilityId, size = 14) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[id]}</svg>`;

/** Straight-line line from a building to each facility, as GeoJSON for the map. Never routed. */
export function nearbyLines(from: { lng: number; lat: number }, list: NearestFacility[], hidden: FacilityId[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: list.filter((f) => !hidden.includes(f.id)).map((f) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[from.lng, from.lat], [f.lng, f.lat]] },
      properties: { id: f.id, colour: FACILITIES.find((x) => x.id === f.id)!.colour },
    })),
  };
}
