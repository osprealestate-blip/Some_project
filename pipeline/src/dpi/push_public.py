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


# Measured on the hosted database (tables plus indexes, 2026-11-17): bytes per row.
BYTES_PER_ROW = {"transactions": 301, "rent_contracts": 259}
ADD_TABLES = {
    "transactions": "txn_date > now() - make_interval(years => %(years)s)",
    "rent_contracts": "start_date > now() - make_interval(years => %(rent_years)s)",
}


def add_plan(source, target, codes: list[str], years: int = 3, rent_years: int = 1,
             limit_mb: int = 500) -> list[dict]:
    """Per community and table: rows to copy in `source`, rows already in `target`, estimated MB added."""
    params = {"years": years, "rent_years": rent_years}
    out = []
    for code in codes:
        for table, cond in ADD_TABLES.items():
            q = (f"select count(*) from {table} where {cond} and community_id in "
                 "(select id from communities where dm_code = %(code)s)")
            with source.cursor() as c:
                c.execute(q, {**params, "code": code})
                n_src = c.fetchone()[0]
            with target.cursor() as c:
                c.execute(f"select count(*) from {table} where community_id in "
                          "(select id from communities where dm_code = %(code)s)", {"code": code})
                n_dst = c.fetchone()[0]
            out.append({"code": code, "table": table, "source": n_src, "existing": n_dst,
                        "add_mb": max(n_src - n_dst, 0) * BYTES_PER_ROW[table] / 1e6})
    return out


def render_add_plan(plan: list[dict], current_mb: float, limit_mb: int = 500) -> str:
    add = sum(p["add_mb"] for p in plan)
    lines = [f"{p['code']:>5} {p['table']:<15} copy {p['source']:>9,}  already there {p['existing']:>9,}"
             f"  about +{p['add_mb']:.1f} MB" for p in plan]
    lines.append(f"Estimated growth +{add:.0f} MB; database now {current_mb:.0f} MB, "
                 f"after about {current_mb + add:.0f} MB of {limit_mb} MB.")
    if current_mb + add > limit_mb * 0.9:
        lines.append("WARNING: this would use more than 90% of the limit. Do not run it without --force-size.")
    return "\n".join(lines)


def run_add(source, target, codes: list[str], years: int = 3, rent_years: int = 1,
            dry_run: bool = False, limit_mb: int = 500, force_size: bool = False) -> str:
    """Add sales and rents for more communities without emptying anything. Each community and table is
    its own transaction: its old rows in the target are deleted, then the new ones copied, then commit.
    An interrupted run leaves earlier communities complete and at most one table of one community empty
    or partial; running the same command again repairs it."""
    with target.cursor() as c:
        c.execute("select pg_database_size(current_database())")
        current_mb = c.fetchone()[0] / 1e6
    target.commit()
    plan = add_plan(source, target, codes, years, rent_years, limit_mb)
    report = render_add_plan(plan, current_mb, limit_mb)
    if dry_run:
        return "DRY RUN, nothing written.\n" + report
    projected = current_mb + sum(p["add_mb"] for p in plan)
    if projected > limit_mb * 0.9 and not force_size:
        raise SystemExit(report)
    params = {"years": years, "rent_years": rent_years}
    with target.cursor() as c:
        c.execute("set statement_timeout = 0")
    target.commit()
    done = []
    for code in codes:
        for table, cond in ADD_TABLES.items():
            cols = [c for c in _columns(target, table) if c in set(_columns(source, table))]
            col_sql = ", ".join(f'"{c}"' for c in cols)
            where = (f"{cond} and community_id in (select id from communities where dm_code = %(code)s)")
            where_sql = psycopg.ClientCursor(source).mogrify(where, {**params, "code": code})
            with target.cursor() as tcur:
                tcur.execute(f"delete from {table} where community_id in "
                             "(select id from communities where dm_code = %(code)s)", {"code": code})
            with source.cursor() as scur, target.cursor() as tcur:
                with scur.copy(f"copy (select {col_sql} from {table} where {where_sql}) to stdout") as out, \
                        tcur.copy(f"copy {table} ({col_sql}) from stdin") as inp:
                    for chunk in out:
                        inp.write(chunk)
            target.commit()
            done.append(f"{code} {table}")
    with target.cursor() as c:
        c.execute("analyze transactions")
        c.execute("analyze rent_contracts")
    target.commit()
    return f"Added {len(done)} community/table copies.\n" + report
