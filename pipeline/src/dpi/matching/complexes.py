"""Group sibling towers (Tower A / Tower B, 1 / 2 / 3, Building / Block ...) into one complex, and give every building a
master community (Dubai Marina, JVC, Business Bay).

Only names and existing positions are used. Nothing is invented: a tower that gets a shared spot is flagged
approximate (note in manual_positions.csv) and keeps its own page, sales and rents.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass

from dpi.matching.manual_sheet import complex_stem

# DM community code -> master community name (the three launch communities; every other building has none).
MASTER_COMMUNITIES = {
    "392": "Dubai Marina",
    "681": "Jumeirah Village Circle (JVC)",
    "346": "Business Bay",
}

# Siblings count as one complex only when the towers that are already placed sit within this distance of their
# centre. "Marina Diamond 2" and "Marina Diamond 3" share a name stem but are 1.5 km apart: separate buildings.
MAX_SPREAD_M = 300.0


@dataclass(frozen=True)
class Row:
    slug: str
    name: str
    dm_code: str | None
    lat: float | None = None
    lng: float | None = None

    @property
    def placed(self) -> bool:
        return self.lat is not None and self.lng is not None


@dataclass
class Group:
    key: str
    name: str
    members: list[Row]
    spread_m: float  # largest distance from the centre of the placed members; 0 with fewer than two placed
    strong: bool = False  # every member is a lettered building of a numbered phase ("Azizi Venice 14 - Building A")

    @property
    def tight(self) -> bool:
        return self.spread_m <= MAX_SPREAD_M

    @property
    def placed(self) -> list[Row]:
        return [m for m in self.members if m.placed]

    @property
    def centre(self) -> tuple[float, float] | None:
        p = self.placed
        if not p:
            return None
        return sum(m.lat for m in p) / len(p), sum(m.lng for m in p) / len(p)  # type: ignore[misc]


def master_community(dm_code: str | None) -> str | None:
    return MASTER_COMMUNITIES.get(str(dm_code)) if dm_code else None


def _metres(a: tuple[float, float], b: tuple[float, float]) -> float:
    dlat = (a[0] - b[0]) * 111_320.0
    dlng = (a[1] - b[1]) * 111_320.0 * math.cos(math.radians((a[0] + b[0]) / 2))
    return math.hypot(dlat, dlng)


def _title(stem: str) -> str:
    return " ".join(w.capitalize() for w in stem.split())


# "Azizi Venice 14-building A", "Azizi Venice 3 -a", "Azizi Venice 14-retails", "Azizi Venice 13 ? Building B":
# a numbered phase followed by a building letter / retail / podium. The phase number is kept so phases stay apart.
_PHASE = re.compile(r"^(.*\b\d{1,3})[\s\-]+(?:(?:tower|building|block|bldg)[\s\-]+)?(?:[a-z]|retails?|podiums?)$")


def _clean(name: str) -> str:
    """Odd characters ("13 ? Building A", an encoding slip) become spaces so they do not hide a suffix."""
    return " ".join(re.sub(r"[^A-Za-z0-9\-\s]", " ", name).split())


def phase_stem(name: str) -> tuple[str, bool]:
    """(stem, strong). strong means a phase number was kept: 'Azizi Venice 14-building A' -> ('azizi venice 14', True).
    Anything else falls back to complex_stem."""
    n = " ".join(re.sub(r"[^a-z0-9\-\s]", " ", name.lower()).split())
    m = _PHASE.match(n)
    if m and len(m.group(1).split()) >= 2:
        return m.group(1), True
    return complex_stem(_clean(name)), False


def _spread(g: Group) -> Group:
    c = g.centre
    if c:
        g.spread_m = max(_metres(c, (m.lat, m.lng)) for m in g.placed)  # type: ignore[arg-type]
    return g


def detect(rows: list[Row]) -> tuple[list[Group], list[Group]]:
    """(complexes, name_siblings_far_apart). A complex has two or more towers with the same phase stem in the same community.
    Phase groups (strong) are always complexes, wherever their placed towers sit; plain name groups must be tight."""
    by: dict[tuple[str, str], list[tuple[Row, bool]]] = {}
    for r in rows:
        stem, strong = phase_stem(r.name)
        if stem:
            by.setdefault((r.dm_code or "", stem), []).append((r, strong))
    complexes: list[Group] = []
    far: list[Group] = []
    strong_stems = {(dm, stem) for (dm, stem), items in by.items() if len(items) >= 2 and all(st for _, st in items)}
    for (dm, stem), items in sorted(by.items()):
        if len(items) < 2:
            continue
        # "Azizi Venice 1" and "Azizi Venice 16" (no building letter) are phases of the development, not one complex,
        # when other towers show the name is a development of numbered phases ("Azizi Venice 14 - Building A").
        if not all(st for _, st in items) and any(d == dm and ss.startswith(stem + " ") for d, ss in strong_stems):
            continue
        key = f"{dm or 'x'}:{re.sub(r'[^a-z0-9]+', '-', stem).strip('-')}"
        g = _spread(Group(key, _title(stem), [m for m, _ in items], 0.0, all(st for _, st in items)))
        (complexes if (g.strong or g.tight) else far).append(g)
    return complexes, far


def detect_developments(rows: list[Row]) -> list[Group]:
    """Wider than a complex: every tower sharing a name stem in one community (all Azizi Venice phases), however far apart.
    Used for the development name, never for positions."""
    by: dict[tuple[str, str], list[Row]] = {}
    for r in rows:
        stem = complex_stem(re.sub(r"[\s\-]+(?:retails?|podiums?)$", " a", _clean(r.name), flags=re.I))
        if stem:
            by.setdefault((r.dm_code or "", stem), []).append(r)
    out = []
    for (dm, stem), members in sorted(by.items()):
        if len(members) >= 2:
            out.append(_spread(Group(f"{dm or 'x'}:{re.sub(r'[^a-z0-9]+', '-', stem).strip('-')}", _title(stem), members, 0.0)))
    return out


def propose_positions(complexes: list[Group], skip_slugs: set[str] = frozenset()) -> list[tuple[str, float, float, str]]:
    """Unplaced towers of a complex get the centre of the placed ones. (slug, lat, lng, note). Never touches a slug in skip_slugs
    (those are already in manual_positions.csv, possibly from another lookup)."""
    out = []
    for g in complexes:
        c = g.centre
        if not c or not g.tight:
            continue
        n = len(g.placed)
        for m in g.members:
            if m.placed or m.slug in skip_slugs:
                continue
            out.append((m.slug, round(c[0], 6), round(c[1], 6),
                        f"approximate; complex centre of {n} placed sibling tower{'s' if n != 1 else ''}; complex position, not map-verified"))
    return out


def run(conn, seed, apply: bool, write_positions: bool, worklist=None) -> str:
    """Read buildings, group them, report counts; optionally save the grouping and append approximate positions."""
    import csv
    from pathlib import Path

    cur = conn.execute(
        "select b.slug, b.name_en, c.dm_code, st_y(st_centroid(b.geom)), st_x(st_centroid(b.geom)), c.name_official "
        "from buildings b left join communities c on c.id = b.community_id")
    fetched = cur.fetchall()
    rows = [Row(s, n or "", d, la, ln) for s, n, d, la, ln, _ in fetched]
    from collections import Counter

    from dpi.matching.master_communities import assign
    masters = {s: assign(n or "", d, area) for s, n, d, _la, _ln, area in fetched}
    per = Counter(m for m, _ in masters.values())
    basis = Counter(b for _, b in masters.values())
    groups, far = detect(rows)
    devs = detect_developments(rows)
    seed = Path(seed)
    have = {r["slug"] for r in csv.DictReader(l for l in seed.open(encoding="utf-8") if not l.startswith("#"))} if seed.exists() else set()
    props = propose_positions(groups, have)
    inside = {m.slug for g in groups for m in g.members}
    lines = [f"Buildings: {len(rows)}",
             f"Complexes found: {len(groups)} covering {len(inside)} buildings",
             f"Developments (all phases sharing a name, any distance): {len(devs)} covering {sum(len(d.members) for d in devs)} buildings",
             f"Same name stem but far apart (kept separate): {len(far)} groups, {sum(len(g.members) for g in far)} buildings",
             f"Unplaced siblings that can share a complex position: {len(props)}",
             f"Complexes with no placed tower yet (need one pin): {sum(1 for g in groups if not g.placed)}"]
    lines.append(f"Master communities: {len(per) - (None in per)} named; basis name {basis['name']}, area {basis['area']}, "
                 f"official-area fallback {basis['official']}, unassigned {per[None]}")
    for name, n in per.most_common():
        mem = [r for r in rows if masters[r.slug][0] == name]
        lines.append(f"  {name or '(none)'}: {n} buildings, {sum(r.placed for r in mem)} placed, "
                     f"{sum(1 for r in mem if r.slug in inside)} in complexes")
    if worklist:
        todo = sorted((g for g in groups if not g.placed), key=lambda g: (-len(g.members), g.key))
        with Path(worklist).open("w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(["complex_key", "complex_name", "master_community", "towers", "example_slug"])
            for g in todo:
                w.writerow([g.key, g.name, master_community(g.key.split(":")[0]) or "", len(g.members), g.members[0].slug])
        lines.append(f"Wrote {len(todo)} complexes with no pin to {worklist}.")
    if apply:
        with conn.transaction():
            conn.execute("update buildings set complex_key = null, complex_name = null, development_key = null, development_name = null")
            conn.cursor().executemany("update buildings set master_community = %s, master_community_source = %s where slug = %s",
                                      [(m, b, slug) for slug, (m, b) in masters.items()])
            for g in groups:
                conn.execute("update buildings set complex_key = %s, complex_name = %s where slug = any(%s)",
                             (g.key, g.name, [m.slug for m in g.members]))
            for d in devs:
                conn.execute("update buildings set development_key = %s, development_name = %s where slug = any(%s)",
                             (d.key, d.name, [m.slug for m in d.members]))
        lines.append("Saved to the database.")
    if write_positions and props:
        raw = seed.read_bytes() if seed.exists() else b""
        eol = "\r\n" if b"\r\n" in raw else "\n"   # the seed may be CRLF; keep it, or the diff rewrites every line
        with seed.open("a", encoding="utf-8", newline="") as f:
            if raw and not raw.endswith(b"\n"):
                f.write(eol)
            w = csv.writer(f, lineterminator=eol)
            for slug, lat, lng, note in props:
                w.writerow([slug, f"{lat:.6f}", f"{lng:.6f}", note])
        lines.append(f"Appended {len(props)} approximate rows to {seed}.")
    return "\n".join(lines)
