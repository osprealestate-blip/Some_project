"""M4-M5 figures: trailing 12-month medians per building and community, and monthly community series.

Rules (also shown on the About page):
- Sales: counted DLD sales (`excluded is null`) of apartments. Medians, never means.
- Rents: counted Ejari contracts with a known bedroom count (this keeps offices and shops out).
  Where a rent has no building, the building shows its project's rents and says so (`rent_level = 'project'`).
  Where some of a building's rents were placed by unit size (matching/rents.py), `rent_level = 'estimated'`.
- Bedrooms: 0 = studio; 4 and above are grouped as 4. rooms = -1 means all bedroom types.
- The 12-month window ends on the newest sale date in the data, not today, so a stale file never looks fresh.
- Gross yield = median annual rent / median sale price over the same 12 months and bedroom type. An estimate.
  A building with fewer than 3 rents of its own uses its project's rents for that bedroom type, and says so.
- Records far out of line with their tower or area are set aside first (metrics/outliers.py).
- Communities also get ready and off-plan medians separately, and a like-for-like change: the change in each
  tower's own median per sq ft (towers with 3+ sales in both years), averaged weighted by this year's sales.
  The plain change of the community median moves with the mix of towers and off-plan sales, not just prices.
"""
from __future__ import annotations

from dataclasses import dataclass

from dpi.metrics import outliers
from dpi.metrics.outliers import OutlierReport

SALE_TYPES = ("apartment",)
MIN_COUNT = 3  # fewer counted deals than this and the median is left empty

_PERIOD = """
select max(txn_date) as period_end, max(source_date) as source_date
from transactions where excluded is null
"""

_SALES_CTE = """
with s as (
  select building_id, community_id, least(rooms, 4) as rooms, txn_date, price, price_psf, size_sqft, off_plan
  from transactions
  where excluded is null and property_type = any(%(types)s)
    and txn_date > %(end)s::date - interval '24 months' and txn_date <= %(end)s
),
s12 as (select * from s where txn_date > %(end)s::date - interval '12 months'),
sprev as (select * from s where txn_date <= %(end)s::date - interval '12 months')
"""

_BUILDING_SUMMARY = _SALES_CTE + """,
r12 as (
  select building_id, project_id, least(rooms, 4) as rooms, annual_rent, building_match
  from rent_contracts
  where excluded is null and rooms is not null
    and start_date > %(end)s::date - interval '12 months' and start_date <= %(end)s
),
sale_now as (
  select building_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         percentile_cont(0.5) within group (order by price_psf) as psf,
         percentile_cont(0.5) within group (order by price) as price,
         percentile_cont(0.5) within group (order by size_sqft) as size
  from s12 where building_id is not null
  group by grouping sets ((building_id, rooms), (building_id))
  having grouping(rooms) = 1 or rooms is not null
),
sale_prev as (
  select building_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         percentile_cont(0.5) within group (order by price_psf) as psf
  from sprev where building_id is not null
  group by grouping sets ((building_id, rooms), (building_id))
  having grouping(rooms) = 1 or rooms is not null
),
rent_b as (
  select building_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         bool_or(building_match = 'size') as est,
         percentile_cont(0.5) within group (order by annual_rent) as rent
  from r12 where building_id is not null
  group by grouping sets ((building_id, rooms), (building_id))
  having grouping(rooms) = 1 or rooms is not null
),
rent_p as (
  select project_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         percentile_cont(0.5) within group (order by annual_rent) as rent
  from r12 where project_id is not null
  group by grouping sets ((project_id, rooms), (project_id))
  having grouping(rooms) = 1 or rooms is not null
),
all_time as (
  select building_id, count(*) as n, max(txn_date) as last_sale
  from transactions where excluded is null and building_id is not null group by building_id
),
keys as (
  select building_id, rooms from sale_now
  union select building_id, rooms from rent_b
  union select b.id, rp.rooms from buildings b join rent_p rp on rp.project_id = b.project_id
  union select building_id, -1 from all_time
)
insert into building_summary (building_id, rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m,
  sale_median_size_12m, sale_median_psf_prev_12m, rent_count_12m, rent_median_12m, rent_level, gross_yield,
  sale_count_all, last_sale_date, period_end, source_date)
select k.building_id, k.rooms,
  coalesce(sn.n, 0),
  case when sn.n >= %(min)s then sn.psf end,
  case when sn.n >= %(min)s then sn.price end,
  case when sn.n >= %(min)s then sn.size end,
  case when sp.n >= %(min)s then sp.psf end,
  case when rb.n >= %(min)s then rb.n when rp.n >= %(min)s then rp.n else coalesce(rb.n, rp.n, 0) end,
  case when rb.n >= %(min)s then rb.rent when rp.n >= %(min)s then rp.rent end,
  case when rb.n >= %(min)s and rb.est then 'estimated' when rb.n >= %(min)s then 'building'
       when rp.n >= %(min)s then 'project' end,
  null,
  case when k.rooms = -1 then coalesce(a.n, 0) else 0 end,
  case when k.rooms = -1 then a.last_sale end,
  %(end)s, %(source_date)s
from keys k
join buildings b on b.id = k.building_id
left join sale_now sn on sn.building_id = k.building_id and sn.rooms = k.rooms
left join sale_prev sp on sp.building_id = k.building_id and sp.rooms = k.rooms
left join rent_b rb on rb.building_id = k.building_id and rb.rooms = k.rooms
left join rent_p rp on rp.project_id = b.project_id and rp.rooms = k.rooms
left join all_time a on a.building_id = k.building_id
"""

_COMMUNITY_SUMMARY = _SALES_CTE + """,
r12 as (
  select community_id, least(rooms, 4) as rooms, annual_rent from rent_contracts
  where excluded is null and rooms is not null and community_id is not null
    and start_date > %(end)s::date - interval '12 months' and start_date <= %(end)s
),
sale_now as (
  select community_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         percentile_cont(0.5) within group (order by price_psf) as psf,
         percentile_cont(0.5) within group (order by price) as price
  from s12 where community_id is not null
  group by grouping sets ((community_id, rooms), (community_id))
  having grouping(rooms) = 1 or rooms is not null
),
sale_prev as (
  select community_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         percentile_cont(0.5) within group (order by price_psf) as psf
  from sprev where community_id is not null
  group by grouping sets ((community_id, rooms), (community_id))
  having grouping(rooms) = 1 or rooms is not null
),
rent as (
  select community_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms, count(*) as n,
         percentile_cont(0.5) within group (order by annual_rent) as rent
  from r12 group by grouping sets ((community_id, rooms), (community_id))
  having grouping(rooms) = 1 or rooms is not null
),
keys as (select community_id, rooms from sale_now union select community_id, rooms from rent),
bc as (select community_id, count(*) as n from buildings group by community_id)
insert into community_summary (community_id, rooms, sale_count_12m, sale_median_psf_12m, sale_median_price_12m,
  sale_median_psf_prev_12m, rent_count_12m, rent_median_12m, gross_yield, building_count, period_end, source_date)
select k.community_id, k.rooms, coalesce(sn.n, 0),
  case when sn.n >= %(min)s then sn.psf end,
  case when sn.n >= %(min)s then sn.price end,
  case when sp.n >= %(min)s then sp.psf end,
  coalesce(r.n, 0),
  case when r.n >= %(min)s then r.rent end,
  null,
  coalesce(bc.n, 0), %(end)s, %(source_date)s
from keys k
left join sale_now sn on sn.community_id = k.community_id and sn.rooms = k.rooms
left join sale_prev sp on sp.community_id = k.community_id and sp.rooms = k.rooms
left join rent r on r.community_id = k.community_id and r.rooms = k.rooms
left join bc on bc.community_id = k.community_id
"""

# Ready and off-plan separately, all bedroom types (rooms = -1), each against its own previous 12 months.
_COMMUNITY_SEGMENTS = _SALES_CTE + """,
seg as (
  select community_id,
    count(*) filter (where not off_plan and txn_date > %(end)s::date - interval '12 months') as rn,
    percentile_cont(0.5) within group (order by price_psf) filter (where not off_plan and txn_date > %(end)s::date - interval '12 months') as rpsf,
    count(*) filter (where not off_plan and txn_date <= %(end)s::date - interval '12 months') as rnp,
    percentile_cont(0.5) within group (order by price_psf) filter (where not off_plan and txn_date <= %(end)s::date - interval '12 months') as rpsfp,
    count(*) filter (where off_plan and txn_date > %(end)s::date - interval '12 months') as on_,
    percentile_cont(0.5) within group (order by price_psf) filter (where off_plan and txn_date > %(end)s::date - interval '12 months') as opsf,
    count(*) filter (where off_plan and txn_date <= %(end)s::date - interval '12 months') as onp,
    percentile_cont(0.5) within group (order by price_psf) filter (where off_plan and txn_date <= %(end)s::date - interval '12 months') as opsfp
  from s where community_id is not null and off_plan is not null group by 1
),
tower as (
  select community_id, building_id,
    count(*) filter (where txn_date > %(end)s::date - interval '12 months') as n,
    percentile_cont(0.5) within group (order by price_psf) filter (where txn_date > %(end)s::date - interval '12 months') as psf,
    count(*) filter (where txn_date <= %(end)s::date - interval '12 months') as np,
    percentile_cont(0.5) within group (order by price_psf) filter (where txn_date <= %(end)s::date - interval '12 months') as psfp
  from s where community_id is not null and building_id is not null group by 1, 2
),
lfl as (
  select community_id, count(*) as towers, exp(sum(n * ln(psf / psfp)) / sum(n)) - 1 as chg
  from tower where n >= %(min)s and np >= %(min)s and psf > 0 and psfp > 0 group by 1
)
update community_summary cs set
  sale_count_ready_12m = coalesce(seg.rn, 0),
  sale_median_psf_ready_12m = case when seg.rn >= %(min)s then seg.rpsf end,
  sale_median_psf_ready_prev_12m = case when seg.rnp >= %(min)s then seg.rpsfp end,
  sale_count_offplan_12m = coalesce(seg.on_, 0),
  sale_median_psf_offplan_12m = case when seg.on_ >= %(min)s then seg.opsf end,
  sale_median_psf_offplan_prev_12m = case when seg.onp >= %(min)s then seg.opsfp end,
  like_for_like_change = case when lfl.towers >= %(min)s then lfl.chg end,
  like_for_like_towers = coalesce(lfl.towers, 0)
from seg full join lfl on lfl.community_id = seg.community_id
where cs.rooms = -1 and cs.community_id = coalesce(seg.community_id, lfl.community_id)
"""

# Yield only where rent and price describe the same bedroom type (not the mixed "all" row).
_YIELD = """
update {table} set gross_yield = round((rent_median_12m / sale_median_price_12m)::numeric, 4)
where rooms >= 0 and rent_median_12m is not null and sale_median_price_12m > 0
"""

_COMMUNITY_SERIES = """
insert into community_metrics (community_id, period, rooms, sale_median_psf, sale_count, rent_median, rent_count, source_date)
select coalesce(s.community_id, r.community_id), coalesce(s.period, r.period), -1,
       s.psf, coalesce(s.n, 0), r.rent, coalesce(r.n, 0), %(source_date)s
from (
  select community_id, date_trunc('month', txn_date)::date as period, count(*) as n,
         percentile_cont(0.5) within group (order by price_psf) as psf
  from transactions
  where excluded is null and property_type = any(%(types)s) and community_id is not null
    and txn_date > %(end)s::date - interval '10 years'
  group by 1, 2
) s
full join (
  select community_id, date_trunc('month', start_date)::date as period, count(*) as n,
         percentile_cont(0.5) within group (order by annual_rent) as rent
  from rent_contracts
  where excluded is null and rooms is not null and community_id is not null
    and start_date > %(end)s::date - interval '10 years' and start_date <= %(end)s
  group by 1, 2
) r on r.community_id = s.community_id and r.period = s.period
"""


@dataclass
class MetricsReport:
    period_end: object = None
    source_date: object = None
    building_rows: int = 0
    community_rows: int = 0
    series_rows: int = 0
    outliers: OutlierReport | None = None

    def render(self) -> str:
        return ((self.outliers.render() + "\n" if self.outliers else "") + f"window ends: {self.period_end} (newest DLD file {self.source_date})\n"
                f"building summary rows: {self.building_rows}\ncommunity summary rows: {self.community_rows}\n"
                f"community monthly rows: {self.series_rows}")


def run(conn) -> MetricsReport:
    rep = MetricsReport()
    with conn.cursor() as cur:
        rep.outliers = outliers.flag(cur)
        cur.execute(_PERIOD)
        rep.period_end, rep.source_date = cur.fetchone()
        if rep.period_end is None:
            raise SystemExit("No counted sales in the database. Import DLD sales first.")
        p = {"end": rep.period_end, "source_date": rep.source_date, "types": list(SALE_TYPES), "min": MIN_COUNT}
        cur.execute("delete from building_summary")
        cur.execute(_BUILDING_SUMMARY, p)
        rep.building_rows = cur.rowcount
        cur.execute(_YIELD.format(table="building_summary"))
        cur.execute("delete from community_summary")
        cur.execute(_COMMUNITY_SUMMARY, p)
        rep.community_rows = cur.rowcount
        cur.execute(_COMMUNITY_SEGMENTS, p)
        cur.execute(_YIELD.format(table="community_summary"))
        cur.execute("delete from community_metrics")
        cur.execute(_COMMUNITY_SERIES, p)
        rep.series_rows = cur.rowcount
    conn.commit()
    return rep
