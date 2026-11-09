"""Flag sale and rent records that are far out of line with their neighbours, so medians and lists skip them.

The DLD files hold some records that cannot be market deals: an apartment sold at AED 46 per sq ft in a
tower where everything else sells near 1,500, or a studio "rented" for a million. They are usually a typo,
a part-share or an internal transfer. Like the importer's cleaning rules, they are kept with `excluded` set
to the rule name, never deleted, and every run clears the old flags first, so a re-import or a better rule
never leaves stale ones behind.

Rules (also on the About page):
- Sales (apartments): compared with the median price per sq ft of the same tower in the same year when it has
  5+ counted sales, else with the community in that year. Flagged below 40% or above 250% of the tower median,
  or below 25% or above 400% of the community median (communities mix very different towers).
- Rents (with a bedroom count): compared with the median rent for the same bedroom type (4+ grouped) in the
  same project in the same year when there are 5+ contracts, else the community. Flagged below a third or
  above three times that median.
"""
from __future__ import annotations

from dataclasses import dataclass

SALE_RULE = "price_outlier"
RENT_RULE = "rent_outlier"
MIN_GROUP = 5
SALE_BAND_TOWER = (0.40, 2.50)
SALE_BAND_COMMUNITY = (0.25, 4.00)
RENT_BAND = (1 / 3, 3.0)

_SALES = """
with base as (
  select id, building_id, community_id, extract(year from txn_date)::int as y, price_psf
  from transactions
  where excluded is null and property_type = 'apartment' and price_psf > 0
),
tower as (
  select building_id, y, percentile_cont(0.5) within group (order by price_psf) as m
  from base where building_id is not null group by 1, 2 having count(*) >= %(min)s
),
area as (
  select community_id, y, percentile_cont(0.5) within group (order by price_psf) as m
  from base where community_id is not null group by 1, 2 having count(*) >= %(min)s
),
odd as (
  select base.id from base
  left join tower on tower.building_id = base.building_id and tower.y = base.y
  left join area on area.community_id = base.community_id and area.y = base.y
  where (tower.m is not null and (base.price_psf < %(tlo)s * tower.m or base.price_psf > %(thi)s * tower.m))
     or (tower.m is null and area.m is not null
         and (base.price_psf < %(clo)s * area.m or base.price_psf > %(chi)s * area.m))
)
update transactions t set excluded = %(rule)s from odd where t.id = odd.id
"""

_RENTS = """
with base as (
  select id, project_id, community_id, least(rooms, 4) as rooms, extract(year from start_date)::int as y, annual_rent
  from rent_contracts
  where excluded is null and rooms is not null and annual_rent > 0
),
proj as (
  select project_id, rooms, y, percentile_cont(0.5) within group (order by annual_rent) as m
  from base where project_id is not null group by 1, 2, 3 having count(*) >= %(min)s
),
area as (
  select community_id, rooms, y, percentile_cont(0.5) within group (order by annual_rent) as m
  from base where community_id is not null group by 1, 2, 3 having count(*) >= %(min)s
),
odd as (
  select base.id from base
  left join proj on proj.project_id = base.project_id and proj.rooms = base.rooms and proj.y = base.y
  left join area on area.community_id = base.community_id and area.rooms = base.rooms and area.y = base.y
  where coalesce(proj.m, area.m) is not null
    and (base.annual_rent < %(lo)s * coalesce(proj.m, area.m) or base.annual_rent > %(hi)s * coalesce(proj.m, area.m))
)
update rent_contracts r set excluded = %(rule)s from odd where r.id = odd.id
"""


@dataclass
class OutlierReport:
    sales: int = 0
    rents: int = 0

    def render(self) -> str:
        return f"odd records set aside: {self.sales} sales ({SALE_RULE}), {self.rents} rents ({RENT_RULE})"


def flag(cur) -> OutlierReport:
    """Clear old flags and set new ones. Runs inside the caller's transaction."""
    rep = OutlierReport()
    cur.execute("update transactions set excluded = null where excluded = %s", (SALE_RULE,))
    cur.execute("update rent_contracts set excluded = null where excluded = %s", (RENT_RULE,))
    cur.execute(_SALES, {"min": MIN_GROUP, "rule": SALE_RULE, "tlo": SALE_BAND_TOWER[0], "thi": SALE_BAND_TOWER[1],
                         "clo": SALE_BAND_COMMUNITY[0], "chi": SALE_BAND_COMMUNITY[1]})
    rep.sales = cur.rowcount
    cur.execute(_RENTS, {"min": MIN_GROUP, "rule": RENT_RULE, "lo": RENT_BAND[0], "hi": RENT_BAND[1]})
    rep.rents = cur.rowcount
    return rep
