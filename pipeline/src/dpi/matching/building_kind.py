"""Finer building kind for every building page, written next to the coarse class by `dpi classify-buildings`.

Kinds: apartments, villas_townhouses, hotel_apartments, office, retail, warehouse_industrial, commercial, mixed_use,
school, hospital, clinic, police, fire_station, government, fuel, mosque. No evidence = no kind (unknown), never a guess.

Evidence, strongest first; every verdict carries its source, a confidence and the numbers it came from:
  1. db/seeds/manual_building_types.csv (optional `building_kind` column). Hand check, high confidence.
  2. DLD sale records (and exact one-tower rent links) linked to the building: the sub-type of each record
     (Flat, Villa, Town House, Hotel Apartment, Office, Shop, Warehouse ...). A kind needs 3+ records and 80%+ of them.
     high confidence from 10 records, medium from 3.
  3. A place from KHDA (schools), DHA Sheryan (health) or OpenStreetMap (police, petrol station, mosque, fire station,
     government office, hospital, school) within 40 m of the building. Used only when DLD sales say nothing, because
     a tower with a petrol station under it is still a tower. Medium confidence within 15 m of a place with exact
     coordinates, low otherwise (farther away, or KHDA/DHA coordinates marked approximate).
  4. The OpenStreetMap building= tag on the building itself, low confidence.
"""
from __future__ import annotations

import csv
import json
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

KINDS = ("apartments", "villas_townhouses", "hotel_apartments", "office", "retail", "warehouse_industrial",
         "mixed_use", "commercial", "school", "hospital", "clinic", "police", "fire_station", "government", "fuel", "mosque")
DLD_KINDS = ("apartments", "villas_townhouses", "hotel_apartments", "office", "retail", "warehouse_industrial", "commercial")
MIN_RECORDS = 3
DOMINANT = 0.80
HIGH_RECORDS = 10
POI_RADIUS_M = 40
POI_NEAR_M = 15


def record_kind(sub_type: str | None, usage: str | None, property_type: str | None) -> str | None:
    """One DLD record to a kind, or None when it says nothing (land, a whole building sold as one)."""
    sub = (sub_type or "").strip().lower()
    use = (usage or "").strip().lower()
    ptype = (property_type or "").strip().lower()
    if sub:
        if "hotel" in sub:
            return "hotel_apartments"
        if any(w in sub for w in ("villa", "town house", "townhouse")):
            return "villas_townhouses"
        if "office" in sub:
            return "office"
        if any(w in sub for w in ("warehouse", "workshop", "industrial", "store", "labour", "labor")):
            return "warehouse_industrial"
        if any(w in sub for w in ("shop", "show room", "showroom", "retail", "supermarket", "mall", "restaurant")):
            return "retail"
        if any(w in sub for w in ("flat", "apartment", "studio", "penthouse", "duplex")):
            return "apartments"
        if any(w in sub for w in ("commercial", "clinic")):
            return "commercial"
    if use.startswith(("hospitality", "hotel")):
        return "hotel_apartments"
    if use.startswith(("industrial", "storage")):
        return "warehouse_industrial"
    if use.startswith(("office",)):
        return "office"
    if use.startswith(("retail",)):
        return "retail"
    if use.startswith("commercial"):
        return "commercial"
    if ptype == "commercial":
        return "commercial"
    if ptype == "apartment":
        return "apartments"
    if ptype in ("villa", "townhouse"):
        return "villas_townhouses"
    return None


def osm_building_kind(tag: str | None) -> str | None:
    t = (tag or "").strip().lower()
    return {
        "apartments": "apartments", "residential": "apartments", "dormitory": "apartments",
        "house": "villas_townhouses", "detached": "villas_townhouses", "terrace": "villas_townhouses",
        "semidetached_house": "villas_townhouses", "villa": "villas_townhouses",
        "office": "office", "retail": "retail", "supermarket": "retail", "kiosk": "retail",
        "warehouse": "warehouse_industrial", "industrial": "warehouse_industrial", "hotel": "hotel_apartments",
        "school": "school", "hospital": "hospital", "mosque": "mosque", "fire_station": "fire_station",
        "government": "government", "civic": "government", "public": "government",
    }.get(t)


# pois (category, subcategory) -> kind
POI_KINDS = {
    ("school", "school"): "school", ("health", "hospital"): "hospital", ("health", "clinic"): "clinic",
    ("civic", "police"): "police", ("civic", "fuel"): "fuel", ("civic", "mosque"): "mosque",
    ("civic", "fire_station"): "fire_station", ("civic", "government"): "government",
}
POI_SOURCES = {"khda": "khda", "dha_sheryan": "dha", "osm": "osm"}


@dataclass
class Verdict:
    kind: str | None
    source: str | None = None
    confidence: str | None = None
    basis: dict = field(default_factory=dict)


def classify_kind(counts: Counter, building_class: str | None, poi: dict | None = None, osm_tag: str | None = None) -> Verdict:
    """counts: DLD records per kind. poi: nearest matching place {kind, name, source, distance_m, approx, source_date}.
    Pure function; the coarse class (building_type) is only used to call a clear residential/commercial split mixed_use."""
    total = sum(counts.get(k, 0) for k in DLD_KINDS)
    basis = {k: counts[k] for k in DLD_KINDS if counts.get(k)}
    if total >= MIN_RECORDS:
        for kind, n in counts.most_common():
            if kind in DLD_KINDS and n / total >= DOMINANT:
                return Verdict(kind, "dld", "high" if total >= HIGH_RECORDS else "medium", {"records": total, **basis})
        if building_class == "mixed":
            return Verdict("mixed_use", "dld", "medium", {"records": total, **basis})
        # unclear DLD mix: fall through to a place only if sales are not telling a different story
    if total == 0 and poi:
        near = poi["distance_m"] <= POI_NEAR_M and not poi.get("approx")
        return Verdict(poi["kind"], poi["source"], "medium" if near else "low",
                       {"place": poi["name"], "distance_m": round(poi["distance_m"]), "approx_location": bool(poi.get("approx")),
                        "source_date": poi.get("source_date")})
    guess = osm_building_kind(osm_tag)
    if guess and total == 0:
        return Verdict(guess, "osm", "low", {"osm_building": osm_tag})
    return Verdict(None, None, None, {"records": total, **basis} if total else {})


def read_manual_kinds(path: Path | None) -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    if not path or not path.exists():
        return out
    with open(path, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(l for l in fh if not l.lstrip().startswith("#")):
            slug, kind = (r.get("slug") or "").strip(), (r.get("building_kind") or "").strip().lower()
            if slug and kind in KINDS:
                out[slug] = (kind, (r.get("note") or "").strip())
    return out


_SALES = """
select building_id, property_type, usage, sub_type, count(*), max(source_date)::text from transactions
where building_id is not null group by 1, 2, 3, 4
"""
_RENTS = """
select building_id, usage, sub_type, count(*), max(source_date)::text from rent_contracts
where building_id is not null and building_match = 'project' group by 1, 2, 3
"""
# nearest civic / school / health place within POI_RADIUS_M of the building (bounding-box first so the index is used)
_POIS = """
select b.id, p.category, p.subcategory, p.name, p.source, p.source_date::text, (p.attributes->>'approx_location') = 'true',
       ST_Distance(b.geom::geography, p.geom::geography) d
from buildings b join pois p on p.active and p.geom && ST_Expand(b.geom, 0.0006)
 and ST_DWithin(b.geom::geography, p.geom::geography, %s)
where b.geom is not null and (p.category || '/' || p.subcategory) = any(%s)
order by b.id, d
"""


@dataclass
class KindReport:
    buildings: int = 0
    by_kind: Counter = field(default_factory=Counter)
    by_source: Counter = field(default_factory=Counter)
    by_conf: Counter = field(default_factory=Counter)

    def render(self) -> str:
        n = self.buildings or 1
        typed = self.buildings - self.by_kind[None]
        lines = [f"kinds: {typed} of {self.buildings} buildings typed ({100 * typed / n:.1f}%); the rest stay unlabelled"]
        lines += [f"  {k}: {v}" for k, v in sorted(((k, v) for k, v in self.by_kind.items() if k), key=lambda x: -x[1])]
        lines.append("source: " + ", ".join(f"{k} {v}" for k, v in sorted(self.by_source.items())))
        lines.append("confidence: " + ", ".join(f"{k} {v}" for k, v in sorted(self.by_conf.items())))
        return "\n".join(lines)


def run(conn, manual_csv: Path | None = None) -> KindReport:
    report = KindReport()
    evidence: dict[int, Counter] = {}
    dates: dict[int, str] = {}
    with conn.cursor() as cur:
        cur.execute(_SALES)
        for bid, ptype, usage, sub, n, d in cur.fetchall():
            k = record_kind(sub, usage, ptype)
            if k:
                evidence.setdefault(bid, Counter())[k] += n
                dates[bid] = max(dates.get(bid, ""), d or "")
        cur.execute(_RENTS)
        for bid, usage, sub, n, d in cur.fetchall():
            k = record_kind(sub, usage, None)
            if k:
                evidence.setdefault(bid, Counter())[k] += n
                dates[bid] = max(dates.get(bid, ""), d or "")
        nearest: dict[int, dict] = {}
        cur.execute(_POIS, (POI_RADIUS_M, [f"{c}/{s}" for c, s in POI_KINDS]))
        for bid, cat, sub, name, src, sdate, approx, dist in cur.fetchall():
            nearest.setdefault(bid, {"kind": POI_KINDS[(cat, sub)], "name": name, "source": POI_SOURCES.get(src, "osm"),
                                     "distance_m": dist, "approx": bool(approx), "source_date": sdate})
        manual = read_manual_kinds(manual_csv)
        cur.execute("select id, slug, osm_building, building_type, building_kind_source, building_kind, building_kind_confidence, "
                    "building_kind_basis from buildings")
        updates = []
        for bid, slug, osm_tag, cls, src, cur_kind, cur_conf, cur_basis in cur.fetchall():
            report.buildings += 1
            if slug in manual:
                kind, note = manual[slug]
                v = Verdict(kind, "manual", "high", {"note": note} if note else {})
            elif src == "manual":
                v = Verdict(cur_kind, "manual", cur_conf, cur_basis or {})
            else:
                v = classify_kind(evidence.get(bid, Counter()), cls, nearest.get(bid), osm_tag)
                if v.source == "dld" and dates.get(bid):
                    v.basis["source_date"] = dates[bid]
            report.by_kind[v.kind] += 1
            if v.kind:
                report.by_source[v.source or "none"] += 1
                report.by_conf[v.confidence or "none"] += 1
            updates.append((v.kind, v.source, v.confidence, json.dumps(v.basis, sort_keys=True), bid))
        cur.executemany("update buildings set building_kind = %s, building_kind_source = %s, building_kind_confidence = %s, "
                        "building_kind_basis = %s::jsonb where id = %s", updates)
    conn.commit()
    return report
