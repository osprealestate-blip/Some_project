"""Load community polygons from the bundled GeoJSON into the communities table."""
from __future__ import annotations

import json
from pathlib import Path

from dpi.names import name_key

LAUNCH_CODES = {"392", "681", "346"}  # Dubai Marina, JVC, Business Bay

# Official Dubai Municipality name (as in the GeoJSON) -> the name people use.
# Ported from osp-crm BUILTIN_ALIASES, official area names only. Master projects and towers are not here.
_COMMON_RAW = {
    "Marsa Dubai": "Dubai Marina",
    "Burj Khalifa": "Downtown Dubai",
    "Al Barsha South Fourth": "Jumeirah Village Circle (JVC)",
    "Al Thanyah Fifth": "Jumeirah Lake Towers (JLT)",
    "Hadaeq Sheikh Mohammed Bin Rashid": "Dubai Hills Estate",
    "Madinat Al Mataar": "Dubai South",
    "Business Bay": "Business Bay",
    "Nakhlat Jumeira": "Palm Jumeirah",
    "Nakhlat Deira": "Palm Deira",
    "Nakhlat Jabal Ali": "Palm Jebel Ali",
    "Al Kheeran First": "Dubai Creek Harbour",
    "Zaabeel First": "Za'abeel",
    "Zaabeel Second": "Za'abeel",
    "Umm Suqeim First": "Umm Suqeim",
    "Umm Suqeim Second": "Umm Suqeim",
    "Umm Suqeim Third": "Umm Suqeim",
    "Jumeirah First": "Jumeirah",
    "Jumeirah Second": "Jumeirah",
    "Jumeirah Third": "Jumeirah",
    "Al Barsha First": "Al Barsha",
    "Al Barsha Second": "Al Barsha",
    "Al Barsha Third": "Al Barsha",
    "Dubai Investment Park First": "Dubai Investment Park (DIP)",
    "Dubai Investment Park Second": "Dubai Investment Park (DIP)",
    "Dubai Silicon Oasis": "Dubai Silicon Oasis",
    "Dubai International Financial Center": "DIFC",
}
COMMON_NAMES = {name_key(k): v for k, v in _COMMON_RAW.items()}


def common_name(official: str) -> str | None:
    return COMMON_NAMES.get(name_key(official))


def read_features(path: Path) -> list[dict]:
    """One dict per feature: key, dm_code, name_official, name_common, name_ar, is_launch, geometry (json)."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    rows = []
    for f in data["features"]:
        p = f["properties"]
        code = str(p["code"]) if p.get("code") else None
        official = p["name"]
        rows.append({
            "dm_code": code,
            "name_official": official,
            "name_common": common_name(official),
            "name_ar": p.get("name_ar"),
            "is_launch": code in LAUNCH_CODES,
            "geometry": json.dumps(f["geometry"]),
        })
    return rows


_UPSERT_DM = """
insert into communities (dm_code, name_official, name_common, name_ar, geom, is_launch)
values (%(dm_code)s, %(name_official)s, %(name_common)s, %(name_ar)s,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%(geometry)s), 4326)), %(is_launch)s)
on conflict (dm_code) do update set name_official = excluded.name_official, name_common = excluded.name_common,
  name_ar = excluded.name_ar, geom = excluded.geom, is_launch = excluded.is_launch
"""
# OSM master-community outlines have no code. Key them on name_official (no unique index, so check first).
_UPDATE_NOCODE = """
update communities set name_common = %(name_common)s, name_ar = %(name_ar)s,
  geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%(geometry)s), 4326)), is_launch = %(is_launch)s
where dm_code is null and name_official = %(name_official)s
"""
_INSERT_NOCODE = """
insert into communities (dm_code, name_official, name_common, name_ar, geom, is_launch)
values (null, %(name_official)s, %(name_common)s, %(name_ar)s,
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%(geometry)s), 4326)), %(is_launch)s)
"""


def load(conn, geojson_path: Path) -> tuple[int, int]:
    """Upsert every feature. Returns (total rows in table, launch rows)."""
    with conn.cursor() as cur:
        for row in read_features(geojson_path):
            if row["dm_code"]:
                cur.execute(_UPSERT_DM, row)
            else:
                cur.execute(_UPDATE_NOCODE, row)
                if cur.rowcount == 0:
                    cur.execute(_INSERT_NOCODE, row)
        cur.execute("select count(*), count(*) filter (where is_launch) from communities")
        total, launch = cur.fetchone()
    conn.commit()
    return total, launch
