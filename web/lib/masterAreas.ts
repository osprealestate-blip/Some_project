/** Master communities as areas on the map: one outline and one name label each. Pure helpers, so they can be tested
 *  without a database. The shapes come from `masterAreaRows` in masterQueries.ts. */
import { isHandChecked, masterNameAr, masterSlug } from "./masterCommunities";

export type MasterAreaRow = {
  name: string;
  buildings: number;
  placed: number;
  /** GeoJSON geometry text, or null when the community has nothing we can outline. */
  shape: string | null;
  /** True when the shape is the official Dubai Municipality polygon; false when it is drawn round the placed buildings. */
  official: boolean;
};

/** A row as the database returns it: the shape plus the label point and zoom box of the main part. */
export type MasterAreaDbRow = MasterAreaRow & { lng: number | null; lat: number | null; w: number | null; s: number | null; e: number | null; n: number | null };

export type MasterAreaProps = {
  name: string;
  nameAr: string | null;
  slug: string;
  buildings: number;
  placed: number;
  official: boolean;
  /** The three launch communities keep their official outline from the older layer; only the label is added. */
  launch: boolean;
  /** Zoom from which the name label shows: busy communities first, so a zoomed-out map is not a wall of text. */
  labelZoom: number;
  lng: number;
  lat: number;
  /** West, south, east, north of the main part: where the map zooms to on a tap. */
  bbox: [number, number, number, number];
};

/** Busiest communities (most buildings) label first. Ranks are 0-based. */
export function labelZoomForRank(rank: number): number {
  if (rank < 10) return 9;
  if (rank < 30) return 10.5;
  return 12;
}

export function toAreaCollection(rows: MasterAreaDbRow[]): GeoJSON.FeatureCollection {
  const usable = rows.filter((r) => r.shape && r.lng != null && r.lat != null && r.w != null && r.s != null && r.e != null && r.n != null);
  const ranked = [...usable].sort((a, b) => b.buildings - a.buildings || a.name.localeCompare(b.name));
  const rankOf = new Map(ranked.map((r, i) => [r.name, i]));
  return {
    type: "FeatureCollection",
    features: usable.map((r) => {
      const props: MasterAreaProps = {
        name: r.name,
        nameAr: masterNameAr(r.name),
        slug: masterSlug(r.name),
        buildings: r.buildings,
        placed: r.placed,
        official: r.official,
        launch: isHandChecked(r.name),
        labelZoom: labelZoomForRank(rankOf.get(r.name) ?? 99),
        lng: Math.round((r.lng as number) * 1e5) / 1e5,
        lat: Math.round((r.lat as number) * 1e5) / 1e5,
        bbox: [r.w, r.s, r.e, r.n].map((v) => Math.round((v as number) * 1e5) / 1e5) as [number, number, number, number],
      };
      return { type: "Feature" as const, geometry: JSON.parse(r.shape as string), properties: props };
    }),
  };
}
