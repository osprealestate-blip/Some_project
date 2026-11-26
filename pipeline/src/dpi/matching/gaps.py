"""Read-only reports on what is still missing: buildings with no map position and rents with no building.

Nothing here writes to the database or invents a value. `unplaced_rows` lists the buildings a person could place by
hand (busiest first) in the same layout as `db/seeds/manual_positions.csv`, so a filled-in row can be copied across.
`rent_gap_rows` explains why rents are not linked to a building, in groups that each need a different fix.
"""
from __future__ import annotations

import csv
from pathlib import Path

CSV_COLUMNS = ["slug", "lat", "lng", "note", "name", "community", "project", "sales_12m", "sales_all", "sibling_placed"]

_UNPLACED = """
select b.slug, b.name_en, coalesce(c.name_common, c.name_official, ''), coalesce(p.name, ''),
       count(t.id) filter (where t.txn_date >= (select max(txn_date) from transactions where txn_date <= current_date) - interval '12 months') as s12,
       count(t.id) as s_all,
       exists (select 1 from buildings x where x.project_id = b.project_id and x.geom is not null) as sib
from buildings b
left join communities c on c.id = b.community_id
left join projects p on p.id = b.project_id
left join transactions t on t.building_id = b.id and t.excluded is null
where b.geom is null{where}
group by b.id, c.id, p.id
order by s12 desc, s_all desc, b.slug
limit %(limit)s
"""


def unplaced_rows(conn, limit: int = 300, community_codes: list[str] | None = None) -> list[dict]:
    where = " and c.dm_code = any(%(codes)s)" if community_codes else ""
    with conn.cursor() as cur:
        cur.execute(_UNPLACED.format(where=where), {"limit": limit, "codes": community_codes})
        rows = cur.fetchall()
    return [{"slug": slug, "lat": "", "lng": "", "note": "", "name": name, "community": comm, "project": proj,
             "sales_12m": s12, "sales_all": s_all, "sibling_placed": "yes" if sib else "no"}
            for slug, name, comm, proj, s12, s_all, sib in rows]


def write_unplaced(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=CSV_COLUMNS)
        w.writeheader()
        w.writerows(rows)


_RENT_GAPS = """
with cb as (select community_id, count(*) nb from buildings group by 1),
     pb as (select project_id, count(*) nb from buildings where project_id is not null group by 1)
select case when r.building_id is not null then '0 linked to a building'
            when coalesce(cb.nb, 0) = 0 then '1 community has no building pages'
            when r.raw_project is null then '2 no project name in the DLD row'
            when pb.nb is null then '3 project has no building page'
            else '4 project has several towers' end as cause,
       count(*) as rents,
       count(*) filter (where r.size_sqft > 0 and r.rooms is not null) as with_size_and_rooms
from rent_contracts r
left join cb on cb.community_id = r.community_id
left join pb on pb.project_id = r.project_id
where r.excluded is null
group by 1 order by 1
"""

RENT_GAP_HELP = {
    "0 linked to a building": "linked (project has one tower, or one tower fits the exact size)",
    "1 community has no building pages": "no building list for the community (usually villas or older districts); stays at community level",
    "2 no project name in the DLD row": "only an exact-size match can link these; already tried, see `dpi rent-backtest`",
    "3 project has no building page": "mostly villa/townhouse projects; a tower page appears only when sales name the tower",
    "4 project has several towers": "which tower is not in the data; shown at project level, never guessed",
}


def rent_gap_rows(conn) -> list[tuple[str, int, int]]:
    with conn.cursor() as cur:
        cur.execute(_RENT_GAPS)
        return [(c, n, s) for c, n, s in cur.fetchall()]


def render_rent_gaps(rows: list[tuple[str, int, int]]) -> str:
    total = sum(n for _, n, _ in rows) or 1
    out = ["Counted rent contracts (outliers excluded), by why they have no building:"]
    for cause, n, sized in rows:
        out.append(f"  {n:>9,}  {100 * n / total:5.1f}%  {cause}: {RENT_GAP_HELP.get(cause, '')} (with size and bedrooms: {sized:,})")
    return "\n".join(out)


# --- Evidence flag for buildings with no map position (read-only; nothing is hidden or placed) ---------------------------
FLAG_REAL = "real building, position unknown"
FLAG_OFFPLAN = "likely off-plan / not built"
FLAG_UNCLEAR = "unclear"

CLASSIFY_COLUMNS = ["slug", "name", "community", "project", "flag", "evidence", "sales_12m", "sales_all", "offplan_sales",
                    "ready_sales", "rent_contracts", "first_sale", "last_sale", "project_status"]


def classify_unplaced(sales_all: int, offplan: int, ready: int, rents: int, first_sale, last_sale, project_status,
                      today) -> tuple[str, str]:
    """Flag from the figures already in the database. Only states what the records show; never a position or a verdict.

    Real: rent contracts are linked to it, or the project is marked completed, or it has ready (non-off-plan) sales, or
    its first sale is more than 3 years old (a tower that old is built).  Off-plan: at least 3 sales, all of them
    off-plan, no rent contract, project not marked completed, first sale within 3 years.  Everything else is unclear.
    """
    old = first_sale is not None and (today - first_sale).days > 3 * 365
    if rents > 0:
        return FLAG_REAL, f"{rents} rent contracts linked"
    if project_status == "completed":
        return FLAG_REAL, "DLD project status completed"
    if ready > 0:
        return FLAG_REAL, f"{ready} ready (not off-plan) sales"
    if old:
        return FLAG_REAL, f"first sale {first_sale}, more than 3 years ago"
    if sales_all >= 3 and offplan == sales_all and project_status in (None, "planned", "under_construction"):
        return FLAG_OFFPLAN, f"all {offplan} sales are off-plan, no rent contracts, first sale {first_sale}"
    return FLAG_UNCLEAR, f"{sales_all} sales, {offplan} off-plan, {ready} ready, {rents} rents"


_CLASSIFY = """
select b.slug, b.name_en, coalesce(c.name_common, c.name_official, ''), coalesce(p.name, ''), p.status,
       count(t.id) filter (where t.txn_date >= (select max(txn_date) from transactions where txn_date <= current_date) - interval '12 months'),
       count(t.id), count(t.id) filter (where t.off_plan is true), count(t.id) filter (where t.off_plan is false),
       (select count(*) from rent_contracts r where r.building_id = b.id),
       min(t.txn_date), max(t.txn_date)
from buildings b
left join communities c on c.id = b.community_id
left join projects p on p.id = b.project_id
left join transactions t on t.building_id = b.id and t.excluded is null
where b.geom is null
group by b.id, c.id, p.id
order by 6 desc, 7 desc, b.slug
"""


def classify_rows(conn, today=None) -> list[dict]:
    import datetime as dt

    today = today or dt.date.today()
    with conn.cursor() as cur:
        cur.execute(_CLASSIFY)
        rows = cur.fetchall()
    out = []
    for slug, name, comm, proj, status, s12, sall, off, ready, rents, first, last in rows:
        flag, why = classify_unplaced(sall, off, ready, rents, first, last, status, today)
        out.append({"slug": slug, "name": name, "community": comm, "project": proj, "flag": flag, "evidence": why,
                    "sales_12m": s12, "sales_all": sall, "offplan_sales": off, "ready_sales": ready,
                    "rent_contracts": rents, "first_sale": first or "", "last_sale": last or "",
                    "project_status": status or ""})
    return out


def write_classified(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=CLASSIFY_COLUMNS)
        w.writeheader()
        w.writerows(rows)
