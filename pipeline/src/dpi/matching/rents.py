"""Estimate a rent contract's building from its exact unit size and bedroom count.

Ejari rent contracts name a project at most, never the tower. But flats in a tower come in a handful of
exact sizes, and DLD sales tell us which sizes each tower has. So a rent of a 2-bed of 1,234.5 sq ft in a
community where only one tower has sold 2-beds of that size (within 1 sq ft) almost certainly sits in that
tower. Only a unique fit backed by at least MIN_SUPPORT sales of that layout is used; when two towers share a
layout, or the tower has sold it only once or twice (a typo or a one-off), the rent stays at project or
community level. Rents linked this way are marked `building_match = 'size'` and shown as estimated.

`backtest()` measures how often this is right where the true building is known.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

TOLERANCE_SQFT = 1  # sizes within +-1 sq ft count as the same layout
MAX_SIZE_SQFT = 1_000_000  # the rent files hold typos above this, some too big for an integer; never a flat
MIN_SUPPORT = 6  # sales of that exact layout in that tower before a rent is placed there (backtest: 87% right)

# Exact sizes per building and bedroom count, from counted apartment sales.
_FINGERPRINTS = """
create temp table _fp on commit drop as
with base as (
  select t.community_id, t.rooms, round(t.size_sqft)::int as k, t.building_id, b.project_id, count(*) as n
  from transactions t join buildings b on b.id = t.building_id
  where t.excluded is null and t.property_type = 'apartment' and t.rooms is not null
    and t.size_sqft > 0 and t.size_sqft < {max_size}
    {where}
  group by 1, 2, 3, 4, 5
)
select community_id, rooms, k + d as k, building_id, project_id, sum(n) as n
from base cross join generate_series(-%(tol)s::int, %(tol)s::int) d
group by 1, 2, 3, 4, 5
"""


def _fingerprints(cur, before: date | None = None) -> None:
    cur.execute("drop table if exists _fp")
    where = "and t.txn_date < %(before)s" if before else ""
    cur.execute(_FINGERPRINTS.format(where=where, max_size=MAX_SIZE_SQFT), {"tol": TOLERANCE_SQFT, "before": before})
    cur.execute("create index on _fp (community_id, rooms, k)")


# Candidate buildings per rent; a rent with a project only looks at towers of that project.
_UNIQUE_FIT = """
select r.id, min(f.building_id) as building_id
from rent_contracts r
join _fp f on f.community_id = r.community_id and f.rooms = r.rooms and f.k = case when r.size_sqft < {max_size} then round(r.size_sqft)::int end
where {where} and r.size_sqft > 0 and r.rooms is not null
  and (r.project_id is null or f.project_id = r.project_id {ignore_project})
group by r.id
having count(distinct f.building_id) = 1 and sum(f.n) >= {min_support}
"""


def estimate(cur) -> int:
    """Link rents that have no building to the one tower whose sold sizes fit. Returns rows linked."""
    cur.execute("update rent_contracts set building_id = null, building_match = null where building_match = 'size'")
    _fingerprints(cur)
    sql = _UNIQUE_FIT.format(where="r.building_id is null and r.excluded is null", ignore_project="", max_size=MAX_SIZE_SQFT,
                            min_support=MIN_SUPPORT)
    cur.execute(f"update rent_contracts r set building_id = u.building_id, building_match = 'size' "
                f"from ({sql}) u where r.id = u.id")
    return cur.rowcount


@dataclass
class Backtest:
    sales_tested: int = 0
    sales_predicted: int = 0
    sales_correct: int = 0
    rents_tested: int = 0
    rents_predicted: int = 0
    rents_correct: int = 0
    value_pairs: int = 0
    value_median_abs_pct: float | None = None
    value_within_10pct: float | None = None
    notes: list[str] = field(default_factory=list)

    def render(self) -> str:
        pct = lambda a, b: f"{100 * a / b:.1f}%" if b else "n/a"  # noqa: E731
        lines = [
            "1. Sales since 2025, matched only from sizes sold before 2025 (true tower known):",
            f"   a tower was picked for {self.sales_predicted} of {self.sales_tested} ({pct(self.sales_predicted, self.sales_tested)}); "
            f"right tower {self.sales_correct} times ({pct(self.sales_correct, self.sales_predicted)} of picks)",
            "2. Rents in single-tower projects, matched with the project hidden (true tower known):",
            f"   a tower was picked for {self.rents_predicted} of {self.rents_tested} ({pct(self.rents_predicted, self.rents_tested)}); "
            f"right tower {self.rents_correct} times ({pct(self.rents_correct, self.rents_predicted)} of picks)",
        ]
        if self.value_pairs:
            lines += [
                "3. Median rent of the contracts the estimate places in a tower vs the contracts really there",
                "   (same tower and bedroom type, last 24 months, wrong placements included):",
                f"   {self.value_pairs} pairs; median difference {self.value_median_abs_pct:.1f}%; "
                f"within 10%: {self.value_within_10pct:.0f}% of pairs",
            ]
        else:
            lines.append("3. Not enough towers with both exact and estimated rents to compare medians.")
        return "\n".join(lines + self.notes)


def backtest(conn, cutoff: date = date(2025, 1, 1)) -> Backtest:
    """Read-only accuracy check. Rolls back everything it creates."""
    bt = Backtest()
    with conn.cursor() as cur:
        # 1. Sales: learn sizes from older sales, predict the tower of newer ones (project hidden).
        _fingerprints(cur, before=cutoff)
        cur.execute("""
            with s as (
              select id, community_id, rooms, round(size_sqft)::int as k, building_id from transactions
              where excluded is null and property_type = 'apartment' and building_id is not null
                and rooms is not null and size_sqft > 0 and size_sqft < %(max)s and txn_date >= %(c)s
            ), fit as (
              select s.id, min(f.building_id) as pick, count(distinct f.building_id) as n, sum(f.n) as support
              from s join _fp f on f.community_id = s.community_id and f.rooms = s.rooms and f.k = s.k
              group by s.id
            )
            select count(*), count(*) filter (where fit.n = 1 and fit.support >= %(min)s),
                   count(*) filter (where fit.n = 1 and fit.support >= %(min)s and fit.pick = s.building_id)
            from s left join fit on fit.id = s.id
        """, {"c": cutoff, "max": MAX_SIZE_SQFT, "min": MIN_SUPPORT})
        bt.sales_tested, bt.sales_predicted, bt.sales_correct = cur.fetchone()

        # 2. Rents whose tower is known exactly, predicted as if their project were unknown.
        _fingerprints(cur)
        sql = _UNIQUE_FIT.format(where="r.building_match = 'project' and r.excluded is null", ignore_project="or true",
                                 max_size=MAX_SIZE_SQFT, min_support=MIN_SUPPORT)
        cur.execute(f"create temp table _pred on commit drop as {sql}")
        cur.execute("""
            select (select count(*) from rent_contracts where building_match = 'project' and excluded is null
                      and size_sqft > 0 and rooms is not null),
                   count(*), count(*) filter (where p.building_id = r.building_id)
            from _pred p join rent_contracts r on r.id = p.id
        """)
        bt.rents_tested, bt.rents_predicted, bt.rents_correct = cur.fetchone()

        # 3. Value check, mistakes included: per tower and bedroom type, the median rent of the contracts the
        #    estimate would place there vs the median of the contracts really there. Last 24 months, 5+ each.
        cur.execute("""
            with recent as (
              select r.id, r.building_id, least(r.rooms, 4) as rooms, r.annual_rent, p.building_id as pick
              from rent_contracts r left join _pred p on p.id = r.id
              where r.building_match = 'project' and r.excluded is null and r.rooms is not null
                and r.start_date > (select max(start_date) from rent_contracts where excluded is null) - interval '24 months'
            ), actual as (
              select building_id, rooms, count(*) as n, percentile_cont(0.5) within group (order by annual_rent) as med
              from recent group by 1, 2 having count(*) >= 5
            ), est as (
              select pick as building_id, rooms, count(*) as n, percentile_cont(0.5) within group (order by annual_rent) as med
              from recent where pick is not null group by 1, 2 having count(*) >= 5
            ), pairs as (
              select abs(e.med - a.med) / a.med as err
              from est e join actual a on a.building_id = e.building_id and a.rooms = e.rooms
            )
            select count(*), 100 * percentile_cont(0.5) within group (order by err),
                   100.0 * count(*) filter (where err <= 0.10) / nullif(count(*), 0)
            from pairs
        """)
        bt.value_pairs, bt.value_median_abs_pct, bt.value_within_10pct = cur.fetchone()
    conn.rollback()
    return bt
