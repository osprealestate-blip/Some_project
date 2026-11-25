/** SQL for master community pages. Market figures and names only. The figure tables (master_community_summary,
 *  master_community_metrics, db/migrations/0012) are filled by `dpi compute-metrics`; where a database does not have them yet
 *  the pages still list buildings and counts, and say the figures are not computed (`figures: false`). */
import { one, query } from "./db";
import { MIN_CONFIDENCE, type CommunitySummary, type RentLevel, type SeriesPoint } from "./queries";
import type { IndexRow, MasterBuilding } from "./masterCommunities";
import type { MasterAreaDbRow } from "./masterAreas";
import { findMaster, isHandChecked, masterSlug, UNBUILT_OFFICIAL_AREAS } from "./masterCommunities";
import { change } from "./stats";
import { clusterMasterCounts } from "./villaClusterQueries";

const MISSING = new Set(["42P01", "42703"]); // table or column not there yet
const missing = (e: unknown) => MISSING.has((e as { code?: string }).code ?? "");

/** Every master community that has at least one visible building, A to Z. */
export async function masterNames(): Promise<string[]> {
  const rows = await query<{ name: string }>(
    "select distinct master_community as name from buildings where master_community is not null and match_confidence >= $1 order by 1",
    [MIN_CONFIDENCE],
  );
  const clusters = await clusterMasterCounts().catch(() => []); // before migration 0015 there are none
  return [...new Set([...rows.map((r) => r.name), ...clusters.map((c) => c.name)])].sort((a, b) => a.localeCompare(b));
}

/** Adds each community's cluster count, and a row for communities that have clusters but no building pages. */
async function withClusters(rows: IndexRow[]): Promise<IndexRow[]> {
  const counts = new Map((await clusterMasterCounts().catch(() => [])).map((c) => [c.name, c.clusters]));
  const out = rows.map((r) => ({ ...r, clusters: counts.get(r.name) ?? 0 }));
  const seen = new Set(rows.map((r) => r.name));
  for (const [name, clusters] of counts) {
    if (!seen.has(name)) out.push({ name, slug: masterSlug(name), buildings: 0, placed: 0, clusters, sales: 0, psf: null, rent: null, yield: null, yoy: null, handChecked: false });
  }
  return out;
}

export async function resolveMaster(part: string): Promise<string | null> {
  return findMaster(part, await masterNames());
}

export async function masterIndex(): Promise<{ rows: IndexRow[]; figures: boolean; periodEnd: string | null }> {
  type R = { name: string; buildings: number; placed: number; sales: number; psf: number | null; psf_prev: number | null; rent: number | null; lfl: number | null; yield: number | null };
  const toRow = (r: R): IndexRow => ({
    name: r.name, slug: masterSlug(r.name), buildings: r.buildings, placed: r.placed, sales: r.sales, psf: r.psf, rent: r.rent,
    yield: r.yield, yoy: r.lfl ?? change(r.psf, r.psf_prev), handChecked: isHandChecked(r.name),
  });
  try {
    const rows = await query<R>(
      `with b as (
         select master_community as name, count(*)::int as buildings, count(geom)::int as placed
           from buildings where master_community is not null and match_confidence >= $1 group by 1)
       select b.name, b.buildings, b.placed, coalesce(m.sale_count_12m, 0)::int as sales,
              m.sale_median_psf_12m as psf, m.sale_median_psf_prev_12m as psf_prev, m.rent_median_12m as rent,
              m.like_for_like_change as lfl,
              (select percentile_cont(0.5) within group (order by y.gross_yield) from master_community_summary y
                where y.master_community = b.name and y.rooms >= 0 and y.rent_median_12m is not null and y.gross_yield is not null) as yield
         from b left join master_community_summary m on m.master_community = b.name and m.rooms = -1
        order by sales desc, b.name`,
      [MIN_CONFIDENCE],
    );
    const pe = await one<{ d: string | null }>("select max(period_end)::text as d from master_community_summary");
    return { rows: await withClusters(rows.map(toRow)), figures: rows.some((r) => r.sales > 0 || r.psf != null), periodEnd: pe?.d ?? null };
  } catch (e) {
    if (!missing(e)) throw e;
    // Figure tables not on this database yet: counts from the building summaries, no medians.
    const rows = await query<R>(
      `select b.master_community as name, count(*)::int as buildings, count(b.geom)::int as placed,
              coalesce(sum(s.sale_count_12m), 0)::int as sales, null::float8 as psf, null::float8 as psf_prev, null::float8 as rent,
              null::float8 as lfl, null::float8 as yield
         from buildings b left join building_summary s on s.building_id = b.id and s.rooms = -1
        where b.master_community is not null and b.match_confidence >= $1 group by 1 order by sales desc, 1`,
      [MIN_CONFIDENCE],
    );
    return { rows: await withClusters(rows.map(toRow)), figures: false, periodEnd: null };
  }
}

export type MasterPage = {
  name: string;
  summaries: CommunitySummary[];
  series: { sales: SeriesPoint[]; rents: SeriesPoint[] };
  /** False when the figure tables are missing on this database. */
  figures: boolean;
  areas: { code: string; name: string; buildings: number }[];
  developers: { name: string; buildings: number }[];
  buildings: MasterBuilding[];
};

const SUMMARY_COLS = `rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m, sale_median_psf_prev_12m,
  rent_count_12m, rent_median_12m, gross_yield, period_end::text, source_date::text,
  sale_count_ready_12m, sale_median_psf_ready_12m, sale_median_psf_ready_prev_12m,
  sale_count_offplan_12m, sale_median_psf_offplan_12m, sale_median_psf_offplan_prev_12m, like_for_like_change, like_for_like_towers`;

export async function masterBuildings(name: string): Promise<MasterBuilding[]> {
  type R = {
    slug: string; name: string; complex_key: string | null; complex_name: string | null; developer: string | null; year: number | null;
    use: string | null; sales: number; offplan: number; psf: number | null; rent: number | null; rent_level: RentLevel; yield: number | null; placed: boolean;
  };
  const sql = (offplan: string) => `
    select b.slug, b.name_en as name, b.complex_key, b.complex_name, p.developer_name as developer, b.completion_year as year,
           b.building_type as use, coalesce(s.sale_count_12m, 0)::int as sales, ${offplan} as offplan,
           s.sale_median_psf_12m::float8 as psf, s.rent_median_12m::float8 as rent, s.rent_level,
           case when s.rent_median_12m is not null then
             (select percentile_cont(0.5) within group (order by gross_yield) from building_summary y
               where y.building_id = b.id and y.rooms >= 0) end::float8 as yield,
           (b.geom is not null) as placed
      from buildings b
      left join projects p on p.id = b.project_id
      left join building_summary s on s.building_id = b.id and s.rooms = -1
     where b.master_community = $1 and b.match_confidence >= $2
     order by s.sale_count_12m desc nulls last, s.sale_count_all desc nulls last, b.name_en`;
  let rows: R[];
  try {
    rows = await query<R>(sql("coalesce(s.sale_count_offplan_12m, 0)::int"), [name, MIN_CONFIDENCE]);
  } catch (e) {
    if (!missing(e)) throw e;
    rows = await query<R>(sql("0"), [name, MIN_CONFIDENCE]);
  }
  return rows.map((r) => ({
    slug: r.slug, name: r.name, complexKey: r.complex_key, complexName: r.complex_name, developer: r.developer, year: r.year, use: r.use,
    sales: r.sales, offplanSales: r.offplan, psf: r.psf, rent: r.rent, rentLevel: r.rent_level, yield: r.yield, placed: r.placed,
  }));
}

export async function masterPage(name: string): Promise<MasterPage> {
  const [buildings, areas, developers] = await Promise.all([
    masterBuildings(name),
    query<{ code: string; name: string; buildings: number }>(
      `select c.dm_code as code, c.name_official as name, count(*)::int as buildings
         from buildings b join communities c on c.id = b.community_id
        where b.master_community = $1 and b.match_confidence >= $2 and c.dm_code is not null group by 1, 2 order by 3 desc, 2`,
      [name, MIN_CONFIDENCE],
    ),
    query<{ name: string; buildings: number }>(
      `select p.developer_name as name, count(*)::int as buildings
         from buildings b join projects p on p.id = b.project_id
        where b.master_community = $1 and b.match_confidence >= $2 and p.developer_name is not null group by 1 order by 2 desc, 1 limit 4`,
      [name, MIN_CONFIDENCE],
    ).catch(() => [] as { name: string; buildings: number }[]),
  ]);
  let summaries: CommunitySummary[] = [];
  let series: MasterPage["series"] = { sales: [], rents: [] };
  let figures = true;
  try {
    summaries = await query<CommunitySummary>(`select ${SUMMARY_COLS} from master_community_summary where master_community = $1 order by rooms`, [name]);
    const rows = await query<{ period: string; psf: number | null; sale_count: number; rent: number | null; rent_count: number }>(
      `select date_trunc('quarter', period)::date::text as period,
              percentile_cont(0.5) within group (order by sale_median_psf) as psf, sum(sale_count)::int as sale_count,
              percentile_cont(0.5) within group (order by rent_median) as rent, sum(rent_count)::int as rent_count
         from master_community_metrics where master_community = $1 group by 1 order by 1`,
      [name],
    );
    series = {
      sales: rows.map((r) => ({ period: r.period, value: r.sale_count >= 5 ? r.psf : null, count: r.sale_count })),
      rents: rows.map((r) => ({ period: r.period, value: r.rent_count >= 5 ? r.rent : null, count: r.rent_count })),
    };
  } catch (e) {
    if (!missing(e)) throw e;
    figures = false;
  }
  return { name, summaries, series, figures, areas, developers, buildings };
}

/** Master communities that have buildings in an official area, for the link from /community/<number>. */
export async function mastersInArea(dmCode: string): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `select b.master_community as name from buildings b join communities c on c.id = b.community_id
      where c.dm_code = $1 and b.master_community is not null and b.match_confidence >= $2
      group by 1 order by count(*) desc limit 6`,
    [dmCode, MIN_CONFIDENCE],
  );
  return rows.map((r) => r.name);
}

/** Buildings of a master community for the map filter (?f=master:<slug>): only those with a position. */
export async function buildingsInMaster(name: string): Promise<{ name: string; slugs: string[] }> {
  const rows = await query<{ slug: string }>(
    "select slug from buildings where master_community = $1 and geom is not null and match_confidence >= $2",
    [name, MIN_CONFIDENCE],
  );
  return { name, slugs: rows.map((r) => r.slug) };
}

/** Search hits: master communities whose name contains the words typed. */
export async function searchMasters(term: string, limit = 4): Promise<{ name: string; slug: string }[]> {
  const rows = await query<{ name: string; n: number }>(
    `select master_community as name, count(*)::int as n from buildings
      where master_community is not null and match_confidence >= $2 and lower(master_community) like '%' || $1 || '%'
      group by 1 order by (lower(master_community) like $1 || '%') desc, n desc limit $3`,
    [term, MIN_CONFIDENCE, limit],
  );
  return rows.map((r) => ({ name: r.name, slug: masterSlug(r.name) }));
}

/** One outline per master community for the map. The official Dubai Municipality polygon when the community is exactly one
 *  official area (every building matched by area); otherwise a hull round its placed buildings, kept approximate.
 *  Buildings more than 1.5 km from any other one get their own hull (clustered with ST_ClusterDBSCAN), so a stray
 *  building does not stretch one outline across the city. Label and zoom box use the biggest cluster. */
export async function masterAreaRows(): Promise<MasterAreaDbRow[]> {
  return query(
    `with a as (
       select b.master_community as name, count(*)::int as buildings, count(b.geom)::int as placed,
              (count(*) filter (where b.master_community_source = 'area') = count(*) and count(distinct b.community_id) = 1) as one_area,
              min(b.community_id) as cid
         from buildings b where b.master_community is not null and b.match_confidence >= $1 group by 1),
     p as (
       select master_community as name, ST_Transform(ST_PointOnSurface(geom), 32640) as g,
              ST_ClusterDBSCAN(ST_Transform(ST_PointOnSurface(geom), 32640), 1500, 1) over (partition by master_community) as k
         from buildings where master_community is not null and geom is not null and match_confidence >= $1),
     h as (select name, k, count(*) as n, ST_Buffer(ST_ConvexHull(ST_Collect(g)), 180) as hull from p group by name, k),
     hs as (select name, ST_Transform(ST_Collect(hull), 4326) as shp, ST_Transform((array_agg(hull order by n desc))[1], 4326) as main from h group by name),
     s as (
       select a.name, a.buildings, a.placed,
              case when a.one_area and c.geom is not null and a.name <> all($2::text[]) then ST_SimplifyPreserveTopology(c.geom, 0.0002) else hs.shp end as shp,
              case when a.one_area and c.geom is not null and a.name <> all($2::text[]) then ST_SimplifyPreserveTopology(c.geom, 0.0002) else hs.main end as main,
              (a.one_area and c.geom is not null and a.name <> all($2::text[])) as official
         from a left join communities c on c.id = a.cid left join hs on hs.name = a.name)
     select name, buildings, placed, official, ST_AsGeoJSON(shp, 5) as shape,
            ST_X(ST_PointOnSurface(main)) as lng, ST_Y(ST_PointOnSurface(main)) as lat,
            ST_XMin(main) as w, ST_YMin(main) as s, ST_XMax(main) as e, ST_YMax(main) as n
       from s where shp is not null`,
    [MIN_CONFIDENCE, [...UNBUILT_OFFICIAL_AREAS]],
  );
}
