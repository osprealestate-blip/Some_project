/** Everything the map card and the expanded panel show for one building, as JSON (market fields only). */
import type { NearestFacility } from "./facilities";
import {
  buildingBySlug, buildingSummaries, communitySummaries, dataFreshness, nearbyPlaces, nearestFacilities, recentSales, siblingBuildings,
  type Place, type RecentSale, type Summary,
} from "./queries";
import { change, median } from "./stats";
import { makeT, type Lang } from "./i18n";
import { routingConfig } from "./routing";
import { buildingVerdict, type Verdict } from "./verdict";

export type CardData = {
  slug: string;
  name: string;
  community: string;
  dmCode: string | null;
  project: string | null;
  floors: number | null;
  units: number | null;
  lng: number | null;
  lat: number | null;
  approx: boolean;
  periodEnd: string | null;
  summary: { psf: number | null; price: number | null; rent: number | null; rentLevel: string | null; yield: number | null; change: number | null; sales: number; rentCount: number };
  rows: Summary[];
  verdict: Verdict | null;
  /** The community's own 12-month medians, for the bars next to this building's figures. */
  benchmark: { psf: number | null; yield: number | null };
  facilities: NearestFacility[];
  places: Place[];
  sales: RecentSale[];
  siblings: { slug: string; name_en: string }[];
  /** True only when the owner has switched on a routing service. Walk and Drive minutes are hidden otherwise. */
  routing: boolean;
};

export async function buildingCard(slug: string, lang: Lang = "en"): Promise<CardData | null> {
  const b = await buildingBySlug(slug);
  if (!b) return null;
  const placed = b.lng != null && b.lat != null;
  const [rows, comm, places, facilities, sales, siblings, fresh] = await Promise.all([
    buildingSummaries(b.id), communitySummaries(b.community_id),
    placed ? nearbyPlaces(b) : Promise.resolve([]), placed ? nearestFacilities(b.lng!, b.lat!) : Promise.resolve([]),
    recentSales(b.id, 8), siblingBuildings(b), dataFreshness(),
  ]);
  const all = rows.find((r) => r.rooms === -1);
  const yields = rows.filter((r) => r.rooms >= 0 && r.gross_yield != null).map((r) => r.gross_yield!);
  const bYield = all?.rent_median_12m != null ? median(yields) : null;
  const cAll = comm.find((r) => r.rooms === -1);
  const verdict = buildingVerdict({
    psf: all?.sale_median_psf_12m ?? null, yield: bYield, sales: all?.sale_count_12m ?? 0,
    communityName: b.community, communityPsf: cAll?.sale_median_psf_12m ?? null, communityYield: cAll?.gross_yield ?? null,
  }, makeT(lang));
  return {
    slug: b.slug, name: b.name_en, community: b.community, dmCode: b.dm_code, project: b.project, floors: b.floors, units: b.unit_count,
    lng: b.lng, lat: b.lat, approx: !!b.geom_source && ["plot", "project", "site"].includes(b.geom_source),
    periodEnd: all?.period_end ?? fresh.period_end,
    summary: {
      psf: all?.sale_median_psf_12m ?? null, price: all?.sale_median_price_12m ?? null, rent: all?.rent_median_12m ?? null,
      rentLevel: all?.rent_level ?? null, yield: bYield, change: change(all?.sale_median_psf_12m, all?.sale_median_psf_prev_12m),
      sales: all?.sale_count_12m ?? 0, rentCount: all?.rent_count_12m ?? 0,
    },
    rows, verdict, benchmark: { psf: cAll?.sale_median_psf_12m ?? null, yield: cAll?.gross_yield ?? null }, facilities, places, sales, siblings,
    routing: routingConfig().enabled,
  };
}
