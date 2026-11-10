"""Map positions for buildings (T1.4 part B, used by M3).

DLD files carry no coordinates. Positions come from, in order of trust:
1. `manual`: hand-placed towers in `db/seeds/manual_positions.csv` (slug, lat, lng). Always wins.
2. `osm`: a named OpenStreetMap feature in or just outside (150 m) the building's community whose name matches
   the tower's name. Developer suffixes ("Serenz by Danube - Tower A" is also tried as "Serenz Tower A") are
   ignored on both sides. With `--nominatim`, towers still unplaced are looked up by name in OpenStreetMap's
   own search (Nominatim), inside the community's box, at most one request a second, with answers cached.
3. Approximate positions, shown as such on the building page:
   - `plot`: another tower on the same DLD land number has a position (shared plot).
   - `project`: another tower of the same DLD project has a position.
   - `site`: an OpenStreetMap feature carries the development's name without the tower part
     ("Binghatti Aquarise" for "Binghatti Aquarise - Tower B"), e.g. a construction site.
   Approximate positions are worked out again on every run, so they follow better exact positions.

OpenStreetMap data is © OpenStreetMap contributors (ODbL); the map shows that attribution.
"""
from __future__ import annotations

import csv
import json
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Callable

from dpi.matching.buildings import canonical_key

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "dpi-pipeline/0.1 (Dubai building intelligence, open data)"
LEVEL_HEIGHT_M = 3.3
NEAR_M = 150  # an OSM feature this close to a community still counts for it (boundaries and centroids differ)

_BY = re.compile(r"\s+by\s+\S.*$", re.I)        # "Serenz by Danube" -> "Serenz"
_PART = re.compile(r"\s+-\s+(\S.*)$")            # "Peninsula Four - Tower 6" -> part "Tower 6"


def _key(raw: str) -> str:
    k = canonical_key(raw)
    return k if len(k.replace(" ", "")) >= 3 and not k.replace(" ", "").isdigit() else ""


def name_variants(raw: str | None) -> tuple[set[str], set[str]]:
    """(tower keys, site keys) for a name.

    Tower keys name this tower: the name as is, and without the developer ("by ...") suffix.
    Site keys name the whole development, only for names with a " - Tower X" style part:
    "Binghatti Aquarise - TOWER A" -> tower {"binghatti aquarise a"}, site {"binghatti aquarise"}.
    """
    if not raw or not raw.strip():
        return set(), set()
    raw = " ".join(raw.split())
    m = _PART.search(raw)
    head, part = (raw[:m.start()], m.group(1)) if m else (raw, "")
    heads = {head, _BY.sub("", head)}
    tower = {_key(f"{h} {part}".strip()) for h in heads}
    site = {_key(h) for h in heads} if part else set()
    tower.discard("")
    site.discard("")
    return tower, site - tower


def overpass_query(bbox: tuple[float, float, float, float]) -> str:
    s, w, n, e = bbox
    b = f"({s},{w},{n},{e})"
    return (f"[out:json][timeout:180];(nwr[building][name]{b};nwr[landuse=construction][name]{b};"
            f"nwr[construction][name]{b};);out tags geom;")


def fetch(bbox: tuple[float, float, float, float]) -> dict:
    data = urllib.parse.urlencode({"data": overpass_query(bbox)}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=240) as resp:  # noqa: S310 (fixed https URL)
        return json.load(resp)


@dataclass
class OsmBuilding:
    osm_id: int
    names: list[str]
    ring: list[tuple[float, float]]  # (lng, lat), closed
    height_m: float | None

    @property
    def keys(self) -> set[str]:
        out: set[str] = set()
        for n in self.names:
            tower, site = name_variants(n)
            out |= tower | site
        return out

    def centroid(self) -> tuple[float, float]:
        pts = self.ring[:-1] if len(self.ring) > 1 and self.ring[0] == self.ring[-1] else self.ring
        return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))

    def geojson(self) -> str:
        if len(self.ring) >= 4 and self.ring[0] == self.ring[-1]:
            return json.dumps({"type": "Polygon", "coordinates": [[list(p) for p in self.ring]]})
        lng, lat = self.centroid()
        return json.dumps({"type": "Point", "coordinates": [lng, lat]})


def _height(tags: dict) -> float | None:
    for key in ("height", "building:height"):
        try:
            return float(str(tags.get(key, "")).replace("m", "").strip())
        except ValueError:
            pass
    try:
        return round(float(tags.get("building:levels")) * LEVEL_HEIGHT_M, 1)
    except (TypeError, ValueError):
        return None


def parse(overpass_json: dict) -> list[OsmBuilding]:
    out = []
    for el in overpass_json.get("elements", []):
        tags = el.get("tags") or {}
        names = [tags[k] for k in ("name:en", "name", "alt_name", "old_name") if tags.get(k)]
        if not names:
            continue
        ring: list[tuple[float, float]] = []
        if el.get("type") == "node" and "lat" in el:
            ring = [(el["lon"], el["lat"])]
        elif el.get("type") == "way":
            ring = [(p["lon"], p["lat"]) for p in el.get("geometry") or []]
        elif el.get("type") == "relation":
            for m in el.get("members") or []:
                if m.get("role") == "outer" and m.get("geometry"):
                    ring = [(p["lon"], p["lat"]) for p in m["geometry"]]
                    break
        if not ring:
            continue
        # relations negative, like osm2pgsql; nodes offset so they never collide with way ids
        osm_id = {"way": el["id"], "relation": -el["id"]}.get(el["type"], 10**12 + el["id"])
        out.append(OsmBuilding(osm_id, names, ring, _height(tags)))
    return out


def name_score(a: str, b: str) -> float:
    """1.0 exact key; 0.9 when one key is the other plus words (same leading words and same tower number);
    otherwise the SequenceMatcher ratio, which must reach 0.92 to count."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    nums_a = [w for w in a.split() if w.isdigit()]
    nums_b = [w for w in b.split() if w.isdigit()]
    if nums_a != nums_b:  # "Marina Gate 1" never matches "Marina Gate 2"
        return 0.0
    short, long_ = sorted((a, b), key=len)
    if len(short.split()) >= 2 and (long_.startswith(short + " ") or long_.endswith(" " + short)):
        return 0.9
    r = SequenceMatcher(None, a, b).ratio()
    return r if r >= 0.92 else 0.0


def best_match(building_keys: set[str], osm: list[OsmBuilding]) -> tuple[OsmBuilding | None, float]:
    best, score = None, 0.0
    for ob in osm:
        for ok in ob.keys:
            for bk in building_keys:
                s = name_score(bk, ok)
                if s > score:
                    best, score = ob, s
    return best, score


def read_manual(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, encoding="utf-8-sig", newline="") as fh:
        rows = []
        for r in csv.DictReader(fh):
            try:
                rows.append({"slug": r["slug"].strip(), "lat": float(r["lat"]), "lng": float(r["lng"])})
            except (KeyError, ValueError):
                continue
        return rows


Lookup = Callable[[str, tuple[float, float, float, float]], list[dict]]


class Nominatim:
    """OpenStreetMap name search, used politely: one request a second, a clear User-Agent, answers cached on disk
    so a re-run asks nothing new. https://operations.osmfoundation.org/policies/nominatim/"""

    URL = "https://nominatim.openstreetmap.org/search"

    def __init__(self, cache_path: Path | None = None, pause_s: float = 1.1):
        self.cache_path = cache_path
        self.pause_s = pause_s
        self.cache: dict[str, list[dict]] = {}
        if cache_path and cache_path.exists():
            self.cache = json.loads(cache_path.read_text(encoding="utf-8"))
        self._last = 0.0

    def __call__(self, q: str, bbox: tuple[float, float, float, float]) -> list[dict]:
        s, w, n, e = bbox
        key = f"{q}|{s:.4f},{w:.4f},{n:.4f},{e:.4f}"
        if key not in self.cache:
            wait = self._last + self.pause_s - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            params = urllib.parse.urlencode({"q": q, "format": "jsonv2", "limit": 5, "bounded": 1,
                                             "viewbox": f"{w},{n},{e},{s}", "countrycodes": "ae"})
            req = urllib.request.Request(f"{self.URL}?{params}", headers={"User-Agent": USER_AGENT})
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (fixed https URL)
                    self.cache[key] = json.load(resp)
            except OSError:
                self._last = time.monotonic()
                return []  # not cached: tried again next run
            self._last = time.monotonic()
            if self.cache_path:
                self.cache_path.write_text(json.dumps(self.cache), encoding="utf-8")
        return self.cache[key]


@dataclass
class PlaceReport:
    osm_buildings: int = 0
    osm: int = 0
    nominatim: int = 0
    manual: int = 0
    plot: int = 0
    project: int = 0
    site: int = 0
    unplaced: int = 0

    def render(self) -> str:
        return (f"named OSM features read: {self.osm_buildings}\nplaced from OSM: {self.osm}\n"
                f"placed from OSM name search: {self.nominatim}\nplaced by hand: {self.manual}\n"
                f"approximate, shared plot: {self.plot}\napproximate, same project: {self.project}\n"
                f"approximate, development site: {self.site}\nstill unplaced: {self.unplaced}")


MIN_SCORE = 0.9
DERIVED = ("plot", "project", "site")


def _scope(community_codes: list[str] | None) -> tuple[str, list]:
    if community_codes:
        return " and c.dm_code = any(%s)", [community_codes]
    return "", []


def _keys(name_en: str | None, aliases: list[str] | None) -> tuple[set[str], set[str]]:
    tower: set[str] = set()
    site: set[str] = set()
    for raw in [name_en, *(aliases or [])]:
        t, si = name_variants(raw)
        tower |= t
        site |= si
    return tower, site - tower


def place(conn, osm_json: dict | None, manual_csv: Path | None, community_codes: list[str] | None = None,
          lookup: Lookup | None = None) -> PlaceReport:
    report = PlaceReport()
    osm = parse(osm_json) if osm_json else []
    report.osm_buildings = len(osm)
    where, params = _scope(community_codes)
    with conn.cursor() as cur:
        # Approximate positions are rebuilt from the exact ones every run.
        cur.execute("update buildings set geom = null, geom_source = null where geom_source = any(%s)", (list(DERIVED),))
        by_community: dict[int, list[OsmBuilding]] = {}
        if osm:
            # Which communities each OSM feature's centre falls in, or lies within NEAR_M of.
            cur.execute("create temp table _osm (i int, lng float8, lat float8) on commit drop")
            with cur.copy("copy _osm (i, lng, lat) from stdin") as cp:
                for i, ob in enumerate(osm):
                    cp.write_row((i, *ob.centroid()))
            cur.execute("select o.i, c.id from _osm o join communities c "
                        "on ST_DWithin(c.geom::geography, ST_SetSRID(ST_MakePoint(o.lng, o.lat), 4326)::geography, %s) "
                        "where c.dm_code is not null", (NEAR_M,))
            for i, cid in cur.fetchall():
                by_community.setdefault(cid, []).append(osm[i])
            cur.execute("select b.id, b.name_en, b.aliases, b.community_id from buildings b "
                        "join communities c on c.id = b.community_id "
                        "where coalesce(b.geom_source, '') <> 'manual'" + where, params)
            used: set[int] = set()
            for bid, name_en, aliases, cid in cur.fetchall():
                tower, _ = _keys(name_en, aliases)
                ob, score = best_match(tower, by_community.get(cid, []))
                if ob is None or score < MIN_SCORE or ob.osm_id in used:
                    continue
                used.add(ob.osm_id)
                cur.execute("update buildings set geom = ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), osm_id = %s, "
                            "height_m = coalesce(%s, height_m), geom_source = 'osm', "
                            "match_confidence = greatest(match_confidence, %s) where id = %s",
                            (ob.geojson(), ob.osm_id, ob.height_m, round(0.6 + 0.3 * score, 2), bid))
                report.osm += 1

        for m in read_manual(manual_csv) if manual_csv else []:
            cur.execute("update buildings set geom = ST_SetSRID(ST_MakePoint(%s, %s), 4326), geom_source = 'manual', "
                        "match_method = 'manual' where slug = %s", (m["lng"], m["lat"], m["slug"]))
            report.manual += cur.rowcount

        if lookup is not None:
            report.nominatim = _search(cur, lookup, where, params)

        # Buildings on a plot that already has a placed building share its position (centre point).
        cur.execute("""
            update buildings b set geom = ST_PointOnSurface(p.geom), geom_source = 'plot'
            from (select distinct on (land_number, community_id) land_number, community_id, geom from buildings
                  where geom is not null and land_number is not null and geom_source in ('osm', 'manual')
                  order by land_number, community_id, match_confidence desc) p
            where b.geom is null and b.land_number = p.land_number and b.community_id = p.community_id
        """)
        report.plot = cur.rowcount
        # Towers of a project where another tower is placed: that tower's centre point.
        cur.execute("""
            update buildings b set geom = ST_PointOnSurface(p.geom), geom_source = 'project'
            from (select distinct on (project_id) project_id, geom from buildings
                  where geom is not null and project_id is not null and geom_source in ('osm', 'manual')
                  order by project_id, match_confidence desc, id) p
            where b.geom is null and b.project_id = p.project_id
        """)
        report.project = cur.rowcount
        if by_community:
            report.site = _sites(cur, by_community, where, params)
        cur.execute("select count(*) from buildings b join communities c on c.id = b.community_id "
                    "where b.geom is null" + where, params)
        report.unplaced = cur.fetchone()[0]
    conn.commit()
    return report


def _sites(cur, by_community: dict[int, list[OsmBuilding]], where: str, params: list) -> int:
    """Towers named "<development> - Tower X" with no exact position: the development's OSM feature, if any."""
    cur.execute("select b.id, b.name_en, b.aliases, b.community_id from buildings b "
                "join communities c on c.id = b.community_id where b.geom is null" + where, params)
    n = 0
    for bid, name_en, aliases, cid in cur.fetchall():
        _, site = _keys(name_en, aliases)
        ob, score = best_match(site, by_community.get(cid, []))
        if ob is None or score < MIN_SCORE:
            continue
        lng, lat = ob.centroid()
        cur.execute("update buildings set geom = ST_SetSRID(ST_MakePoint(%s, %s), 4326), geom_source = 'site' "
                    "where id = %s", (lng, lat, bid))
        n += 1
    return n


def _search(cur, lookup: Lookup, where: str, params: list) -> int:
    """Unplaced towers looked up by name in OpenStreetMap's search, inside their community's box."""
    cur.execute("select b.id, b.name_en, b.aliases, c.id, ST_YMin(e), ST_XMin(e), ST_YMax(e), ST_XMax(e) "
                "from buildings b join communities c on c.id = b.community_id "
                "cross join lateral (select ST_Envelope(ST_Buffer(c.geom::geography, %s)::geometry) e) x "
                "where b.geom is null and c.geom is not null" + where, [NEAR_M, *params])
    n = 0
    for bid, name_en, aliases, cid, s, w, nn, e in cur.fetchall():
        tower, _ = _keys(name_en, aliases)
        if not tower or not name_en:
            continue
        query = _BY.sub("", _PART.sub(lambda m: " " + m.group(1), " ".join(name_en.split())))
        hits = []
        for r in lookup(query, (s, w, nn, e)):
            try:
                lat, lng = float(r["lat"]), float(r["lon"])
            except (KeyError, TypeError, ValueError):
                continue
            label = r.get("name") or str(r.get("display_name", "")).split(",")[0]
            score = max((name_score(t, k) for t in tower for k in name_variants(label)[0]), default=0.0)
            if score >= MIN_SCORE:
                hits.append((score, lng, lat))
        if not hits:
            continue
        score, lng, lat = max(hits)
        cur.execute("select 1 from communities where id = %s and "
                    "ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)",
                    (cid, lng, lat, NEAR_M))
        if cur.fetchone() is None:
            continue
        cur.execute("update buildings set geom = ST_SetSRID(ST_MakePoint(%s, %s), 4326), geom_source = 'osm', "
                    "match_confidence = greatest(match_confidence, %s) where id = %s",
                    (lng, lat, round(0.55 + 0.3 * score, 2), bid))
        n += 1
    return n


def community_bbox(conn, codes: list[str]) -> tuple[float, float, float, float]:
    """(south, west, north, east) around the given communities, or all of Dubai's communities."""
    with conn.cursor() as cur:
        if codes:
            cur.execute("select ST_YMin(e), ST_XMin(e), ST_YMax(e), ST_XMax(e) from "
                        "(select ST_Extent(geom)::geometry e from communities where dm_code = any(%s)) x", (codes,))
        else:
            cur.execute("select ST_YMin(e), ST_XMin(e), ST_YMax(e), ST_XMax(e) from "
                        "(select ST_Extent(geom)::geometry e from communities) x")
        return tuple(cur.fetchone())
