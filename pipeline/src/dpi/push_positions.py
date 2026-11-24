"""`dpi push-positions`: copy building map positions to a hosted database, adding only.

Only `buildings.geom` and `buildings.geom_source` change, matched by slug. No table is emptied, no sales, rents,
summaries or other columns are touched, and the database size barely changes. By default a position is written
only where the hosted building has none; `update_existing` also moves hosted positions that differ by more than
one metre. Everything runs in one transaction, so a dry run (or an error) changes nothing.
"""
from __future__ import annotations

from dataclasses import dataclass

DEFAULT_SOURCES = ("manual",)
MOVED_M = 1.0  # a hosted position closer than this to ours is "the same"


@dataclass
class PositionReport:
    candidates: int = 0       # local buildings with a position from the chosen sources
    missing_on_target: int = 0  # slug not on the hosted database
    to_add: int = 0           # hosted building has no position
    to_move: int = 0          # hosted position differs by more than MOVED_M (written only with update_existing)
    unchanged: int = 0
    written: int = 0
    dry_run: bool = True
    update_existing: bool = False

    def render(self) -> str:
        head = "DRY RUN, nothing written." if self.dry_run else "Written."
        lines = [head,
                 f"Local buildings with a position from the chosen sources: {self.candidates:,}",
                 f"Not on the hosted database (skipped): {self.missing_on_target:,}",
                 f"Hosted building has no position, will be added: {self.to_add:,}",
                 f"Hosted position differs by more than {MOVED_M:g} m: {self.to_move:,}"
                 + ("" if self.update_existing else " (left as they are; use --update-existing to move them)"),
                 f"Same position already there: {self.unchanged:,}"]
        if not self.dry_run:
            lines.append(f"Positions written: {self.written:,}")
        return "\n".join(lines)


def run(source, target, sources: tuple[str, ...] = DEFAULT_SOURCES, update_existing: bool = False,
        dry_run: bool = True) -> PositionReport:
    rep = PositionReport(dry_run=dry_run, update_existing=update_existing)
    with source.cursor() as cur:
        cur.execute("select slug, ST_AsEWKT(geom), geom_source from buildings "
                    "where geom is not null and geom_source = any(%s) order by slug", (list(sources),))
        rows = cur.fetchall()
    rep.candidates = len(rows)
    with target.cursor() as cur:
        cur.execute("set statement_timeout = 0")
        cur.execute("create temp table pos_in (slug text primary key, geom geometry(Geometry, 4326), "
                    "geom_source text) on commit drop")
        with cur.copy("copy pos_in (slug, geom, geom_source) from stdin") as cp:
            for slug, ewkt, src in rows:
                cp.write_row((slug, ewkt, src))
        cur.execute("""
            select count(*) filter (where b.id is null),
                   count(*) filter (where b.id is not null and b.geom is null),
                   count(*) filter (where b.geom is not null
                                    and ST_Distance(b.geom::geography, p.geom::geography) > %(m)s),
                   count(*) filter (where b.geom is not null
                                    and ST_Distance(b.geom::geography, p.geom::geography) <= %(m)s)
            from pos_in p left join buildings b on b.slug = p.slug""", {"m": MOVED_M})
        rep.missing_on_target, rep.to_add, rep.to_move, rep.unchanged = cur.fetchone()
        if not dry_run:
            cur.execute("""
                update buildings b set geom = p.geom, geom_source = p.geom_source
                from pos_in p where b.slug = p.slug and (b.geom is null
                  or (%(upd)s and ST_Distance(b.geom::geography, p.geom::geography) > %(m)s))""",
                        {"upd": update_existing, "m": MOVED_M})
            rep.written = cur.rowcount
    if dry_run:
        target.rollback()
    else:
        target.commit()
    return rep
