from dpi.matching import complexes as cx
from dpi.matching.complexes import Row


def test_siblings_group_and_share_centre() -> None:
    rows = [Row("a-a", "Sobha Seahaven - Tower A", "392", 25.0, 55.0), Row("a-b", "Sobha Seahaven - Tower B", "392"),
            Row("lone", "Some Tower", "392")]
    groups, far = cx.detect(rows)
    assert [g.key for g in groups] == ["392:sobha-seahaven"] and not far
    assert cx.propose_positions(groups)[0][:3] == ("a-b", 25.0, 55.0)


def test_far_apart_same_stem_is_not_a_complex() -> None:
    rows = [Row("d2", "Marina Diamond 2", "392", 25.069, 55.135), Row("d3", "Marina Diamond 3", "392", 25.081, 55.147),
            Row("d4", "Marina Diamond A", "392")]
    groups, far = cx.detect(rows)
    assert not groups and len(far) == 1
    assert cx.propose_positions(groups) == []


def test_same_stem_different_community_not_merged_and_skip_slugs() -> None:
    rows = [Row("x1", "Plaza Residences 1", "681", 25.0, 55.0), Row("x2", "Plaza Residences 2", "681"),
            Row("y1", "Plaza Residences 1", "346")]
    groups, _ = cx.detect(rows)
    assert len(groups) == 1
    assert cx.propose_positions(groups, {"x2"}) == []


def test_master_community() -> None:
    assert cx.master_community("392") == "Dubai Marina"
    assert cx.master_community("521") is None and cx.master_community(None) is None
