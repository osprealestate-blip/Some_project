"""M2: build the master building table from DLD sale names and link sales and rents to it.

How a sale finds its building:
1. Every sale's `building_name_en` is reduced to a canonical key (`canonical_key`), within its community.
2. Keys with enough sales become buildings. Spelling variants that only differ in filler words
   ("Tower", "The", "Bldg") share a key. Keys that the Green List crosswalk puts on the same single-building
   plot are merged too (they are the same physical tower).
3. The optional crosswalk CSV (written by `dpi.spikes.greenlist_crosswalk`) adds the land number; the optional
   DLD buildings CSV then adds floors for single-building plots. For plots with several towers the tower is
   picked from the number in the name ("Tower 2") when the plot has that many buildings; otherwise floors stay empty.
4. Projects are linked by project name within the community. Rents have no building name, so a rent belongs
   to a building when its project has exactly one building ('project', exact), or when its unit size and
   bedrooms fit exactly one tower's sold sizes ('size', estimated; see matching/rents.py). Otherwise pages
   show project-level rents.

Only market columns are read. Nothing here touches owner, buyer, seller or tenant data.
"""
from __future__ import annotations

import csv
import re
from datetime import date
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from dpi.matching import rents
from dpi.names import is_blank, name_key

MIN_SALES = 3  # a name needs this many counted sales before it becomes a building page

_OLD = re.compile(r"^\s*old\s*-\s*(?=\S)|(?<=\S)\s*-\s*old\s*$", re.I)  # "Old-X" and "X-old"
_FILLER = {"the", "tower", "towers", "building", "bldg", "residential", "residence"}
_NUM_WORDS = {"one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7",
              "eight": "8", "nine": "9", "ten": "10"}
_ROMAN = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6"}


def canonical_key(raw: str | None) -> str:
    """name_key with filler words dropped and numbers written as digits.

    "The Torch Tower" and "Torch" share a key; "Marina Gate 1" and "Marina Gate 2" never do.
    DLD's "Old-Serenity Lakes 2" and "Serenity Lakes 5-old" (renamed towers) share a key with the current name.
    """
    if raw is None or is_blank(raw):
        return ""
    raw = _OLD.sub("", raw)  # DLD keeps renamed towers as "Old-<name>": same tower ("Old Town" stays)
    words = name_key(raw).split()
    out = []
    for w in words:
        if w in _FILLER:
            continue
        w = _NUM_WORDS.get(w, w)
        if out and w in _ROMAN:  # "Tower II" -> 2, but a leading "I" stays a word
            w = _ROMAN[w]
        out.append(w)
    return " ".join(out) or " ".join(words)


def display_name(spellings: Counter) -> str:
    """Most used spelling, tidied: single spaces, title case only if the source was all upper or all lower."""
    ranked = [n for n, _ in spellings.most_common()]
    current = [n for n in ranked if not _OLD.search(n)]  # prefer the tower's current name
    raw = (current or ranked)[0]
    raw = " ".join(raw.split())
    if raw.isupper() or raw.islower():
        raw = " ".join(w if w.isdigit() else w[:1].upper() + w[1:].lower() for w in raw.split())
    return raw


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name_key(text)).strip("-")
    return s or "building"


def tower_number(key: str) -> int | None:
    """Trailing number in a building key ("marina gate 2" -> 2), used to pick a tower on a shared plot."""
    m = re.search(r"(?:^|\s)(\d{1,2})(?:\s*[a-z])?$", key)
    return int(m.group(1)) if m else None


@dataclass
class Candidate:
    community_id: int
    key: str
    spellings: Counter = field(default_factory=Counter)
    sales: int = 0
    projects: Counter = field(default_factory=Counter)
    land_number: str | None = None
    buildings_on_plot: int = 0
    dld_property_ids: list[str] = field(default_factory=list)
    aliases: set[str] = field(default_factory=set)


@dataclass
class CrosswalkRow:
    land_number: str
    buildings_on_plot: int
    dld_property_ids: list[str]


def read_crosswalk(path: Path | None) -> dict[str, CrosswalkRow]:
    """Crosswalk CSV from the spike, keyed by canonical key of `sale_building_name`. Area is ignored because
    the spike already picked a land number inside the sale's area."""
    out: dict[str, CrosswalkRow] = {}
    if not path:
        return out
    with open(path, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            land = (r.get("land_number") or "").strip()
            if not land:
                continue
            key = canonical_key(r.get("sale_building_name"))
            if not key or key in out:
                continue
            land = land.split(".")[0]
            ids = [i for i in (r.get("dld_property_ids") or "").split(";") if i]
            try:
                n = int(float(r.get("buildings_on_plot") or 0))
            except ValueError:
                n = 0
            out[key] = CrosswalkRow(land, n, ids)
    return out


def read_dld_buildings(path: Path | None) -> dict[str, dict]:
    """DLD buildings CSV -> {property_id: {"land": str, "floors": int|None, "flats": int|None}}. Market columns only."""
    out: dict[str, dict] = {}
    if not path:
        return out

    def num(v):
        try:
            n = int(float(str(v).strip()))
        except (TypeError, ValueError):
            return None
        return n if n > 0 else None

    with open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
        for r in csv.DictReader(fh):
            pid = (r.get("property_id") or "").strip()
            if pid:
                out[pid] = {"land": str(num(r.get("land_number")) or ""), "floors": num(r.get("floors")),
                            "flats": num(r.get("flats"))}
    return out


def collect(rows, min_sales: int = MIN_SALES) -> list[Candidate]:
    """rows: (community_id, raw_building, raw_project, sales) grouped sale counts. Returns candidates above min_sales."""
    by_key: dict[tuple[int, str], Candidate] = {}
    for community_id, raw_building, raw_project, n in rows:
        if community_id is None:
            continue
        key = canonical_key(raw_building)
        if not key:
            continue
        c = by_key.setdefault((community_id, key), Candidate(community_id, key))
        c.spellings[" ".join(str(raw_building).split())] += n
        c.sales += n
        c.aliases.add(name_key(raw_building))
        c.aliases.add(key)
        if raw_project and not is_blank(raw_project):
            c.projects[" ".join(str(raw_project).split())] += n
    return [c for c in by_key.values() if c.sales >= min_sales]


def apply_crosswalk(cands: list[Candidate], crosswalk: dict[str, CrosswalkRow]) -> list[Candidate]:
    """Attach land numbers and merge candidates that sit on the same single-building plot."""
    for c in cands:
        hit = crosswalk.get(c.key)
        if hit:
            c.land_number, c.buildings_on_plot, c.dld_property_ids = hit.land_number, hit.buildings_on_plot, hit.dld_property_ids
    merged: dict[tuple[int, str], Candidate] = {}
    out: list[Candidate] = []
    for c in sorted(cands, key=lambda c: -c.sales):
        if c.land_number and c.buildings_on_plot == 1:
            head = merged.get((c.community_id, c.land_number))
            if head:
                head.spellings.update(c.spellings)
                head.sales += c.sales
                head.projects.update(c.projects)
                head.aliases |= c.aliases
                continue
            merged[(c.community_id, c.land_number)] = c
        out.append(c)
    return out


def pick_dld_building(c: Candidate, dld: dict[str, dict]) -> dict | None:
    """The DLD building row for this tower: the only one on the plot, or the n-th by property id for "Tower n"."""
    rows = [dld[i] for i in c.dld_property_ids if i in dld]
    if len(rows) == 1:
        return rows[0]
    n = tower_number(c.key)
    if rows and n and n <= len(rows):
        ordered = [dld[i] for i in sorted((i for i in c.dld_property_ids if i in dld), key=lambda s: (len(s), s))]
        return ordered[n - 1]
    return None


def confidence(c: Candidate, picked: dict | None) -> tuple[float, str]:
    if c.land_number and c.buildings_on_plot == 1:
        return 0.9, "land_number"
    if c.land_number and picked:
        return 0.75, "land_number_tower"
    if c.land_number:
        return 0.65, "land_number_plot"
    return 0.6, "name"


def assign_slugs(cands: list[Candidate], community_slugs: dict[int, str], taken: set[str] | None = None) -> dict[int, str]:
    """Stable slugs: the building name, plus the community when two buildings share a name."""
    taken = set(taken or ())
    counts = Counter(slugify(display_name(c.spellings)) for c in cands)
    out = {}
    for i, c in enumerate(sorted(cands, key=lambda c: (-c.sales, c.key))):
        base = slugify(display_name(c.spellings))
        slug = base if counts[base] == 1 else f"{base}-{community_slugs.get(c.community_id, c.community_id)}"
        n = 2
        while slug in taken:
            slug = f"{base}-{n}"
            n += 1
        taken.add(slug)
        out[id(c)] = slug
    return out


@dataclass
class MatchReport:
    candidates: int = 0
    buildings: int = 0
    with_land: int = 0
    sales_linked: int = 0
    sales_named: int = 0
    rents_linked: int = 0
    rents_project: int = 0
    rents_total: int = 0
    rents_estimated: int = 0
    removed: int = 0  # building pages left with no sales after names were merged

    def render(self) -> str:
        pct = lambda a, b: f"{100 * a / b:.1f}%" if b else "n/a"  # noqa: E731
        return "\n".join([
            f"buildings: {self.buildings} ({self.with_land} with a DLD land number)",
            f"sales linked to a building: {self.sales_linked} of {self.sales_named} named sales ({pct(self.sales_linked, self.sales_named)})",
            f"rents linked to a project: {self.rents_project} of {self.rents_total} ({pct(self.rents_project, self.rents_total)})",
            f"rents linked to a building: {self.rents_linked} ({pct(self.rents_linked, self.rents_total)}), "
            f"of which {self.rents_estimated} estimated from unit size",
            f"empty building pages removed: {self.removed}",
        ])


_SALE_GROUPS = """
select community_id, raw_building, raw_project, count(*)
from transactions
where excluded is null and raw_building is not null and community_id is not null
group by 1, 2, 3
"""


def run(conn, crosswalk_path: Path | None = None, dld_buildings_path: Path | None = None,
        min_sales: int = MIN_SALES, source_date=None) -> MatchReport:
    """Rebuild buildings, aliases and project links. Safe to re-run: buildings are upserted by
    (community_id, name_key) so slugs and hand edits (verified_at, geom) survive."""
    report = MatchReport()
    crosswalk = read_crosswalk(crosswalk_path)
    dld = read_dld_buildings(dld_buildings_path)
    with conn.cursor() as cur:
        cur.execute(_SALE_GROUPS)
        cands = collect(cur.fetchall(), min_sales)
        report.candidates = len(cands)
        cands = apply_crosswalk(cands, crosswalk)

        cur.execute("select id, coalesce(name_common, name_official) from communities")
        community_slugs = {i: slugify(n) for i, n in cur.fetchall()}
        cur.execute("select community_id, name_key, slug from buildings where name_key is not null")
        existing = {(cid, k): s for cid, k, s in cur.fetchall()}
        cur.execute("select slug from buildings")
        taken_all = {s for (s,) in cur.fetchall()}
        new = [c for c in cands if (c.community_id, c.key) not in existing]
        slugs = assign_slugs(new, community_slugs, taken_all)

        # Projects first, so buildings can point at them.
        project_ids = _upsert_projects(cur, cands, source_date)

        building_ids: dict[tuple[int, str], int] = {}
        for c in cands:
            picked = pick_dld_building(c, dld)
            conf, method = confidence(c, picked)
            proj = c.projects.most_common(1)[0][0] if c.projects else None
            row = {
                "slug": existing.get((c.community_id, c.key)) or slugs[id(c)],
                "name_en": display_name(c.spellings), "name_key": c.key, "community_id": c.community_id,
                "aliases": sorted(c.aliases), "land_number": c.land_number,
                "dld_ids": c.dld_property_ids if c.buildings_on_plot == 1 else [],
                "project_id": project_ids.get((c.community_id, name_key(proj))) if proj else None,
                "floors": picked["floors"] if picked else None,
                "units": picked["flats"] if picked else None,
                "conf": conf, "method": method,
            }
            cur.execute(_UPSERT_BUILDING, row)
            bid = cur.fetchone()[0]
            building_ids[(c.community_id, c.key)] = bid
            report.buildings += 1
            report.with_land += bool(c.land_number)
            for a in c.aliases:
                cur.execute(_UPSERT_ALIAS, {"a": a, "c": c.community_id, "b": bid})

        report.removed = _remove_stale(cur, set(building_ids.values()))
        _link_sales(cur, building_ids, project_ids)
        _link_rents(cur, project_ids)
        report.rents_estimated = rents.estimate(cur)

        cur.execute("select count(*) filter (where building_id is not null), count(*) from transactions "
                    "where excluded is null and raw_building is not null")
        report.sales_linked, report.sales_named = cur.fetchone()
        cur.execute("select count(*) filter (where building_id is not null), count(*) filter (where project_id is not null), "
                    "count(*) from rent_contracts where excluded is null")
        report.rents_linked, report.rents_project, report.rents_total = cur.fetchone()
    conn.commit()
    return report


_UPSERT_BUILDING = """
insert into buildings (slug, name_en, name_key, community_id, aliases, land_number, dld_building_ids, project_id,
                       floors, unit_count, match_confidence, match_method)
values (%(slug)s, %(name_en)s, %(name_key)s, %(community_id)s, %(aliases)s, %(land_number)s, %(dld_ids)s,
        %(project_id)s, %(floors)s, %(units)s, %(conf)s, %(method)s)
on conflict (community_id, name_key) do update set
  name_en = case when buildings.verified_at is null then excluded.name_en else buildings.name_en end,
  aliases = excluded.aliases, land_number = excluded.land_number, dld_building_ids = excluded.dld_building_ids,
  project_id = excluded.project_id,
  floors = coalesce(buildings.floors, excluded.floors), unit_count = coalesce(buildings.unit_count, excluded.unit_count),
  match_confidence = greatest(buildings.match_confidence, excluded.match_confidence),
  match_method = case when buildings.match_method = 'manual' then buildings.match_method else excluded.match_method end
returning id
"""

_UPSERT_ALIAS = """
insert into building_aliases (alias_key, community_id, building_id) values (%(a)s, %(c)s, %(b)s)
on conflict (alias_key, community_id) do update set building_id = excluded.building_id
"""


def _upsert_projects(cur, cands: list[Candidate], source_date) -> dict[tuple[int, str], int]:
    """Projects named by sales (in candidates) and by rents. Returns {(community_id, name_key): id}."""
    names: dict[tuple[int, str], Counter] = defaultdict(Counter)
    for c in cands:
        for p, n in c.projects.items():
            names[(c.community_id, name_key(p))][p] += n
    cur.execute("select community_id, raw_project, count(*) from rent_contracts "
                "where raw_project is not null and community_id is not null group by 1, 2")
    for cid, p, n in cur.fetchall():
        if not is_blank(p):
            names[(cid, name_key(p))][" ".join(p.split())] += n
    cur.execute("select community_id, raw_project, count(*) from transactions "
                "where raw_project is not null and community_id is not null group by 1, 2")
    for cid, p, n in cur.fetchall():
        if not is_blank(p):
            names[(cid, name_key(p))][" ".join(p.split())] += n
    out = {}
    sd = source_date or date.today()
    for (cid, key), spellings in names.items():
        if not key:
            continue
        cur.execute(
            "insert into projects (name, name_key, community_id, source, source_date) values (%s, %s, %s, 'dld', %s) "
            "on conflict (name_key, community_id) do update set name = excluded.name returning id",
            (display_name(spellings), key, cid, sd))
        out[(cid, key)] = cur.fetchone()[0]
    return out


def _bulk_update(cur, table: str, column: str, key_column: str, rows: list[tuple]) -> None:
    """Set table.column from (value, community_id, raw_key) rows in one join (fast on millions of rows)."""
    cur.execute("create temp table if not exists _link (v int, community_id int, raw text) on commit drop")
    cur.execute("truncate _link")
    with cur.copy("copy _link (v, community_id, raw) from stdin") as cp:
        for r in rows:
            cp.write_row(r)
    cur.execute(f"update {table} t set {column} = null where {column} is not null")
    cur.execute(f"update {table} t set {column} = l.v from _link l "
                f"where t.community_id = l.community_id and t.{key_column} = l.raw")


def _remove_stale(cur, kept: set[int]) -> int:
    """Delete building pages this run no longer produces (e.g. "Old-X" now merged into "X").

    Hand-checked (verified) and hand-placed (manual) pages and pages with units stay. Their sales and rents are
    unlinked first and relinked to the right page by the next steps; derived rows (metrics, aliases) go with them.
    """
    cur.execute("select id from buildings where verified_at is null and coalesce(match_method, '') <> 'manual' "
                "and coalesce(geom_source, '') <> 'manual' and not (id = any(%s)) "
                "and not exists (select 1 from units u where u.building_id = buildings.id)", (list(kept),))
    stale = [r[0] for r in cur.fetchall()]
    if not stale:
        return 0
    cur.execute("update transactions set building_id = null where building_id = any(%s)", (stale,))
    cur.execute("update rent_contracts set building_id = null where building_id = any(%s)", (stale,))
    cur.execute("update match_reviews set candidate_building_id = null where candidate_building_id = any(%s)", (stale,))
    cur.execute("delete from building_metrics where building_id = any(%s)", (stale,))
    cur.execute("delete from buildings where id = any(%s)", (stale,))
    return cur.rowcount


def _link_sales(cur, building_ids: dict[tuple[int, str], int], project_ids: dict[tuple[int, str], int]) -> None:
    cur.execute("select distinct community_id, raw_building from transactions "
                "where raw_building is not null and community_id is not null")
    rows = []
    for cid, raw in cur.fetchall():
        bid = building_ids.get((cid, canonical_key(raw)))
        if bid:
            rows.append((bid, cid, raw))
    _bulk_update(cur, "transactions", "building_id", "raw_building", rows)
    _link_projects(cur, "transactions", project_ids)


def _link_projects(cur, table: str, project_ids: dict[tuple[int, str], int]) -> None:
    cur.execute(f"select distinct community_id, raw_project from {table} "
                "where raw_project is not null and community_id is not null")
    rows = [(project_ids[(cid, name_key(p))], cid, p) for cid, p in cur.fetchall()
            if (cid, name_key(p)) in project_ids]
    _bulk_update(cur, table, "project_id", "raw_project", rows)


def _link_rents(cur, project_ids: dict[tuple[int, str], int]) -> None:
    _link_projects(cur, "rent_contracts", project_ids)
    cur.execute("update rent_contracts set building_id = null, building_match = null where building_id is not null")
    # A rent belongs to a building only when its project has exactly one building page.
    cur.execute("""
        update rent_contracts r set building_id = solo.building_id, building_match = 'project'
        from (select project_id, min(id) as building_id from buildings where project_id is not null
              group by project_id having count(*) = 1) solo
        where r.project_id = solo.project_id
    """)
