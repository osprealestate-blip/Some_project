from pathlib import Path

from dpi.profile import profile_csv, profile_rows, to_markdown


def test_types_fill_rate_and_examples():
    cols = profile_rows(
        ["building_name_en", "actual_worth", "floor"],
        [["Marina Gate 1", "1,200,000", "12"], ["Marina Gate 1", "950000", ""], ["Cayan", "x", "3"]],
    )
    name, worth, floor = cols
    assert name.kind == "text" and name.examples == ["Marina Gate 1", "Cayan"]
    assert worth.kind == "text"  # one bad value makes it text, which flags dirty data
    assert floor.kind == "number" and round(floor.fill_rate, 2) == 0.67


def test_personal_columns_never_show_examples():
    cols = profile_rows(["owner_name", "phone", "area_name_en"], [["Jane Doe", "0501234567", "Marsa Dubai"]])
    md = to_markdown("t", cols)
    assert "Jane" not in md and "0501234567" not in md
    assert "Marsa Dubai" in md
    assert md.count("(hidden: personal)") == 2


def test_profile_csv_handles_bom_and_short_rows(tmp_path: Path):
    f = tmp_path / "units.csv"
    f.write_text("﻿unit_number,floor,size\n1204,12,85.5\n1205\n", encoding="utf-8")
    cols = profile_csv(f)
    assert [c.name for c in cols] == ["unit_number", "floor", "size"]
    assert cols[1].filled == 1 and cols[1].total == 2
