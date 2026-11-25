/** Database reads for villa and townhouse clusters (tables from migration 0014). Aggregates only.
 *  Every caller treats a missing table (migration not applied yet) as "no clusters". */
import { query } from "./db";
import type { ClusterKind, ClusterRoomRow } from "./villaCluster";

export type ClusterPoint = {
  slug: string; name: string; kind: ClusterKind; community: string | null; lng: number; lat: number;
  sales: number; psf: number | null; price: number | null; rent: number | null;
};

/** Clusters that have a map point. A cluster without one is never returned here. */
export async function clusterPoints(): Promise<ClusterPoint[]> {
  return query<ClusterPoint>(
    `select v.slug, v.name, v.kind, coalesce(c.name_common, c.name_official) as community,
            ST_X(v.geom) as lng, ST_Y(v.geom) as lat, coalesce(s.sale_count_12m, 0)::int as sales,
            s.sale_median_psf_12m as psf, s.sale_median_price_12m as price, s.rent_median_12m as rent
       from villa_clusters v left join communities c on c.id = v.community_id
       left join villa_cluster_summary s on s.cluster_id = v.id and s.rooms = -1
      where v.geom is not null`,
  );
}

export type ClusterDetail = {
  id: number; slug: string; name: string; kind: ClusterKind; community: string | null; dm_code: string | null;
  lng: number | null; lat: number | null; geom_source: string | null; is_cluster_point: boolean; geom_note: string | null;
  plot_count: number | null; record_count: number | null; size_median_sqft: number | null; source_date: string;
};

/** One cluster that is on the map. A cluster with no point is treated as not there. */
export async function clusterBySlug(slug: string): Promise<ClusterDetail | null> {
  const rows = await query<ClusterDetail>(
    `select v.id, v.slug, v.name, v.kind, coalesce(c.name_common, c.name_official) as community, c.dm_code,
            ST_X(v.geom) as lng, ST_Y(v.geom) as lat, v.geom_source, v.is_cluster_point, v.geom_note,
            v.plot_count, v.record_count, v.size_median_sqft, v.source_date::text as source_date
       from villa_clusters v left join communities c on c.id = v.community_id where v.slug = $1 and v.geom is not null`,
    [slug],
  );
  return rows[0] ?? null;
}

export type ClusterSummary = ClusterRoomRow & { sale_count_all: number; last_sale_date: string | null; period_end: string; source_date: string };

export async function clusterSummaries(id: number): Promise<ClusterSummary[]> {
  return query<ClusterSummary>(
    `select rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m, sale_median_size_12m, rent_count_12m, rent_median_12m,
            sale_count_all, last_sale_date::text as last_sale_date, period_end::text as period_end, source_date::text as source_date
       from villa_cluster_summary where cluster_id = $1 order by rooms`,
    [id],
  );
}

export type ClusterListItem = { slug: string; name: string; kind: ClusterKind; sales: number; psf: number | null };

/** The clusters of one official community that are on the map, busiest first. */
export async function clustersInCommunity(dmCode: string, limit = 60): Promise<ClusterListItem[]> {
  return query<ClusterListItem>(
    `select v.slug, v.name, v.kind, coalesce(s.sale_count_12m, 0)::int as sales, s.sale_median_psf_12m as psf
       from villa_clusters v join communities c on c.id = v.community_id left join villa_cluster_summary s on s.cluster_id = v.id and s.rooms = -1
      where c.dm_code = $1 and v.geom is not null order by coalesce(s.sale_count_12m, 0) desc, v.name limit $2`,
    [dmCode, limit],
  );
}

export type ClusterHit = { kind: "cluster"; slug: string; name: string; community: string | null; psf: number | null };

/** Search by name. Only clusters on the map are offered, because the result opens them there. */
export async function searchClusters(term: string, limit = 4): Promise<ClusterHit[]> {
  return query<ClusterHit>(
    `select 'cluster' as kind, v.slug, v.name, coalesce(c.name_common, c.name_official) as community, s.sale_median_psf_12m as psf
       from villa_clusters v left join communities c on c.id = v.community_id left join villa_cluster_summary s on s.cluster_id = v.id and s.rooms = -1
      where v.geom is not null and (lower(v.name) like '%' || $1 || '%' or v.name % $1)
      order by (lower(v.name) like $1 || '%') desc, similarity(v.name, $1) desc, coalesce(s.sale_count_12m, 0) desc limit $2`,
    [term, limit],
  );
}

export async function visibleClusterSlugs(): Promise<string[]> {
  const rows = await query<{ slug: string }>("select slug from villa_clusters where geom is not null order by slug limit 20000");
  return rows.map((r) => r.slug);
}
