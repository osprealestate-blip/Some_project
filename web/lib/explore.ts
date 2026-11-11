import { query } from "@/lib/db";
import { MIN_CONFIDENCE, type BuildingListItem } from "@/lib/queries";

/** Read-only filter over building_summary for the Buildings page and /api/explore. No new calculations: it
 *  selects rows the pipeline already produced. Prices are AED; yield is a fraction (0.07 = 7%). */
export type ExploreFilters = {
  community: string; // DM code
  rooms: number; // -1 = any bedroom type, 0 = studio, 1..4
  maxPrice: number | null; // median sale price at or under this, AED
  minYield: number | null; // gross yield at or over this, as a fraction
};

export type ExploreItem = BuildingListItem & { sale_median_price_12m: number | null };

export function parseFilters(sp: URLSearchParams, community: string): ExploreFilters {
  const num = (k: string) => {
    const raw = sp.get(k)?.replace(/,/g, "").trim();
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const rooms = Number(sp.get("rooms"));
  const y = num("minYield");
  return {
    community,
    rooms: sp.get("rooms") != null && sp.get("rooms") !== "" && Number.isInteger(rooms) && rooms >= -1 && rooms <= 4 ? rooms : -1,
    maxPrice: num("maxPrice"),
    minYield: y != null ? Math.min(y, 100) / 100 : null,
  };
}

export async function exploreBuildings(f: ExploreFilters, limit = 300): Promise<ExploreItem[]> {
  return query<ExploreItem>(
    `select * from (
       select b.slug, b.name_en, coalesce(c.name_common, c.name_official) as community, c.dm_code,
              s.sale_count_12m, s.sale_median_psf_12m, s.sale_median_price_12m, s.rent_median_12m, s.rent_level,
              case when s.rent_median_12m is not null then
                case when $2::int = -1
                  then (select percentile_cont(0.5) within group (order by gross_yield) from building_summary y
                         where y.building_id = b.id and y.rooms >= 0)
                  else s.gross_yield end
              end as gross_yield
         from buildings b
         join communities c on c.id = b.community_id
         join building_summary s on s.building_id = b.id and s.rooms = $2::int
        where c.dm_code = $1 and b.match_confidence >= $5 and s.sale_count_12m > 0
          and ($3::numeric is null or s.sale_median_price_12m <= $3::numeric)
     ) t
     where ($4::numeric is null or t.gross_yield >= $4::numeric)
     order by t.sale_count_12m desc nulls last, t.name_en
     limit $6`,
    [f.community, f.rooms, f.maxPrice, f.minYield, MIN_CONFIDENCE, limit],
  );
}
