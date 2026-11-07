"""Map positions for buildings (T1.4 part B, used by M3).

DLD files carry no coordinates. Positions come from, in order of trust:
1. `manual`: hand-placed towers in `db/seeds/manual_positions.csv` (slug, lat, lng). Always wins.
2. `osm`: a named OpenStreetMap building inside the building's community whose name matches.
3. `plot`: another building on the same DLD land number already has a position (shared plot).

OpenStreetMap data is © OpenStreetMap contributors (ODbL); the map shows that attribution.
"""
from __future__ import annotations

import csv
import json
import urllib.parse
import urllib.request
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

from dpi.matching.buildings import canonical_key

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "dpi-pipeline/0.1 (Dubai building intelligence, open data)"
LEVEL_HEIGHT_M = 3.3


def overpass_query(bbox: tuple[float, float, float, float]) -> str:
    s, w, n, e = bbox
    return (f"[out:json][timeout:180];(way[building][name]({s},{w},{n},{e});"
            f"relation[building][name]({s},{w},{n},{e}););out tags geom;")


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
        return {k for k in (canonical_key(n) for n in self.names) if k}

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
        if el.get("type") == "way":
            ring = [(p["lon"], p["lat"]) for p in el.get("geometry") or []]
        elif el.get("type") == "relation":
            for m in el.get("members") or []:
                if m.get("role") == "outer" and m.get("geometry"):
                    ring = [(p["lon"], p["lat"]) for p in m["geometry"]]
                    break
        if not ring:
            continue
        osm_id = el["id"] if el["type"] == "way" else -el["id"]  # relations negative, like osm2pgsql
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


@dataclass
class PlaceReport:
    osm_buildings: int = 0
    osm: int = 0
    manual: int = 0
    plot: int = 0
    unplaced: int = 0

    def render(self) -> str:
        return (f"named OSM buildings read: {self.osm_buildings}\nplaced from OSM: {self.osm}\n"
                f"placed by hand: {self.manual}\nplaced from a shared plot: {self.plot}\nstill unplaced: {self.unplaced}")


MIN_SCORE = 0.9


def place(conn, osm_json: dict | None, manual_csv: Path | None, community_codes: list[str] | None = None) -> PlaceReport:
    report = PlaceReport()
    osm = parse(osm_json) if osm_json else []
    report.osm_buildings = len(osm)
    with conn.cursor() as cur:
        if osm:
            # Which community each OSM building's centre falls in.
            cur.execute("create temp table _osm (i int, lng float8, lat float8) on commit drop")
            with cur.copy("copy _osm (i, lng, lat) from stdin") as cp:
                for i, ob in enumerate(osm):
                    cp.write_row((i, *ob.centroid()))
            cur.execute("select o.i, c.id from _osm o join communities c "
                        "on ST_Contains(c.geom, ST_SetSRID(ST_MakePoint(o.lng, o.lat), 4326)) where c.dm_code is not null")
            by_community: dict[int, list[OsmBuilding]] = {}
            for i, cid in cur.fetchall():
                by_community.setdefault(cid, []).append(osm[i])
            q = ("select b.id, b.name_key, b.aliases, b.community_id from buildings b join communities c on c.id = b.community_id "
                 "where coalesce(b.geom_source, '') <> 'manual'")
            params: list = []
            if community_codes:
                q += " and c.dm_code = any(%s)"
                params.append(community_codes)
            cur.execute(q, params)
            used: set[int] = set()
            for bid, key, aliases, cid in cur.fetchall():
                keys = {key} | {canonical_key(a) for a in aliases or []}
                ob, score = best_match({k for k in keys if k}, by_community.get(cid, []))
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

        # Buildings on a plot that already has a placed building share its position (centre point).
        cur.execute("""
            update buildings b set geom = ST_PointOnSurface(p.geom), geom_source = 'plot'
            from (select distinct on (land_number, community_id) land_number, community_id, geom from buildings
                  where geom is not null and land_number is not null and geom_source in ('osm', 'manual')
                  order by land_number, community_id, match_confidence desc) p
            where b.geom is null and b.land_number = p.land_number and b.community_id = p.community_id
        """)
        report.plot = cur.rowcount
        cur.execute("select count(*) from buildings where geom is null")
        report.unplaced = cur.fetchone()[0]
    conn.commit()
    return report


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
