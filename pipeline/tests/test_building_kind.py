from collections import Counter

from dpi.matching.building_kind import classify_kind, osm_building_kind, read_manual_kinds, record_kind
from dpi.load.pois import read_osm


def C(**k):
    return Counter(k)


def poi(kind="fuel", d=10.0, approx=False, source="osm"):
    return {"kind": kind, "name": "X", "source": source, "distance_m": d, "approx": approx, "source_date": "2026-11-01"}


def test_record_kind_from_sub_type_usage_and_coarse_type():
    assert record_kind("Flat", None, "apartment") == "apartments"
    assert record_kind("Villa", None, None) == "villas_townhouses"
    assert record_kind("Town House", None, None) == "villas_townhouses"
    assert record_kind("Hotel Apartment", None, "apartment") == "hotel_apartments"
    assert record_kind("Office", "Commercial", None) == "office"
    assert record_kind("Shop", None, None) == "retail"
    assert record_kind("Warehouse", None, None) == "warehouse_industrial"
    assert record_kind(None, "Commercial", None) == "commercial"
    assert record_kind(None, None, "villa") == "villas_townhouses"
    assert record_kind("Land", None, "land") is None


def test_dld_dominant_kind_and_confidence():
    v = classify_kind(C(apartments=40, retail=2), "residential")
    assert (v.kind, v.source, v.confidence) == ("apartments", "dld", "high")
    v = classify_kind(C(villas_townhouses=4), "residential")
    assert (v.kind, v.confidence) == ("villas_townhouses", "medium")
    assert v.basis["records"] == 4


def test_unclear_or_too_few_records_is_no_kind():
    assert classify_kind(C(apartments=2), "unknown").kind is None
    assert classify_kind(C(apartments=5, office=4), "unknown").kind is None
    assert classify_kind(C(apartments=20, office=10), "mixed").kind == "mixed_use"


def test_place_only_used_when_sales_say_nothing():
    v = classify_kind(C(), "unknown", poi("fuel", 8))
    assert (v.kind, v.source, v.confidence) == ("fuel", "osm", "medium")
    assert classify_kind(C(), "unknown", poi("school", 30)).confidence == "low"
    assert classify_kind(C(), "unknown", poi("school", 5, approx=True, source="khda")).confidence == "low"
    # a tower with a petrol station beneath it is still a tower
    assert classify_kind(C(apartments=30), "residential", poi("fuel", 5)).kind == "apartments"


def test_osm_building_tag_is_last_and_low():
    v = classify_kind(C(), "unknown", None, "warehouse")
    assert (v.kind, v.source, v.confidence) == ("warehouse_industrial", "osm", "low")
    assert osm_building_kind("yes") is None
    assert classify_kind(C(apartments=1), "unknown", None, "warehouse").kind is None


def test_manual_kinds(tmp_path):
    f = tmp_path / "m.csv"
    f.write_text("# c\nslug,building_type,building_kind,note\na,commercial,office,hand\nb,commercial,nonsense,\n", encoding="utf-8")
    assert read_manual_kinds(f) == {"a": ("office", "hand")}


def test_osm_civic_places_are_read():
    data = {"elements": [
        {"type": "node", "id": 1, "lat": 25.1, "lon": 55.2, "tags": {"amenity": "fuel"}},
        {"type": "node", "id": 2, "lat": 25.1, "lon": 55.2, "tags": {"amenity": "place_of_worship", "religion": "muslim", "name": "Masjid"}},
        {"type": "node", "id": 3, "lat": 25.1, "lon": 55.2, "tags": {"amenity": "place_of_worship", "religion": "christian"}},
        {"type": "node", "id": 4, "lat": 25.1, "lon": 55.2, "tags": {"amenity": "police", "name": "Police"}},
    ]}
    got = {(p.category, p.subcategory, p.name) for p in read_osm(data)}
    assert got == {("civic", "fuel", "Petrol station"), ("civic", "mosque", "Masjid"), ("civic", "police", "Police")}
