import json

from dpi.load import landmarks

AREAS = {"features": [{"geometry": {"type": "Polygon", "coordinates": [[[55.0, 25.0], [55.4, 25.0], [55.4, 25.3], [55.0, 25.3], [55.0, 25.0]]]}}]}


def el(i, tags, lng=55.2, lat=25.2, kind="way"):
    base = {"type": kind, "id": i, "tags": tags}
    return {**base, "lat": lat, "lon": lng} if kind == "node" else {**base, "center": {"lat": lat, "lon": lng}}


def test_classify_uses_only_osm_tags():
    assert landmarks.classify({"leisure": "stadium", "wikidata": "Q1"}, True) == ("arena", 1)
    assert landmarks.classify({"tourism": "hotel", "stars": "5"}, False) == ("hotel", 2)
    assert landmarks.classify({"tourism": "hotel", "stars": "3"}, False) is None
    assert landmarks.classify({"tourism": "hotel"}, False) is None
    assert landmarks.classify({"tourism": "attraction"}, True) is None
    assert landmarks.classify({"shop": "mall"}, True) == ("mall", 3)
    assert landmarks.classify({"shop": "mall"}, False) is None
    assert landmarks.classify({"leisure": "park"}, False) is None


def test_build_keeps_dubai_dedupes_and_dates():
    data = {"osm3s": {"timestamp_osm_base": "2026-11-27T09:00:00Z"}, "elements": [
        el(1, {"shop": "mall", "name": "ماركت", "name:en": "Market Mall"}),
        el(2, {"shop": "mall", "name": "Market Mall", "wikidata": "Q2"}, lng=55.2001, kind="node"),
        el(3, {"shop": "mall", "name": "Far Away Mall"}, lng=55.5),
        el(4, {"shop": "mall", "name": "مول"}),
    ]}
    out = landmarks.build(data, AREAS)
    assert [f["properties"]["name"] for f in out["features"]] == ["Market Mall"]
    assert out["features"][0]["properties"]["osm"] == "node/2"  # the better-known copy wins
    assert out["meta"]["asOf"] == "2026-11-27"
    assert json.loads(landmarks.to_text(out)) == out
