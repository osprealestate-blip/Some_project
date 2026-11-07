from pathlib import Path

from dpi.communities import common_name, read_features
from dpi.names import CommunityRef, CommunityResolver, name_key

GEOJSON = Path(__file__).resolve().parents[2] / "web" / "public" / "data" / "dubai_communities.geojson"


def test_common_names_for_launch_areas():
    assert common_name("Marsa Dubai") == "Dubai Marina"
    assert common_name("MARSA  DUBAI") == "Dubai Marina"
    assert common_name("Al Barsha South Fourth") == "Jumeirah Village Circle (JVC)"
    assert common_name("Business Bay") == "Business Bay"
    assert common_name("Nowhere") is None


def test_bundled_geojson_loads_234_rows_with_three_launch():
    rows = read_features(GEOJSON)
    assert len(rows) == 234
    launch = {r["name_official"] for r in rows if r["is_launch"]}
    assert launch == {"Marsa Dubai", "Al Barsha South Fourth", "Business Bay"}


def test_name_key():
    assert name_key("Za'abeel  First") == "zaabeel first"
    assert name_key("Jumeira Third") == "jumeirah third"


def test_resolver_official_common_and_unmatched():
    r = CommunityResolver([CommunityRef(1, "Marsa Dubai", "Dubai Marina"), CommunityRef(2, "Business Bay", "Business Bay")])
    assert r.resolve("MARSA DUBAI") == 1
    assert r.resolve("Dubai Marina") == 1
    assert r.resolve(None, "Business Bay") == 2
    assert r.resolve("Atlantis Something") is None
    assert r.unmatched == {"Atlantis Something": 1}
    assert r.resolve("", "0") is None and len(r.unmatched) == 1


def _all_communities():
    rows = read_features(GEOJSON)
    return rows, CommunityResolver([CommunityRef(i, r["name_official"], r["name_common"]) for i, r in enumerate(rows)])


def test_every_dld_alias_points_at_a_bundled_community():
    from dpi.names import DLD_AREA_ALIASES

    official = {name_key(r["name_official"]) for r in read_features(GEOJSON)}
    missing = [v for v in DLD_AREA_ALIASES.values() if name_key(v) not in official]
    assert missing == []


def test_dld_area_spellings_resolve_to_dubai_municipality_communities():
    rows, r = _all_communities()
    name = lambda raw: rows[r.resolve(raw)]["name_official"]  # noqa: E731
    assert name("Palm Jumeirah") == "Nakhlat Jumeira"
    assert name("Al Warsan First") == "Warsan First"
    assert name("Al Khairan First") == "Al Kheeran First"
    assert name("Al Barshaa South Third") == "Al Barsha South Third"
    assert name("Al Yelayiss 2") == "Al Yalayis 2"
    assert name("Um Suqaim Third") == "Umm Suqeim Third"
    assert name("Al Goze Industrial Second") == "Al Qouz IndustrialSecond"
    assert name("Al Warqa First") == "Al Warqa'A First"
    assert name("Al Mararr") == "Al Murar"
    # Launch areas are unchanged.
    assert name("Marsa Dubai") == "Marsa Dubai" and name("Business Bay") == "Business Bay"
    assert name("Al Barsha South Fourth") == "Al Barsha South Fourth"


def test_ambiguous_dld_areas_stay_unmatched():
    _, r = _all_communities()
    for raw in ("AL QUSAIS", "Jabal Ali", "Nad Al Shiba", "Um Suqaim", "Madinat Hind 4"):
        assert r.resolve(raw) is None


def test_common_names_use_dubai_municipality_spelling():
    assert common_name("Umm Suqeim First") == "Umm Suqeim"
    assert common_name("Nakhlat Jumeira") == "Palm Jumeirah"
    assert common_name("Al Kheeran First") == "Dubai Creek Harbour"
