from collections import Counter

from dpi.matching.building_use import classify, osm_class, read_manual, record_class


def C(**k):
    return Counter(k)


def test_record_class_prefers_sub_type_then_usage_then_type():
    assert record_class("Flat", None, "apartment") == "residential"
    assert record_class("Office", "Residential", "apartment") == "commercial"
    assert record_class("Hotel Apartment", None, "apartment") == "hotel"
    assert record_class(None, "Commercial", None) == "commercial"
    assert record_class(None, None, "commercial") == "commercial"
    assert record_class(None, None, "apartment") == "residential"
    assert record_class("Building", None, "building") is None
    assert record_class("Land", None, "land") is None


def test_dominant_class_wins():
    assert classify(C(residential=50, commercial=2)).building_type == "residential"
    assert classify(C(commercial=9)).building_type == "commercial"
    assert classify(C(hotel=20, residential=1)).building_type == "hotel"


def test_mixed_needs_both_sides():
    v = classify(C(residential=30, commercial=10))
    assert (v.building_type, v.source) == ("mixed", "dld")
    # one stray office among few records is not enough to call it mixed
    assert classify(C(residential=4, commercial=1)).building_type == "unknown"


def test_too_few_records_is_unknown():
    v = classify(C(residential=2))
    assert (v.building_type, v.source) == ("unknown", None)
    assert classify(C()).building_type == "unknown"


def test_osm_only_fills_gaps_and_never_overrules_dld():
    assert classify(C(), "commercial").building_type == "commercial"
    assert classify(C(), "commercial").source == "osm"
    assert classify(C(), "yes").building_type == "unknown"
    assert classify(C(residential=40), "commercial").building_type == "residential"
    assert classify(C(residential=2), "apartments").source == "osm"
    assert classify(C(residential=2), "commercial").building_type == "unknown"
    assert osm_class("hotel") == "hotel"


def test_manual_csv(tmp_path):
    f = tmp_path / "m.csv"
    f.write_text("# c\nslug,building_type,note\nfoo,commercial,checked\nbar,nonsense,\n")
    assert read_manual(f) == {"foo": ("commercial", "checked")}
    assert read_manual(tmp_path / "none.csv") == {}
