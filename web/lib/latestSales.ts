/** Newest counted sales for one community, anonymous: market fields only (no unit numbers, floors or parties). */
import { query } from "./db";
import { MIN_CONFIDENCE, SALE_TYPES } from "./queries";
import { LATEST_MAX, type LatestSale, type LatestScope } from "./latestSalesShared";

/** Apartments only, like every other figure on the site. Looks back 12 months so the sort stays small. */
export async function latestSales(scope: LatestScope, limit: number): Promise<LatestSale[]> {
  const where = scope.kind === "master" ? "b.master_community = $3" : "c.dm_code = $3";
  return query<LatestSale>(
    `select t.txn_date::text, b.name_en as building, b.slug, coalesce(c.name_common, c.name_official) as area, t.rooms,
            t.size_sqft::float8 as size_sqft, t.price::float8 as price, t.price_psf::float8 as price_psf, t.off_plan
       from transactions t
       join buildings b on b.id = t.building_id and b.match_confidence >= $1
       join communities c on c.id = b.community_id
      where t.excluded is null and t.property_type = any($2) and ${where}
        and t.txn_date >= (select max(txn_date) from transactions) - interval '12 months'
      order by t.txn_date desc, t.id desc limit ${Math.min(LATEST_MAX, Math.max(1, Math.floor(limit)))}`,
    [MIN_CONFIDENCE, SALE_TYPES, scope.value],
  );
}
