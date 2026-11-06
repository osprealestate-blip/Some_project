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
