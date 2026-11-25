/** Everything the villa cluster card and page show, as JSON. Aggregates only: no unit, owner or tenant details. */
import { clusterBySlug, clusterSummaries } from "./villaClusterQueries";
import type { ClusterKind, ClusterRoomRow } from "./villaCluster";

export type VillaCardData = {
  slug: string;
  name: string;
  kind: ClusterKind;
  community: string | null;
  dmCode: string | null;
  lng: number;
  lat: number;
  /** Where the map point came from, and whether it is the centre of the cluster. */
  point: { source: string | null; isCentre: boolean; note: string | null };
  /** From the DLD audit: plots in the cluster and the records behind them. Null when not known. */
  plots: number | null;
  records: number | null;
  sizeMedianSqft: number | null;
  auditDate: string;
  periodEnd: string | null;
  sourceDate: string | null;
  summary: { sales: number; psf: number | null; price: number | null; size: number | null; rent: number | null; rentCount: number; salesAll: number; lastSale: string | null };
  rows: ClusterRoomRow[];
};

export async function villaCard(slug: string): Promise<VillaCardData | null> {
  const c = await clusterBySlug(slug);
  if (!c || c.lng == null || c.lat == null) return null;
  const sums = await clusterSummaries(c.id);
  const all = sums.find((s) => s.rooms === -1);
  const r = (v: number | null | undefined, step: number) => (v == null ? null : Math.round(v / step) * step);
  return {
    slug: c.slug, name: c.name, kind: c.kind, community: c.community, dmCode: c.dm_code, lng: c.lng, lat: c.lat,
    point: { source: c.geom_source, isCentre: c.is_cluster_point, note: c.geom_note },
    plots: c.plot_count, records: c.record_count, sizeMedianSqft: c.size_median_sqft, auditDate: c.source_date,
    periodEnd: all?.period_end ?? null, sourceDate: all?.source_date ?? null,
    summary: {
      sales: all?.sale_count_12m ?? 0, psf: r(all?.sale_median_psf_12m, 1), price: r(all?.sale_median_price_12m, 1000),
      size: r(all?.sale_median_size_12m, 1), rent: r(all?.rent_median_12m, 100), rentCount: all?.rent_count_12m ?? 0,
      salesAll: all?.sale_count_all ?? 0, lastSale: all?.last_sale_date ?? null,
    },
    rows: sums.filter((s) => s.rooms >= 0).map(({ rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m, sale_median_size_12m, rent_count_12m, rent_median_12m }) =>
      ({ rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m, sale_median_size_12m, rent_count_12m, rent_median_12m })),
  };
}
