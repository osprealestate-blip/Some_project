"""Landmarks for the map: well-known venues from OpenStreetMap (arenas, malls, hotels, attractions, parks), written to a
small GeoJSON file the web app serves. No database table, and nothing is added that OpenStreetMap does not say: the name,
the type and the position all come from the OSM element, whose id is kept.

`tier` only decides how far out a name shows (1 first, 3 last). It rests on OSM tags: a Wikidata or Wikipedia link marks
a well-known place, `stars` marks a hotel's class.
"""
from __future__ import annotations

import json
import math
import re
import urllib.parse
import urllib.request

from dpi.load.pois import DUBAI_BBOX
from dpi.matching.osm import OVERPASS_URL, USER_AGENT

SAME_PLACE_M = 400  # two elements with one name this close are one place (an outline and its entrance node)


def query(bbox=DUBAI_BBOX) -> str:
    s, w, n, e = bbox
    parts = [
        'nwr["shop"="mall"]["name"];',
        'nwr["tourism"~"^(hotel|attraction|museum|theme_park|zoo|aquarium)$"]["name"];',
        'nwr["leisure"~"^(stadium|water_park|golf_course|park)$"]["name"];',
        'nwr["amenity"~"^(theatre|arts_centre|events_venue|exhibition_centre|conference_centre)$"]["name"];',
    ]
    return f"[out:json][timeout:180][bbox:{s},{w},{n},{e}];({''.join(parts)});out tags center;"


def fetch(bbox=DUBAI_BBOX) -> dict:
    data = urllib.parse.urlencode({"data": query(bbox)}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=240) as resp:  # noqa: S310 (fixed https URL)
        return json.load(resp)


def stars(tags: dict) -> int:
    m = re.match(r"\s*(\d)", tags.get("stars") or "")
    return int(m.group(1)) if m else 0


def classify(tags: dict, is_area: bool) -> tuple[str, int] | None:
    """(kind, tier) for one OSM element, or None when it is not notable enough to name on the map."""
    known = "wikidata" in tags or "wikipedia" in tags
    shop, tourism, leisure, amenity = (tags.get(k) for k in ("shop", "tourism", "leisure", "amenity"))
    if leisure == "stadium":
        return ("arena", 1 if known else 3)
    if shop == "mall":
        if known:
            return ("mall", 1)
        return ("mall", 3) if is_area else None  # a lone point tagged as a mall is often a single shop
    if tourism == "hotel":
        if stars(tags) >= 5:
            return ("hotel", 2)
        return ("hotel", 3) if known or stars(tags) == 4 else None
    if tourism in ("theme_park", "zoo", "aquarium") or leisure == "water_park":
        return ("attraction", 1 if known else 2)
    if tourism == "museum":
        return ("museum", 1) if known else None
    if tourism == "attraction":
        return ("attraction", 1) if known else None
    if amenity in ("theatre", "arts_centre", "events_venue", "exhibition_centre", "conference_centre"):
        return ("venue", 1) if known else None
    if leisure == "golf_course":
        return ("golf", 1 if known else 2) if is_area else None
    if leisure == "park":
        if known:
            return ("park", 2)
        return ("park", 3) if is_area else None  # a park mapped only as a point is usually a tiny playground
    return None


def _in_ring(ring: list, x: float, y: float) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        (xi, yi), (xj, yj) = ring[i][:2], ring[j][:2]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def in_areas(geojson: dict, lng: float, lat: float) -> bool:
    """True inside any (multi)polygon of the file: used to leave out Sharjah, which the download box also covers."""
    for f in geojson.get("features", []):
        g = f.get("geometry") or {}
        polys = [g["coordinates"]] if g.get("type") == "Polygon" else g.get("coordinates", []) if g.get("type") == "MultiPolygon" else []
        for rings in polys:
            if _in_ring(rings[0], lng, lat) and not any(_in_ring(r, lng, lat) for r in rings[1:]):
                return True
    return False


def _metres(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot((a[0] - b[0]) * 100_900, (a[1] - b[1]) * 110_574)  # good enough at Dubai's latitude


def build(overpass_json: dict, areas: dict) -> dict:
    found = []
    for el in overpass_json.get("elements", []):
        tags = el.get("tags") or {}
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lng = el.get("lon") or (el.get("center") or {}).get("lon")
        name = (tags.get("name:en") or tags.get("name") or "").strip()
        got = classify(tags, el.get("type") != "node")
        if not got or not name or lat is None or lng is None or not in_areas(areas, lng, lat):
            continue
        if not re.search(r"[A-Za-z]", name):
            continue  # no English or Latin name in OpenStreetMap: the map's labels are in Latin script
        kind, tier = got
        found.append({"name": name, "nameAr": tags.get("name:ar"), "kind": kind, "tier": tier,
                      "osm": f"{el.get('type')}/{el.get('id')}", "pt": (round(float(lng), 6), round(float(lat), 6))})
    # Best first (tier, then outlines before points), so the copy that is kept is the more notable one.
    found.sort(key=lambda p: (p["tier"], p["osm"].startswith("node"), p["name"].lower(), p["osm"]))
    kept: list[dict] = []
    seen: dict[str, list[tuple[float, float]]] = {}
    for p in found:
        key = re.sub(r"[^a-z0-9]", "", p["name"].lower())
        if any(_metres(p["pt"], q) <= SAME_PLACE_M for q in seen.get(key, [])):
            continue
        seen.setdefault(key, []).append(p["pt"])
        kept.append(p)
    features = []
    for p in kept:
        props = {k: p[k] for k in ("name", "nameAr", "kind", "tier", "osm") if p[k] is not None}
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": list(p["pt"])}, "properties": props})
    as_of = (overpass_json.get("osm3s") or {}).get("timestamp_osm_base", "")[:10]
    return {"type": "FeatureCollection", "meta": {"source": "OpenStreetMap contributors (ODbL)", "asOf": as_of}, "features": features}


def to_text(collection: dict) -> str:
    """One feature per line, so a refresh gives a readable diff."""
    head = json.dumps({k: v for k, v in collection.items() if k != "features"}, ensure_ascii=False, separators=(",", ":"))
    rows = ",\n".join(json.dumps(f, ensure_ascii=False, separators=(",", ":")) for f in collection["features"])
    return f'{head[:-1]},"features":[\n{rows}\n]}}\n'
