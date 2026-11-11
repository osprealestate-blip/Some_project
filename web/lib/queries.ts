/** Every SQL query the web app runs. Only market fields are selected; public tables hold no personal data.
 *  Dates come back as ISO text, counts as integers. Figures follow the rules in pipeline/src/dpi/metrics. */
import { one, query } from "./db";
import type { Comparables } from "./fairPrice";
import type { NearbyPlace } from "./lifeScore";

export const SALE_TYPES = ["apartment"];
export const MIN_CONFIDENCE = 0.5; // buildings matched less surely than this stay hidden

export type Summary = {
  rooms: number;
  sale_count_12m: number;
  sale_median_psf_12m: number | null;
  sale_median_price_12m: number | null;
  sale_median_size_12m?: number | null;
  sale_median_psf_prev_12m: number | null;
  rent_count_12m: number;
  rent_median_12m: number | null;
  rent_level?: RentLevel;
  gross_yield: number | null;
  period_end: string;
  source_date: string;
};

/** Extra figures on a community's all-bedrooms row (rooms = -1). */
export type CommunitySummary = Summary & {
  sale_count_ready_12m?: number;
  sale_median_psf_ready_12m?: number | null;
  sale_median_psf_ready_prev_12m?: number | null;
  sale_count_offplan_12m?: number;
  sale_median_psf_offplan_12m?: number | null;
  sale_median_psf_offplan_prev_12m?: number | null;
  like_for_like_change?: number | null;
  like_for_like_towers?: number;
};

export type Community = {
  id: number;
  dm_code: string;
  name_official: string;
  name_common: string | null;
  is_launch: boolean;
};

export type BuildingListItem = {
  slug: string;
  name_en: string;
  community: string;
  dm_code: string | null;
  sale_count_12m: number | null;
  sale_median_psf_12m: number | null;
  rent_median_12m: number | null;
  rent_level: RentLevel;
  gross_yield: number | null;
};

export type Building = {
  id: number;
  slug: string;
  name_en: string;
  aliases: string[];
  floors: number | null;
  unit_count: number | null;
  completion_year: number | null;
  height_m: number | null;
  land_number: string | null;
  match_method: string | null;
  match_confidence: number;
  geom_source: string | null;
  lng: number | null;
  lat: number | null;
  project: string | null;
  project_id: number | null;
  community_id: number;
  community: string;
  community_official: string;
  dm_code: string | null;
  project_buildings: number;
};

export type SeriesPoint = { period: string; value: number | null; count: number };
export type RecentSale = { txn_date: string; rooms: number | null; size_sqft: number; price: number; price_psf: number; off_plan: boolean | null };

const SUMMARY_COLS = `rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m, sale_median_psf_prev_12m,
  rent_count_12m, rent_median_12m, gross_yield, period_end::text, source_date::text`;
const COMMUNITY_COLS = `${SUMMARY_COLS}, sale_count_ready_12m, sale_median_psf_ready_12m, sale_median_psf_ready_prev_12m,
  sale_count_offplan_12m, sale_median_psf_offplan_12m, sale_median_psf_offplan_prev_12m, like_for_like_change,
  like_for_like_towers`;

export async function dataFreshness(): Promise<{ period_end: string | null; source_date: string | null }> {
  return (
    (await one<{ period_end: string | null; source_date: string | null }>(
      "select max(period_end)::text as period_end, max(source_date)::text as source_date from community_summary",
    )) ?? { period_end: null, source_date: null }
  );
}

// ---------- communities ----------

export async function launchCommunities(): Promise<(Community & { summary: CommunitySummary | null; buildings: number })[]> {
  const rows = await query<Community & { summary: CommunitySummary | null; buildings: number }>(
    `select c.id, c.dm_code, c.name_official, c.name_common, c.is_launch,
            (select row_to_json(s) from (select ${COMMUNITY_COLS} from community_summary
               where community_id = c.id and rooms = -1) s) as summary,
            (select count(*)::int from buildings b where b.community_id = c.id and b.match_confidence >= $1) as buildings
       from communities c where c.is_launch order by c.name_common nulls last, c.name_official`,
    [MIN_CONFIDENCE],
  );
  return rows;
}

export async function communityByCode(code: string): Promise<Community | null> {
  return one<Community>(
    "select id, dm_code, name_official, name_common, is_launch from communities where dm_code = $1",
    [code],
  );
}

export async function communitySummaries(id: number): Promise<CommunitySummary[]> {
  return query<CommunitySummary>(`select ${COMMUNITY_COLS} from community_summary where community_id = $1 order by rooms`, [id]);
}

/** Quarterly medians over ten years from the monthly table (median of monthly medians, weighted by nothing). */
export async function communitySeries(id: number): Promise<{ sales: SeriesPoint[]; rents: SeriesPoint[] }> {
  const rows = await query<{ period: string; psf: number | null; sale_count: number; rent: number | null; rent_count: number }>(
    `select date_trunc('quarter', period)::date::text as period,
            percentile_cont(0.5) within group (order by sale_median_psf) as psf, sum(sale_count)::int as sale_count,
            percentile_cont(0.5) within group (order by rent_median) as rent, sum(rent_count)::int as rent_count
       from community_metrics where community_id = $1 and rooms = -1 group by 1 order by 1`,
    [id],
  );
  return {
    sales: rows.map((r) => ({ period: r.period, value: r.sale_count >= 5 ? r.psf : null, count: r.sale_count })),
    rents: rows.map((r) => ({ period: r.period, value: r.rent_count >= 5 ? r.rent : null, count: r.rent_count })),
  };
}

export async function communityBuildings(id: number, limit = 200): Promise<BuildingListItem[]> {
  return query<BuildingListItem>(
    `select b.slug, b.name_en, coalesce(c.name_common, c.name_official) as community, c.dm_code,
            s.sale_count_12m, s.sale_median_psf_12m, s.rent_median_12m, s.rent_level,
            -- A yield only next to the rent it comes from: none when the building shows no rent.
            case when s.rent_median_12m is not null then
              (select percentile_cont(0.5) within group (order by gross_yield) from building_summary y
                where y.building_id = b.id and y.rooms >= 0) end as gross_yield
       from buildings b join communities c on c.id = b.community_id
       left join building_summary s on s.building_id = b.id and s.rooms = -1
      where b.community_id = $1 and b.match_confidence >= $2
      order by s.sale_count_12m desc nulls last, s.sale_count_all desc nulls last, b.name_en limit $3`,
    [id, MIN_CONFIDENCE, limit],
  );
}

// ---------- buildings ----------

export async function buildingBySlug(slug: string): Promise<Building | null> {
  return one<Building>(
    `select b.id, b.slug, b.name_en, b.aliases, b.floors, b.unit_count, b.completion_year, b.height_m, b.land_number,
            b.match_method, b.match_confidence, b.geom_source,
            ST_X(ST_PointOnSurface(b.geom)) as lng, ST_Y(ST_PointOnSurface(b.geom)) as lat,
            p.name as project, b.project_id, b.community_id,
            coalesce(c.name_common, c.name_official) as community, c.name_official as community_official, c.dm_code,
            (select count(*)::int from buildings o where o.project_id = b.project_id) as project_buildings
       from buildings b join communities c on c.id = b.community_id left join projects p on p.id = b.project_id
      where b.slug = $1 and b.match_confidence >= $2`,
    [slug, MIN_CONFIDENCE],
  );
}

export async function buildingSummaries(id: number): Promise<Summary[]> {
  return query<Summary>(
    `select ${SUMMARY_COLS}, sale_median_size_12m, rent_level from building_summary where building_id = $1 order by rooms`,
    [id],
  );
}

/** Quarterly median price per sq ft (sales) and annual rent (building rents, or the project's when the
 *  building has none), last eight years. Quarters with fewer than 3 deals are left empty. */
export type RentLevel = "building" | "estimated" | "project" | null;

export async function buildingSeries(b: Building): Promise<{ sales: SeriesPoint[]; rents: SeriesPoint[]; rentLevel: RentLevel }> {
  const sales = await query<{ period: string; value: number; count: number }>(
    `select date_trunc('quarter', txn_date)::date::text as period,
            percentile_cont(0.5) within group (order by price_psf) as value, count(*)::int as count
       from transactions
      where building_id = $1 and excluded is null and property_type = any($2)
        and txn_date > (select max(txn_date) from transactions) - interval '8 years'
      group by 1 order by 1`,
    [b.id, SALE_TYPES],
  );
  const rentSql = (col: string) => `
    select date_trunc('quarter', start_date)::date::text as period,
           percentile_cont(0.5) within group (order by annual_rent) as value, count(*)::int as count,
           bool_or(building_match = 'size') as est
      from rent_contracts
     where ${col} = $1 and excluded is null and rooms is not null
       and start_date > (select max(txn_date) from transactions) - interval '8 years'
       and start_date <= (select max(txn_date) from transactions)
     group by 1 order by 1`;
  let rents = await query<{ period: string; value: number; count: number; est?: boolean }>(rentSql("building_id"), [b.id]);
  let rentLevel: RentLevel = rents.length ? (rents.some((r) => r.est) ? "estimated" : "building") : null;
  if (!rents.length && b.project_id) {
    rents = await query(rentSql("project_id"), [b.project_id]);
    rentLevel = rents.length ? "project" : null;
  }
  const thin = (p: { period: string; value: number; count: number }) =>
    ({ period: p.period, count: p.count, value: p.count >= 3 ? p.value : null });
  return { sales: sales.map(thin), rents: rents.map(thin), rentLevel };
}

/** Latest counted sales: market fields only (no unit numbers, no parties). */
export async function recentSales(id: number, limit = 15): Promise<RecentSale[]> {
  return query<RecentSale>(
    `select txn_date::text, rooms, size_sqft, price::float8 as price, price_psf, off_plan
       from transactions where building_id = $1 and excluded is null
      order by txn_date desc, id desc limit $2`,
    [id, limit],
  );
}

export type Place = NearbyPlace & { source: string; source_date: string; attributes: Record<string, string>; lng: number; lat: number };

/** Places within 2 km, the nearest few per subcategory. */
export async function nearbyPlaces(b: Building, radius = 2000, perKind = 3): Promise<Place[]> {
  if (b.lng == null || b.lat == null) return [];
  return query<Place>(
    `select category, subcategory, name, distance_m, source, source_date, attributes, lng, lat from (
       select p.category, p.subcategory, p.name, p.source, p.source_date::text, p.attributes,
              ST_X(p.geom) as lng, ST_Y(p.geom) as lat,
              ST_Distance(p.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_m,
              row_number() over (partition by p.category, p.subcategory
                order by p.geom::geography <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as n
         from pois p
        where p.active and ST_DWithin(p.geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
     ) x where n <= $4 order by distance_m`,
    [b.lng, b.lat, radius, perKind],
  );
}

export async function siblingBuildings(b: Building): Promise<{ slug: string; name_en: string }[]> {
  if (!b.project_id) return [];
  return query(
    "select slug, name_en from buildings where project_id = $1 and id <> $2 and match_confidence >= $3 order by name_en",
    [b.project_id, b.id, MIN_CONFIDENCE],
  );
}

// ---------- search & map ----------

export type SearchHit = { kind: "building" | "community"; slug: string; name: string; community: string | null; psf: number | null };

export async function search(q: string, limit = 12): Promise<SearchHit[]> {
  const term = q.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (term.length < 2) return [];
  const communities = await query<SearchHit>(
    `select 'community' as kind, dm_code as slug, coalesce(name_common, name_official) as name,
            case when name_common is not null and name_common <> name_official then name_official end as community,
            null::float8 as psf
       from communities
      where dm_code is not null and (lower(name_official) like '%' || $1 || '%' or lower(coalesce(name_common, '')) like '%' || $1 || '%')
      order by is_launch desc, name_official limit 4`,
    [term],
  );
  const buildings = await query<SearchHit & { score: number }>(
    `select 'building' as kind, b.slug, b.name_en as name, coalesce(c.name_common, c.name_official) as community,
            s.sale_median_psf_12m as psf, max(greatest(similarity(a.alias_key, $1), case when a.alias_key like $1 || '%' then 0.9
                 when a.alias_key like '%' || $1 || '%' then 0.6 else 0 end)) as score
       from building_aliases a join buildings b on b.id = a.building_id join communities c on c.id = b.community_id
       left join building_summary s on s.building_id = b.id and s.rooms = -1
      where b.match_confidence >= $2 and (a.alias_key % $1 or a.alias_key like '%' || $1 || '%')
      group by b.id, c.name_common, c.name_official, s.sale_median_psf_12m, s.sale_count_12m
      order by score desc, s.sale_count_12m desc nulls last limit $3`,
    [term, MIN_CONFIDENCE, limit],
  );
  return [...communities, ...buildings.map(({ score: _score, ...h }) => h)];
}

export type MapFeature = {
  slug: string; name: string; community: string | null; lng: number; lat: number; footprint: string; height: number; approx: boolean;
  psf: number | null; prev_psf: number | null; price: number | null; rent: number | null; rent_level: string | null;
  yield: number | null; sales: number;
};

/** Placed buildings for the map. `footprint` is GeoJSON: the OpenStreetMap outline grown by 2.5 m (so our coloured
 *  tower wraps the grey basemap one instead of flickering against it), or a small octagon round an approximate
 *  position. Positions themselves are untouched here: they come from `dpi place-buildings`. */
export async function mapBuildings(): Promise<MapFeature[]> {
  return query<MapFeature>(
    `select b.slug, b.name_en as name, coalesce(c.name_common, c.name_official) as community,
            ST_X(ST_PointOnSurface(b.geom)) as lng, ST_Y(ST_PointOnSurface(b.geom)) as lat,
            ST_AsGeoJSON(case when ST_Dimension(b.geom) = 2
                              then ST_Buffer(ST_SimplifyPreserveTopology(b.geom, 0.000005)::geography, 2.5)::geometry
                              else ST_Buffer(ST_PointOnSurface(b.geom)::geography, 13, 'quad_segs=2')::geometry end, 6) as footprint,
            -- The taller of the OSM height and the DLD floor count: OSM often outlines only the podium, with the tower
            -- drawn as a separate part. At least 12 m, so a coloured block never hides inside the grey basemap one.
            greatest(coalesce(greatest(b.height_m, b.floors * 3.4), 30), 12)::float8 as height,
            ST_Dimension(b.geom) <> 2 as approx,
            s.sale_median_psf_12m as psf, s.sale_median_psf_prev_12m as prev_psf, s.sale_median_price_12m as price,
            s.rent_median_12m as rent, s.rent_level, coalesce(s.sale_count_12m, 0) as sales,
            case when s.rent_median_12m is not null then
              (select percentile_cont(0.5) within group (order by gross_yield) from building_summary y
                where y.building_id = b.id and y.rooms >= 0) end as yield
       from buildings b left join building_summary s on s.building_id = b.id and s.rooms = -1
       left join communities c on c.id = b.community_id
      where b.geom is not null and b.match_confidence >= $1`,
    [MIN_CONFIDENCE],
  );
}

// ---------- tools ----------

/** Sales of this bedroom type over the 12 months to the newest sale: the building first, its community when
 *  the building has fewer than `min` sales. */
export async function comparables(slug: string | null, communityCode: string | null, rooms: number, min = 5): Promise<Comparables | null> {
  const sql = (where: string) => `
    select count(*)::int as count,
           percentile_cont(0.25) within group (order by price_psf) as "p25Psf",
           percentile_cont(0.5) within group (order by price_psf) as "medianPsf",
           percentile_cont(0.75) within group (order by price_psf) as "p75Psf",
           min(txn_date)::text as "from", max(txn_date)::text as "to"
      from transactions t
     where ${where} and t.excluded is null and t.property_type = any($2) and least(t.rooms, 4) = $3
       and t.txn_date > (select max(txn_date) from transactions) - interval '12 months'`;
  if (slug) {
    const r = await one<Omit<Comparables, "scope">>(sql("t.building_id = (select id from buildings where slug = $1)"), [slug, SALE_TYPES, rooms]);
    if (r && r.count >= min) return { scope: "building", ...r };
  }
  const code = communityCode ?? (slug ? (await one<{ dm_code: string }>(
    "select c.dm_code from buildings b join communities c on c.id = b.community_id where b.slug = $1", [slug]))?.dm_code : null);
  if (!code) return null;
  const r = await one<Omit<Comparables, "scope">>(sql("t.community_id = (select id from communities where dm_code = $1)"), [code, SALE_TYPES, rooms]);
  return r && r.count > 0 ? { scope: "community", ...r } : null;
}

export type MarketRent = { scope: "building" | "project" | "community"; median: number; count: number; from: string; to: string };

/** Median annual rent for the bedroom type over the 12 months to the newest data: building, then project, then community. */
export async function marketRent(slug: string | null, communityCode: string | null, rooms: number): Promise<MarketRent | null> {
  const sql = (where: string) => `
    select percentile_cont(0.5) within group (order by annual_rent) as median, count(*)::int as count,
           min(start_date)::text as "from", max(start_date)::text as "to"
      from rent_contracts r
     where ${where} and r.excluded is null and least(r.rooms, 4) = $2
       and r.start_date > (select max(txn_date) from transactions) - interval '12 months'
       and r.start_date <= (select max(txn_date) from transactions)`;
  const tries: [MarketRent["scope"], string, unknown][] = [];
  if (slug) {
    tries.push(["building", "r.building_id = (select id from buildings where slug = $1)", slug]);
    tries.push(["project", "r.project_id = (select project_id from buildings where slug = $1)", slug]);
    tries.push(["community", "r.community_id = (select community_id from buildings where slug = $1)", slug]);
  } else if (communityCode) {
    tries.push(["community", "r.community_id = (select id from communities where dm_code = $1)", communityCode]);
  }
  for (const [scope, where, p] of tries) {
    const r = await one<Omit<MarketRent, "scope">>(sql(where), [p, rooms]);
    if (r && r.count >= 5 && r.median != null) return { scope, ...r };
  }
  return null;
}


export type OffPlanRent = { rooms: number; median: number; count: number; sizeLow: number; sizeHigh: number; from: string; to: string };

/** True when every counted sale of the building in the last 24 months was off-plan: not finished, so no one rents it yet. */
export async function isOffPlanOnly(buildingId: number): Promise<boolean> {
  const r = await one<{ total: number; off: number }>(
    `select count(*)::int as total, count(*) filter (where off_plan is true)::int as off
       from transactions
      where building_id = $1 and excluded is null and property_type = any($2)
        and txn_date > (select max(txn_date) from transactions) - interval '24 months'`,
    [buildingId, SALE_TYPES],
  );
  return !!r && r.total > 0 && r.off === r.total;
}

/** For a tower not yet finished: for each bedroom type it has sold, the median rent of flats of that type and a
 *  similar size (within 20% of the sizes sold) in the same community over the last 12 months. Needs 5+ contracts. */
export async function offPlanRentEstimate(b: Building): Promise<OffPlanRent[]> {
  return query<OffPlanRent>(
    `with sold as (
       select least(rooms, 4) as rooms, percentile_cont(0.5) within group (order by size_sqft) as size
         from transactions
        where building_id = $1 and excluded is null and property_type = any($2) and rooms is not null
          and txn_date > (select max(txn_date) from transactions) - interval '24 months'
        group by 1)
     select s.rooms, percentile_cont(0.5) within group (order by r.annual_rent)::float8 as median, count(*)::int as count,
            (s.size * 0.8)::float8 as "sizeLow", (s.size * 1.2)::float8 as "sizeHigh",
            min(r.start_date)::text as "from", max(r.start_date)::text as "to"
       from sold s
       join rent_contracts r on r.community_id = $3 and r.excluded is null and least(r.rooms, 4) = s.rooms
        and r.size_sqft between s.size * 0.8 and s.size * 1.2
        and r.start_date > (select max(txn_date) from transactions) - interval '12 months'
        and r.start_date <= (select max(txn_date) from transactions)
      group by s.rooms, s.size
     having count(*) >= 5
      order by s.rooms`,
    [b.id, SALE_TYPES, b.community_id],
  );
}

// ---------- compare ----------

/** Buildings and their per-bedroom summaries for the compare page, in the order of the slugs given.
 *  Slugs that match no visible building are skipped; the caller reports them as not found. */
export async function buildingSummariesBySlug(slugs: string[]): Promise<{ building: Building; summaries: Summary[] }[]> {
  const found = await Promise.all(
    slugs.map(async (slug) => {
      const building = await buildingBySlug(slug);
      return building ? { building, summaries: await buildingSummaries(building.id) } : null;
    }),
  );
  return found.filter((x): x is { building: Building; summaries: Summary[] } => x !== null);
}
