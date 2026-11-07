from collections import Counter

from dpi.spikes.greenlist_crosswalk import build_name_index, pick_land, to_land


def test_to_land():
    assert to_land("392-0") is None
    assert to_land(" 1234 ") == 1234
    assert to_land(1234.0) == 1234
    assert to_land(None) is None
    assert to_land(0) is None


def test_pick_land_prefers_most_common_valid_plot():
    counts = Counter({10: 5, 20: 3, 30: 1})
    assert pick_land(counts, {10, 20}) == 10
    assert pick_land(counts, {20, 30}) == 20  # 10 is not a plot in this area
    assert pick_land(counts, set()) is None
    assert pick_land(None, {10}) is None


def test_build_name_index_counts_pairs():
    idx = build_name_index([("marina gate 1", 5), ("marina gate 1", 5), ("marina gate 1", 6)])
    assert idx["marina gate 1"] == Counter({5: 2, 6: 1})
