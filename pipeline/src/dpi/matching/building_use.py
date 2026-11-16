"""`dpi classify-buildings`: residential, commercial, mixed, hotel or unknown for every building page.

Evidence, strongest first (only what the data says; a building with too little evidence stays "unknown"):
  1. DLD sale records linked to the building. Each record carries a sub-type (Flat, Office, Shop, Hotel Apartment ...)
     and a usage (Residential, Commercial ...). Records imported before migration 0008 have only the coarse
     property_type, which still separates apartments from offices and shops but cannot see hotel apartments.
  2. DLD rent contracts tied to the building through a one-tower project (exact links only, never size estimates).
  3. OpenStreetMap `building=` tag, used only when DLD records are too few (a lower-confidence source, labelled).
  4. db/seeds/manual_building_types.csv, a hand check. It always wins and is never overwritten.

Rules (see classify()): at least MIN_RECORDS records; a class holding 90% or more of the records wins; when both
residential and commercial each hold 10% or more (and the smaller side has 2+ records) the building is "mixed";
anything else is "unknown". Nothing is guessed from a building's name.
"""
from __future__ import annotations

import csv
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

MIN_RECORDS = 3        # fewer DLD records than this and the building is unknown (unless OSM or a hand check says)
DOMINANT = 0.90        # share a class needs to name the building
MIXED_MIN_SHARE = 0.10  # each side needs this share, and MIXED_MIN_COUNT records, to call a building mixed
MIXED_MIN_COUNT = 2
CLASSES = ("residential", "commercial", "mixed", "hotel", "unknown")

_RES = ("flat", "apartment", "studio", "penthouse", "villa", "town house", "townhouse", "duplex")
_COM = ("office", "shop", "show room", "showroom", "retail", "warehouse", "workshop", "commercial", "industrial",
        "store", "clinic", "restaurant", "supermarket", "mall", "labour", "labor")
_HOTEL = ("hotel",)


def record_class(sub_type: str | None, usage: str | None, property_type: str | None) -> str | None:
    """residential | commercial | hotel for one DLD record, or None when the record says nothing about use
    (a plot of land, a whole building sold as one, an unknown word)."""
    sub = (sub_type or "").strip().lower()
    use = (usage or "").strip().lower()
    ptype = (property_type or "").strip().lower()
    if sub:
        if any(w in sub for w in _HOTEL):
            return "hotel"
        if any(w in sub for w in _COM):
            return "commercial"
        if any(w in sub for w in _RES):
            return "residential"
    if use.startswith(("hospitality", "hotel")):
        return "hotel"
    if use.startswith(("commercial", "industrial", "storage", "office", "retail")):
        return "commercial"
    if use.startswith("residential"):
        return "residential"
    # Only the coarse type left (rows imported before migration 0008). 'building' and 'land' tell us nothing.
    if ptype == "commercial":
        return "commercial"
    if ptype in ("apartment", "villa", "townhouse"):
        return "residential"
    return None


def osm_class(tag: str | None) -> str | None:
    """OpenStreetMap building= value to a class. `yes` and anything unlisted say nothing."""
    t = (tag or "").strip().lower()
    if t in ("apartments", "residential", "house", "detached", "terrace", "dormitory", "semidetached_house"):
        return "residential"
    if t in ("commercial", "office", "retail", "supermarket", "kiosk", "industrial", "warehouse"):
        return "commercial"
    if t == "hotel":
        return "hotel"
    return None


@dataclass
class Verdict:
    building_type: str
    source: str | None          # dld | osm | manual | None when unknown for lack of evidence
    basis: dict = field(default_factory=dict)


def classify(counts: Counter, osm_tag: str | None = None) -> Verdict:
    """counts: records per class ('residential', 'commercial', 'hotel'). Pure function, easy to test."""
    res, com, hotel = counts.get("residential", 0), counts.get("commercial", 0), counts.get("hotel", 0)
    total = res + com + hotel
    basis = {"residential": res, "commercial": com, "hotel": hotel}
    if osm_tag:
        basis["osm"] = osm_tag
    if total >= MIN_RECORDS:
        for cls, n in (("residential", res), ("commercial", com), ("hotel", hotel)):
            if n / total >= DOMINANT:
                return Verdict(cls, "dld", basis)
        # Hotel apartments sit inside residential towers; treat hotel + residential as one side only when
        # neither alone is dominant AND commercial is absent, otherwise it is genuinely unclear.
        smaller = min(res, com)
        if res and com and smaller >= MIXED_MIN_COUNT and smaller / total >= MIXED_MIN_SHARE:
            return Verdict("mixed", "dld", basis)
        return Verdict("unknown", None, basis)
    guess = osm_class(osm_tag)
    if guess and total == 0:
        return Verdict(guess, "osm", basis)
    if guess and total > 0 and counts.get(guess, 0) == total:  # the few DLD records agree with OSM
        return Verdict(guess, "osm", basis)
    return Verdict("unknown", None, basis)


def read_manual(path: Path | None) -> dict[str, tuple[str, str]]:
    """db/seeds/manual_building_types.csv: slug,building_type,note -> {slug: (class, note)}."""
    out: dict[str, tuple[str, str]] = {}
    if not path or not path.exists():
        return out
    with open(path, encoding="utf-8-sig", newline="") as fh:
        rows = (r for r in csv.DictReader(l for l in fh if not l.lstrip().startswith("#")))
        for r in rows:
            slug, cls = (r.get("slug") or "").strip(), (r.get("building_type") or "").strip().lower()
            if slug and cls in CLASSES:
                out[slug] = (cls, (r.get("note") or "").strip())
    return out


@dataclass
class ClassifyReport:
    buildings: int = 0
    by_class: Counter = field(default_factory=Counter)
    by_source: Counter = field(default_factory=Counter)
    placed: Counter = field(default_factory=Counter)  # classes among buildings with a map position

    def render(self) -> str:
        n = self.buildings or 1
        lines = [f"buildings: {self.buildings}"]
        for cls in CLASSES:
            lines.append(f"  {cls}: {self.by_class[cls]} ({100 * self.by_class[cls] / n:.1f}%)")
        classified = self.buildings - self.by_class["unknown"]
        lines.append(f"classified: {classified} ({100 * classified / n:.1f}%); unknown stays unlabelled in the app")
        lines.append("source: " + ", ".join(f"{k} {v}" for k, v in sorted(self.by_source.items())))
        lines.append("with a map position: " + ", ".join(f"{c} {self.placed[c]}" for c in CLASSES))
        return "\n".join(lines)


_SALES = """
select building_id, property_type, usage, sub_type, count(*) from transactions
where building_id is not null group by 1, 2, 3, 4
"""
# Exact links only: a rent belongs to the building through a one-tower project. Size estimates are built from
# apartment sales, so using them would make the answer circular.
_RENTS = """
select building_id, usage, sub_type, count(*) from rent_contracts
where building_id is not null and building_match = 'project' group by 1, 2, 3
"""


def run(conn, manual_csv: Path | None = None) -> ClassifyReport:
    """Classify every building and store it. Safe to re-run; hand checks (source 'manual') are kept."""
    report = ClassifyReport()
    evidence: dict[int, Counter] = {}
    with conn.cursor() as cur:
        cur.execute(_SALES)
        for bid, ptype, usage, sub, n in cur.fetchall():
            cls = record_class(sub, usage, ptype)
            if cls:
                evidence.setdefault(bid, Counter())[cls] += n
        cur.execute(_RENTS)
        for bid, usage, sub, n in cur.fetchall():
            cls = record_class(sub, usage, None)
            if cls:
                evidence.setdefault(bid, Counter())[cls] += n
        manual = read_manual(manual_csv)
        cur.execute("select id, slug, osm_building, building_type_source, building_type, building_type_basis, geom is not null "
                    "from buildings")
        updates = []
        for bid, slug, osm_tag, source, current, basis, placed in cur.fetchall():
            report.buildings += 1
            if slug in manual:
                cls, note = manual[slug]
                v = Verdict(cls, "manual", {"note": note} if note else {})
            elif source == "manual":  # set by hand earlier and the seed no longer lists it: leave it alone
                v = Verdict(current or "unknown", "manual", basis or {})
            else:
                v = classify(evidence.get(bid, Counter()), osm_tag)
            report.by_class[v.building_type] += 1
            report.by_source[v.source or "none"] += 1
            if placed:
                report.placed[v.building_type] += 1
            updates.append((v.building_type, v.source, _json(v.basis), bid))
        cur.executemany("update buildings set building_type = %s, building_type_source = %s, "
                        "building_type_basis = %s::jsonb where id = %s", updates)
    conn.commit()
    return report


def _json(d: dict) -> str:
    import json
    return json.dumps(d, sort_keys=True)
