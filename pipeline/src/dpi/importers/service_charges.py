"""DLD "Owners Association Service Charges" (Data Dubai, issuer Dubai Land Department) onto buildings.

The file has one row per owners association x usage x budget year x service category, `service_cost` in AED per
sq ft for the year. A building's figure is the sum of its categories, with these left out on purpose:
Parking, Storage Units and Meter Installation (not per sq ft), Income, Adjustment and Doubtful Debts (not charges).
Unit A/C is kept as its own figure, not added in. Residential rows only.

Matching is by name and cautious: a building is linked automatically only when exactly one association and exactly
one building share the same canonical name. Everything else goes to a review CSV; rows marked `accept` there are
applied with `--reviewed`. Nothing is guessed. A figure counts as usable (`complete`) only when it has at least
5 charge categories and totals AED 3 to 45 per sq ft; anything else is kept but never shown.
"""
from __future__ import annotations

import csv
import difflib
import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from dpi.matching.buildings import canonical_key

SOURCE = "dld_service_charges"
EXCLUDED = {"parking", "storage units", "meter installation", "income", "adjustment", "doubtful debts"}
AC = {"unit a/c (charges)", "unit a/c (sq.ft)"}
MIN_CATEGORIES = 5
MIN_TOTAL, MAX_TOTAL = 3.0, 45.0
MIN_YEAR = 2025  # an older budget is not shown as current

ALIASES = {
    "assoc_id": ["property_group_id"],
    "assoc_name": ["property_group_name_en"],
    "project_name": ["project_name"],
    "community": ["master_community_name_en"],
    "usage": ["usage_name_en"],
    "year": ["budget_year"],
    "cost": ["service_cost"],
    "category": ["service_category_name_en"],
    "company": ["management_company_name_en"],
}


@dataclass
class Association:
    assoc_id: str
    name: str
    project: str
    community: str
    company: str
    year: int
    cats: dict[str, float] = field(default_factory=dict)
    ac: float = 0.0

    @property
    def total(self) -> float:
        return round(sum(self.cats.values()), 2)

    @property
    def complete(self) -> bool:
        return len(self.cats) >= MIN_CATEGORIES and MIN_TOTAL <= self.total <= MAX_TOTAL

    def keys(self) -> set[str]:
        out = {canonical_key(self.name)}
        out.update(canonical_key(p) for p in self.name.split(" - "))
        if self.project and self.project.upper() != "UNSPECIFIED PROJECT":
            out.add(canonical_key(self.project))
        return {k for k in out if k}


def _pick(header: list[str], key: str) -> str:
    low = {h.strip().lower(): h for h in header}
    for a in ALIASES[key]:
        if a in low:
            return low[a]
    raise SystemExit(f"Column for '{key}' not found. Headers in the file: {', '.join(header)}")


def aggregate(rows) -> dict[str, Association]:
    """Latest residential budget year per association, categories summed. Rows is an iterable of dicts."""
    by_year: dict[tuple[str, int], Association] = {}
    cols = None
    for r in rows:
        if cols is None:
            cols = {k: _pick(list(r.keys()), k) for k in ALIASES}
        if (r[cols["usage"]] or "").strip().lower() != "residential":
            continue
        try:
            year, cost = int(float(r[cols["year"]])), float(r[cols["cost"]])
        except (TypeError, ValueError):
            continue
        aid = (r[cols["assoc_id"]] or "").strip()
        if not aid:
            continue
        a = by_year.get((aid, year))
        if a is None:
            a = by_year[(aid, year)] = Association(
                aid, " ".join((r[cols["assoc_name"]] or "").split()), " ".join((r[cols["project_name"]] or "").split()),
                " ".join((r[cols["community"]] or "").split()), " ".join((r[cols["company"]] or "").split()), year)
        cat = " ".join((r[cols["category"]] or "").lower().split())
        if cat in AC:
            a.ac += cost
        elif cat not in EXCLUDED and cat:
            a.cats[cat] = a.cats.get(cat, 0.0) + cost
    latest: dict[str, Association] = {}
    for (aid, year), a in by_year.items():
        if aid not in latest or year > latest[aid].year:
            latest[aid] = a
    return {k: v for k, v in latest.items() if v.year >= MIN_YEAR}


@dataclass
class Building:
    id: int
    name: str
    key: str
    community: str


@dataclass
class MatchResult:
    auto: list[tuple[Building, Association]] = field(default_factory=list)
    review: list[dict] = field(default_factory=list)
    unmatched: int = 0


def match(buildings: list[Building], assocs: dict[str, Association]) -> MatchResult:
    """Exact canonical-name matches both ways become links; near matches become review rows."""
    by_key: dict[str, set[str]] = defaultdict(set)
    for aid, a in assocs.items():
        for k in a.keys():
            by_key[k].add(aid)
    b_by_key: dict[str, list[Building]] = defaultdict(list)
    for b in buildings:
        b_by_key[b.key].append(b)
    res = MatchResult()
    keys = list(by_key)
    taken: set[str] = set()
    for b in buildings:
        aids = by_key.get(b.key, set())
        if len(aids) == 1 and len(b_by_key[b.key]) == 1:
            aid = next(iter(aids))
            if aid not in taken:
                taken.add(aid)
                res.auto.append((b, assocs[aid]))
                continue
        cands = set(aids)
        if not cands and len(b.key) >= 5:
            for k in difflib.get_close_matches(b.key, keys, n=3, cutoff=0.86):
                cands |= by_key[k]
            for k in keys:  # "silverene" inside "silverene towers": whole-word prefix only
                if len(k) >= 5 and (k.startswith(b.key + " ") or b.key.startswith(k + " ")):
                    cands |= by_key[k]
        if not cands:
            res.unmatched += 1
            continue
        for aid in sorted(cands)[:3]:
            a = assocs[aid]
            res.review.append({"building_id": b.id, "building": b.name, "building_community": b.community,
                               "assoc_id": aid, "association": a.name, "assoc_community": a.community,
                               "year": a.year, "psf": a.total, "categories": len(a.cats),
                               "why": "same name, ambiguous" if aid in aids else "similar name", "accept": ""})
    return res


REVIEW_COLUMNS = ["building_id", "building", "building_community", "assoc_id", "association", "assoc_community",
                  "year", "psf", "categories", "why", "accept"]


def write_review(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=REVIEW_COLUMNS)
        w.writeheader()
        w.writerows(rows)


def read_review(path: Path) -> list[tuple[int, str]]:
    """(building_id, assoc_id) for rows with accept = y / yes / 1 / x."""
    with path.open(newline="", encoding="utf-8-sig") as f:
        return [(int(r["building_id"]), r["assoc_id"]) for r in csv.DictReader(f)
                if (r.get("accept") or "").strip().lower() in {"y", "yes", "1", "x", "true"}]


def read_rows(path: Path):
    with path.open(newline="", encoding="utf-8-sig") as f:
        yield from csv.DictReader(f)


def _load_buildings(conn) -> list[Building]:
    with conn.cursor() as cur:
        cur.execute("select b.id, b.name_en, coalesce(b.name_key, ''), coalesce(c.name_common, c.name_official, '') "
                    "from buildings b left join communities c on c.id = b.community_id")
        return [Building(i, n, canonical_key(k or n), c) for i, n, k, c in cur.fetchall()]


@dataclass
class Report:
    associations: int = 0
    usable: int = 0
    auto: int = 0
    reviewed: int = 0
    review_rows: int = 0
    unmatched: int = 0

    def render(self) -> str:
        return (f"{self.associations} residential associations with a {MIN_YEAR}+ budget ({self.usable} usable). "
                f"Linked {self.auto} by exact name and {self.reviewed} from the review file; "
                f"{self.review_rows} candidate rows to review, {self.unmatched} buildings with no candidate.")


def _upsert(cur, b_id: int, a: Association, method: str, source_date: str) -> None:
    cur.execute(
        "insert into building_service_charges (building_id, assoc_id, assoc_name, community_name, company, budget_year, psf_total, "
        "ac_psf, categories, complete, match_method, source, source_date) "
        "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
        "on conflict (building_id) do update set assoc_id=excluded.assoc_id, assoc_name=excluded.assoc_name, "
        "community_name=excluded.community_name, company=excluded.company, budget_year=excluded.budget_year, "
        "psf_total=excluded.psf_total, ac_psf=excluded.ac_psf, categories=excluded.categories, complete=excluded.complete, "
        "match_method=excluded.match_method, source=excluded.source, source_date=excluded.source_date",
        (b_id, a.assoc_id, a.name, a.community, a.company, a.year, a.total, round(a.ac, 2) if a.ac else None,
         json.dumps({k: round(v, 2) for k, v in sorted(a.cats.items())}), a.complete, method, SOURCE, source_date))


def import_file(conn, path: Path, source_date: str, review_out: Path, reviewed: Path | None = None) -> Report:
    assocs = aggregate(read_rows(path))
    rep = Report(associations=len(assocs), usable=sum(1 for a in assocs.values() if a.complete))
    buildings = _load_buildings(conn)
    res = match(buildings, assocs)
    manual = read_review(reviewed) if reviewed else []
    with conn.cursor() as cur:
        for b, a in res.auto:
            _upsert(cur, b.id, a, "exact", source_date)
        rep.auto = len(res.auto)
        for b_id, aid in manual:
            if aid in assocs:
                _upsert(cur, b_id, assocs[aid], "reviewed", source_date)
                rep.reviewed += 1
    conn.commit()
    linked = {b.id for b, _ in res.auto} | {b for b, _ in manual}
    todo = [r for r in res.review if r["building_id"] not in linked]
    write_review(todo, review_out)
    rep.review_rows = len(todo)
    rep.unmatched = res.unmatched
    return rep
