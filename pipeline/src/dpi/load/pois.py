"""M6 Nearby: load places (schools, clinics, transit, shops, parks) into `pois`.

Sources:
- KHDA school search export (`school_search_*.csv`): name, curriculum, rating, coordinates.
- DHA Sheryan facility export (`sheryan_facility_detail_*.csv`): facility name and type, coordinates.
  Only facility rows are read; the separate professionals file (named people) is never used.
- OpenStreetMap (Overpass): metro, tram and bus stops, supermarkets, pharmacies, parks, gyms, beaches,
  malls, cafes and restaurants.

Each load replaces the rows of its own source, so re-running is safe.
"""
from __future__ import annotations

import csv
import json
import math
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from dpi.matching.osm import OVERPASS_URL, USER_AGENT

DUBAI_BBOX = (24.75, 54.85, 25.40, 55.65)  # south, west, north, east


def _key(h: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (h or "").strip().lower().lstrip("﻿")).strip("_")


def _pick(row: dict, keys: dict[str, str], *candidates: str) -> str | None:
    for c in candidates:
        h = keys.get(c)
        if h and str(row.get(h) or "").strip():
            return str(row[h]).strip()
    return None


def _float(v) -> float | None:
    try:
        f = float(str(v).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


# --- coordinates -----------------------------------------------------------------------------------------

def _tm_inverse(x: float, y: float, lon0_deg: float, k0: float, false_e: float, false_n: float = 0.0) -> tuple[float, float]:
    """Transverse Mercator (WGS84) easting/northing -> (lng, lat). Snyder's series, metre-level in Dubai."""
    a, f = 6378137.0, 1 / 298.257223563
    e2 = f * (2 - f)
    ep2 = e2 / (1 - e2)
    m = (y - false_n) / k0
    mu = m / (a * (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = (mu + (3 * e1 / 2 - 27 * e1**3 / 32) * math.sin(2 * mu) + (21 * e1**2 / 16 - 55 * e1**4 / 32) * math.sin(4 * mu)
            + (151 * e1**3 / 96) * math.sin(6 * mu) + (1097 * e1**4 / 512) * math.sin(8 * mu))
    c1 = ep2 * math.cos(phi1) ** 2
    t1 = math.tan(phi1) ** 2
    n1 = a / math.sqrt(1 - e2 * math.sin(phi1) ** 2)
    r1 = a * (1 - e2) / (1 - e2 * math.sin(phi1) ** 2) ** 1.5
    d = (x - false_e) / (n1 * k0)
    lat = phi1 - (n1 * math.tan(phi1) / r1) * (d**2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1**2 - 9 * ep2) * d**4 / 24
                                               + (61 + 90 * t1 + 298 * c1 + 45 * t1**2 - 252 * ep2 - 3 * c1**2) * d**6 / 720)
    lng = math.radians(lon0_deg) + (d - (1 + 2 * t1 + c1) * d**3 / 6
                                    + (5 - 2 * c1 + 28 * t1 - 3 * c1**2 + 8 * ep2 + 24 * t1**2) * d**5 / 120) / math.cos(phi1)
    return math.degrees(lng), math.degrees(lat)


def to_lnglat(x: float | None, y: float | None) -> tuple[float, float] | None:
    """Accept degrees in either order, UTM zone 40N, or Dubai Local TM (DLTM). None if it isn't in Dubai."""
    if x is None or y is None:
        return None
    s, w, n, e = DUBAI_BBOX
    if w <= x <= e and s <= y <= n:
        return x, y
    if w <= y <= e and s <= x <= n:
        return y, x
    if 2_700_000 <= y <= 2_850_000:
        if 250_000 <= x <= 400_000:   # UTM 40N, central meridian 57 E
            pt = _tm_inverse(x, y, 57.0, 0.9996, 500_000)
        elif 420_000 <= x <= 560_000:  # DLTM, central meridian 55 20' E, scale 1
            pt = _tm_inverse(x, y, 55 + 20 / 60, 1.0, 500_000)
        else:
            return None
        if w <= pt[0] <= e and s <= pt[1] <= n:
            return pt
    return None


def _coarse(pt: tuple[float, float]) -> bool:
    """True when either coordinate has 2 decimals or fewer (about 1 km), as in parts of the KHDA and DHA files."""
    return any(abs(v * 100 - round(v * 100)) < 1e-6 for v in pt)


# --- rows ------------------------------------------------------------------------------------------------

@dataclass
class Poi:
    category: str
    subcategory: str | None
    name: str
    lng: float
    lat: float
    attributes: dict


def read_khda(path: Path) -> list[Poi]:
    out = []
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
        reader = csv.DictReader(fh)
        keys = {_key(h): h for h in reader.fieldnames or []}
        for r in reader:
            name = _pick(r, keys, "name_eng", "school_name", "name_en", "english_name", "school_name_en", "name")
            pt = to_lnglat(_float(_pick(r, keys, "longitude", "long", "lng", "lon", "x")),
                           _float(_pick(r, keys, "latitude", "lat", "y")))
            if not name or not pt:
                continue
            attrs = {k: v for k, v in {
                "curriculum": _pick(r, keys, "curriculumen", "curriculum", "curriculum_en", "curriculum_name"),
                "rating": _pick(r, keys, "overallperformanceen", "overall_rating", "khda_rating", "rating",
                                "latest_rating", "inspection_rating"),
                "grades": _pick(r, keys, "grades", "grade_range", "phases"),
            }.items() if v}
            if _coarse(pt):
                attrs["approx_location"] = True
            out.append(Poi("school", "school", name, pt[0], pt[1], attrs))
    return out


_HEALTH_SUB = [("hospital", "hospital"), ("pharmac", "pharmacy"), ("clinic", "clinic"), ("medical cent", "clinic"),
               ("dental", "dental"), ("polyclinic", "clinic"), ("diagnostic", "diagnostic"), ("lab", "diagnostic")]


def read_sheryan(path: Path) -> list[Poi]:
    out = []
    with open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
        reader = csv.DictReader(fh)
        keys = {_key(h): h for h in reader.fieldnames or []}
        for r in reader:
            status = " ".join(str(r.get(h) or "") for k, h in keys.items() if "status" in k).upper()
            if "FAC_CAN" in status or "CANCEL" in status or "CLOSED" in status:
                continue
            name = _pick(r, keys, "facilitynameenglish", "facility_name_en", "facility_name", "name_en", "name")
            kind = (_pick(r, keys, "facilitycategorynameenglish", "facility_category_en", "facility_category",
                          "facilitysubcategorynameenglish", "facility_type_en", "facility_type", "category") or "").lower()
            pt = to_lnglat(_float(_pick(r, keys, "xcoordinate", "x_coordinate", "longitude", "x")),
                           _float(_pick(r, keys, "ycoordinate", "y_coordinate", "latitude", "y")))
            if not name or not pt:
                continue
            sub = next((s for word, s in _HEALTH_SUB if word in kind or word in name.lower()), "clinic")
            attrs = {"approx_location": True} if _coarse(pt) else {}
            if sub == "pharmacy":
                out.append(Poi("daily_needs", "pharmacy", name, pt[0], pt[1], attrs))
            else:
                out.append(Poi("health", sub, name, pt[0], pt[1], attrs))
    return out


# tag -> (category, subcategory). First match wins.
OSM_RULES: list[tuple[str, str, str, str]] = [
    ("railway", "station", "transit", "metro"),
    ("railway", "tram_stop", "transit", "tram"),
    ("highway", "bus_stop", "transit", "bus"),
    ("shop", "supermarket", "daily_needs", "supermarket"),
    ("shop", "convenience", "daily_needs", "convenience"),
    ("amenity", "pharmacy", "daily_needs", "pharmacy"),
    ("shop", "mall", "lifestyle", "mall"),
    ("leisure", "park", "lifestyle", "park"),
    ("leisure", "fitness_centre", "lifestyle", "gym"),
    ("natural", "beach", "lifestyle", "beach"),
    ("amenity", "restaurant", "lifestyle", "restaurant"),
    ("amenity", "cafe", "lifestyle", "cafe"),
    ("amenity", "hospital", "health", "hospital"),
    ("amenity", "clinic", "health", "clinic"),
    ("amenity", "school", "school", "school"),
]


def osm_query(bbox=DUBAI_BBOX) -> str:
    s, w, n, e = bbox
    parts = "".join(f'nwr["{k}"="{v}"]({s},{w},{n},{e});' for k, v, _, _ in OSM_RULES)
    return f"[out:json][timeout:300];({parts});out tags center;"


def fetch_osm(bbox=DUBAI_BBOX) -> dict:
    data = urllib.parse.urlencode({"data": osm_query(bbox)}).encode()
    req = urllib.request.Request(OVERPASS_URL, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=360) as resp:  # noqa: S310
        return json.load(resp)


def read_osm(overpass_json: dict) -> list[Poi]:
    out = []
    for el in overpass_json.get("elements", []):
        tags = el.get("tags") or {}
        rule = next(((c, s) for k, v, c, s in OSM_RULES if tags.get(k) == v), None)
        if not rule:
            continue
        cat, sub = rule
        if sub == "metro" and not (tags.get("station") == "subway" or "metro" in (tags.get("name:en") or tags.get("name") or "").lower()
                                   or tags.get("network", "").lower().startswith("dubai metro")):
            continue  # skip non-metro railway stations
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lng = el.get("lon") or (el.get("center") or {}).get("lon")
        name = tags.get("name:en") or tags.get("name")
        if lat is None or lng is None:
            continue
        if not name:
            if cat in ("lifestyle", "daily_needs") and sub not in ("park", "beach"):
                continue  # unnamed shops and cafes are too noisy to list
            name = {"bus": "Bus stop", "park": "Park", "beach": "Beach"}.get(sub, sub.title())
        out.append(Poi(cat, sub, name, float(lng), float(lat), {"osm_id": f"{el.get('type')}/{el.get('id')}"}))
    return out


def replace_source(conn, source: str, source_date: date, pois: list[Poi]) -> int:
    with conn.cursor() as cur:
        cur.execute("delete from pois where source = %s", (source,))
        with cur.copy("copy pois (category, subcategory, name, attributes, geom, source, source_date) from stdin") as cp:
            for p in pois:
                cp.write_row((p.category, p.subcategory, p.name[:200], json.dumps(p.attributes),
                              f"SRID=4326;POINT({p.lng} {p.lat})", source, source_date))
    conn.commit()
    return len(pois)
