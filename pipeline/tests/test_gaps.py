import csv

from dpi.matching.gaps import CSV_COLUMNS, RENT_GAP_HELP, render_rent_gaps, write_unplaced
from dpi.matching.osm import read_manual


def test_unplaced_csv_is_a_valid_manual_positions_file_once_filled(tmp_path):
    rows = [{"slug": "binghatti-vintage", "lat": "", "lng": "", "note": "", "name": "Binghatti Vintage",
             "community": "Wadi Al Safa 3", "project": "Binghatti Vintage", "sales_12m": 1519, "sales_all": 1519,
             "sibling_placed": "no"},
            {"slug": "maybach-six-tower-b", "lat": "25.1234", "lng": "55.2345", "note": "checked on OSM", "name": "x",
             "community": "y", "project": "z", "sales_12m": 1, "sales_all": 2, "sibling_placed": "yes"}]
    path = tmp_path / "unplaced.csv"
    write_unplaced(rows, path)
    assert next(csv.reader(open(path, encoding="utf-8")))[:4] == ["slug", "lat", "lng", "note"]
    # Empty rows are skipped by the placer; filled rows are used. Nothing is placed without coordinates.
    assert read_manual(path) == [{"slug": "maybach-six-tower-b", "lat": 25.1234, "lng": 55.2345}]


def test_rent_gap_report_names_every_group():
    rows = [("0 linked to a building", 170, 150), ("1 community has no building pages", 750, 300),
            ("4 project has several towers", 80, 70)]
    text = render_rent_gaps(rows)
    assert "17.0%" in text and "75.0%" in text
    assert all(k in RENT_GAP_HELP for k, _, _ in rows)
