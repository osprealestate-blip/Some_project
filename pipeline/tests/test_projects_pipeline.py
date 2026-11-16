from datetime import date

from dpi.importers.projects import parse_pipeline
from dpi.names import CommunityRef, CommunityResolver

RES = CommunityResolver([CommunityRef(1, "Business Bay", None)])


def row(**kw):
    base = {"project_number": "3317", "project_name": "برج كابيتال", "project_status": "NOT_STARTED", "area_name_en": "Business Bay",
            "percent_completed": "0.00000", "project_end_date": "2028-12-22", "no_of_units": "245", "no_of_buildings": "1",
            "developer_name": "الخليج التجاري", "master_project_en": "Business Bay"}
    base.update(kw)
    return base


def test_keeps_unsold_not_started_project_keyed_by_number():
    rows, skipped = parse_pipeline([row()], RES, date(2026, 7, 6))
    assert len(rows) == 1 and skipped == {"no_number_or_name": 0, "other_status": 0, "no_community": 0}
    num, cid, name, master, dev, status, pct, start, end, comp, units, bldgs, sd = rows[0]
    assert (num, cid, status, end, comp, units, bldgs) == ("3317", 1, "NOT_STARTED", date(2028, 12, 22), None, 245, 1)


def test_skips_finished_unplaced_and_unnumbered_rows():
    rows, skipped = parse_pipeline(
        [row(project_status="FINISHED"), row(project_number="2", area_name_en="Nowhere"), row(project_number="")], RES, date(2026, 7, 6))
    assert rows == [] and skipped == {"no_number_or_name": 1, "other_status": 1, "no_community": 1}


def test_zero_units_and_bad_percent_become_none():
    rows, _ = parse_pipeline([row(no_of_units="0", percent_completed="250")], RES, date(2026, 7, 6))
    assert rows[0][6] is None and rows[0][10] is None
