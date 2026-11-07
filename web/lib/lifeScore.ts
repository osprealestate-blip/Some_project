/** Basic Life Score (0-100): how much daily life is within walking distance of a building.
 *  Each group scores by the distance to its nearest place; groups are weighted and summed.
 *  Distances are straight-line, not walking routes, so the score is a guide only. */

export type NearbyPlace = { category: string; subcategory: string | null; name: string; distance_m: number };

export type LifeGroup = { id: string; label: string; weight: number; match: (p: NearbyPlace) => boolean };

export const LIFE_GROUPS: LifeGroup[] = [
  { id: "transit", label: "Metro or tram", weight: 25, match: (p) => p.subcategory === "metro" || p.subcategory === "tram" },
  { id: "groceries", label: "Supermarket", weight: 20, match: (p) => p.subcategory === "supermarket" || p.subcategory === "convenience" },
  { id: "schools", label: "School", weight: 15, match: (p) => p.category === "school" },
  { id: "health", label: "Clinic, hospital or pharmacy", weight: 15, match: (p) => p.category === "health" || p.subcategory === "pharmacy" },
  { id: "outdoors", label: "Park or beach", weight: 15, match: (p) => p.subcategory === "park" || p.subcategory === "beach" },
  { id: "leisure", label: "Gym, mall, cafe or restaurant", weight: 10, match: (p) => ["gym", "mall", "cafe", "restaurant"].includes(p.subcategory ?? "") },
];

/** 1 within 400 m (about a 5-minute walk), falling to 0 at 2 km. */
export function distanceScore(m: number | null | undefined): number {
  if (m == null) return 0;
  if (m <= 400) return 1;
  if (m >= 2000) return 0;
  return 1 - (m - 400) / 1600;
}

export type LifeScore = {
  score: number;
  groups: { id: string; label: string; weight: number; nearest: NearbyPlace | null; points: number }[];
};

export function lifeScore(places: NearbyPlace[]): LifeScore {
  const groups = LIFE_GROUPS.map((g) => {
    const nearest = places.filter(g.match).sort((a, b) => a.distance_m - b.distance_m)[0] ?? null;
    return { id: g.id, label: g.label, weight: g.weight, nearest, points: g.weight * distanceScore(nearest?.distance_m) };
  });
  return { score: Math.round(groups.reduce((s, g) => s + g.points, 0)), groups };
}
