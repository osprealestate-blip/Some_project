import datetime as dt

from dpi.matching.gaps import FLAG_OFFPLAN, FLAG_REAL, FLAG_UNCLEAR, classify_unplaced

T = dt.date(2026, 11, 26)


def test_rents_mean_real():
    assert classify_unplaced(10, 10, 0, 2, dt.date(2025, 1, 1), T, None, T)[0] == FLAG_REAL


def test_all_offplan_recent_is_offplan():
    assert classify_unplaced(8, 8, 0, 0, dt.date(2025, 6, 1), T, "under_construction", T)[0] == FLAG_OFFPLAN


def test_completed_project_is_real_even_if_offplan_sales():
    assert classify_unplaced(8, 8, 0, 0, dt.date(2025, 6, 1), T, "completed", T)[0] == FLAG_REAL


def test_old_first_sale_is_real():
    assert classify_unplaced(8, 8, 0, 0, dt.date(2020, 1, 1), T, None, T)[0] == FLAG_REAL


def test_few_sales_unclear():
    assert classify_unplaced(2, 2, 0, 0, dt.date(2026, 1, 1), T, None, T)[0] == FLAG_UNCLEAR
