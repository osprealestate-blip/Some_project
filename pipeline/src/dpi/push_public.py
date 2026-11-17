"""`dpi push-public`: copy what the web app reads to a hosted database (for a preview deploy).

Only public tables go: communities, projects, buildings and aliases, summaries, places, and DLD sales and
rents (market fields; these tables never hold owner, buyer or tenant details). Sales and rents are limited
to the chosen communities and the last N years, to fit a free database tier. The target must already have
the schema (db/migrations). Target tables are emptied first, so re-running replaces the copy.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import psycopg

# (table, where clause on the source; %(codes)s and %(years)s are filled in). Order respects foreign keys.
PLAN: list[tuple[str, str]] = [
    ("communities", "true"),
    ("projects", "community_id in (select id from communities where %(all_struct)s or dm_code = any(%(codes)s))"),
    ("dld_projects", "community_id in (select id from communities where %(all_struct)s or dm_code = any(%(codes)s))"),
    ("buildings", "community_id in (select id from communities where %(all_struct)s or dm_code = any(%(codes)s))"),
    ("building_aliases", "community_id in (select id from communities where %(all_struct)s or dm_code = any(%(codes)s))"),
    ("building_images", "approved and building_id in (select b.id from buildings b join communities c on c.id = b.community_id "
                        "where %(all_struct)s or c.dm_code = any(%(codes)s))"),
    ("building_summary", "building_id in (select b.id from buildings b join communities c on c.id = b.community_id "
                         "where %(all_struct)s or c.dm_code = any(%(codes)s))"),
    ("community_summary", "true"),
    ("community_metrics", "true"),
    ("pois", "active"),
    ("transactions", "community_id in (select id from communities where dm_code = any(%(detail)s)) "
                     "and txn_date > now() - make_interval(years => %(years)s)"),
    ("rent_contracts", "community_id in (select id from communities where dm_code = any(%(detail)s)) "
                       "and start_date > now() - make_interval(years => %(rent_years)s)"),
]


@dataclass
class PushReport:
    rows: dict[str, int] = field(default_factory=dict)

    def render(self) -> str:
        return "\n".join(f"{t}: {n:,} rows" for t, n in self.rows.items())


def _columns(conn, table: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute("select column_name from information_schema.columns where table_schema = 'public' "
                    "and table_name = %s order by ordinal_position", (table,))
        return [r[0] for r in cur.fetchall()]


def plan_params(codes: list[str], years: int = 10, detail: list[str] | None = None,
                rent_years: int | None = None, all_structure: bool = False) -> dict:
    """Query parameters for PLAN. `codes` choose which communities get buildings, aliases and summaries
    (all of them when `all_structure`); `detail` (default: `codes`) chooses which get sale and rent rows."""
    return {"codes": codes, "years": years, "all_struct": all_structure,
            "detail": codes if detail is None else detail,
            "rent_years": years if rent_years is None else rent_years}


def run(source, target, codes: list[str], years: int = 10, detail: list[str] | None = None,
        rent_years: int | None = None, all_structure: bool = False) -> PushReport:
    params = plan_params(codes, years, detail, rent_years, all_structure)
    rep = PushReport()
    with target.cursor() as tcur:
        # Hosted databases cap one statement at about two minutes; the big copies need longer. A connection
        # option is ignored by Supabase's pooler, so it is set once connected.
        tcur.execute("set statement_timeout = 0")
        tcur.execute("truncate " + ", ".join(t for t, _ in reversed(PLAN)) + " cascade")
    for table, where in PLAN:
        cols = [c for c in _columns(target, table) if c in set(_columns(source, table))]
        col_sql = ", ".join(f'"{c}"' for c in cols)
        where_sql = psycopg.ClientCursor(source).mogrify(where, params)
        n = 0
        with source.cursor() as scur, target.cursor() as tcur:
            with scur.copy(f"copy (select {col_sql} from {table} where {where_sql}) to stdout") as out, \
                    tcur.copy(f"copy {table} ({col_sql}) from stdin") as inp:
                for chunk in out:
                    inp.write(chunk)
            tcur.execute(f"select count(*) from {table}")
            n = tcur.fetchone()[0]
        rep.rows[table] = n
    with target.cursor() as tcur:
        tcur.execute("analyze")
    target.commit()
    return rep
