"""Hand-placement sheet: building it, and reading it back with every safety check."""
from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("openpyxl")
from openpyxl import load_workbook

from dpi.matching import manual_sheet as ms

ROWS = [{"id": i, "slug": f"tower-{i}", "name": f"Tower {i}", "community": "Business Bay", "developer": "", "sales": 100 - i,
         "rents": i} for i in range(1, 9)]


def _sheet(tmp_path: Path, fills: dict[int, tuple]) -> Path:
    p = tmp_path / "s.xlsx"
    ms.write_sheet(ROWS, p)
    wb = load_workbook(p)
    ws = wb[ms.SHEET]
    for i, vals in fills.items():  # i = building number 1..8 -> sheet row i+1
        for col, v in zip("GHI", vals):
            ws[f"{col}{i + 1}"] = v
    wb.save(p)
    return p


def test_sheet_layout(tmp_path: Path) -> None:
    p = tmp_path / "s.xlsx"
    ms.write_sheet(ROWS, p)
    wb = load_workbook(p)
    assert wb.sheetnames == ["Instructions", "Towers"]
    ws = wb["Towers"]
    assert [c.value for c in ws[1]] == ms.HEADERS
    assert ws.freeze_panes == "C2"
    assert ws["G2"].value is None and ws["H2"].value is None  # coordinates are never pre-filled
    assert "Do not swap" in " ".join(str(c.value) for c in wb["Instructions"]["A"]) or "swap" in str(wb["Instructions"]["A5"].value)


def test_applies_valid_rows_and_formats(tmp_path: Path) -> None:
    sheet = _sheet(tmp_path, {1: (25.18, 55.26, "next to the mall"), 2: ("25.0805, 55.1403", None, None), 3: ("25,19", 55.27, None)})
    seed = tmp_path / "seed.csv"
    seed.write_text("slug,lat,lng,note\n", encoding="utf-8")
    rep = ms.apply(sheet, seed)
    assert [e.slug for e in rep.applied] == ["tower-1", "tower-2", "tower-3"]
    assert rep.problems == []
    rows = seed.read_text(encoding="utf-8").splitlines()
    assert rows[0] == "slug,lat,lng,note"
    assert "tower-1,25.180000,55.260000,next to the mall; user-supplied" in rows
    assert "tower-2,25.080500,55.140300,user-supplied" in rows
    assert "tower-3,25.190000,55.270000,user-supplied" in rows
    assert ms.read_seed(seed)["tower-2"] == (25.0805, 55.1403)  # the placer's own reader accepts it
    from dpi.matching.osm import read_manual
    assert {r["slug"] for r in read_manual(seed)} == {"tower-1", "tower-2", "tower-3"}


def test_empty_rows_ignored(tmp_path: Path) -> None:
    rep = ms.apply(_sheet(tmp_path, {}), tmp_path / "seed.csv")
    assert rep.filled == 0 and rep.applied == [] and not (tmp_path / "seed.csv").exists()


def test_swapped_is_flagged_not_applied(tmp_path: Path) -> None:
    sheet = _sheet(tmp_path, {1: (55.26, 25.18, None)})
    seed = tmp_path / "seed.csv"
    rep = ms.apply(sheet, seed)
    assert rep.applied == [] and "swapped" in rep.problems[0][2] and not seed.exists()


def test_fix_swapped_option(tmp_path: Path) -> None:
    rep = ms.apply(_sheet(tmp_path, {1: (55.26, 25.18, None)}), tmp_path / "seed.csv", fix_swapped=True)
    assert (rep.applied[0].lat, rep.applied[0].lng, rep.applied[0].swapped) == (25.18, 55.26, True)
    assert "swapped and fixed: 1" in rep.render()


@pytest.mark.parametrize("vals,why", [((40.0, 55.0), "outside Dubai"), ((25.2, 10.0), "outside Dubai"), ((0, 0), "outside Dubai"),
                                      (("abc", 55.2), "cannot read"), ((25.2, None), "only one"), (("1, 2, 3", None), "cannot read")])
def test_bad_values_rejected(tmp_path: Path, vals, why) -> None:
    rep = ms.apply(_sheet(tmp_path, {1: (*vals, None)}), tmp_path / "seed.csv")
    assert rep.applied == [] and why in rep.problems[0][2]


def test_two_towers_same_spot_neither_applied(tmp_path: Path) -> None:
    rep = ms.apply(_sheet(tmp_path, {1: (25.2, 55.3, None), 2: (25.200001, 55.300001, None), 3: (25.21, 55.31, None)}),
                   tmp_path / "seed.csv")
    assert [e.slug for e in rep.applied] == ["tower-3"]
    assert sum("same spot" in p[2] for p in rep.problems) == 2


def test_same_slug_twice(tmp_path: Path) -> None:
    p = _sheet(tmp_path, {1: (25.2, 55.3, None)})
    wb = load_workbook(p)
    ws = wb[ms.SHEET]
    ws.append([1, "Tower 1", "Business Bay", "", 0, 0, 25.2, 55.3, None, "tower-1"])      # same position: ignored
    ws.append([2, "Tower 2", "Business Bay", "", 0, 0, 25.3, 55.4, None, "tower-2"])
    ws.append([2, "Tower 2", "Business Bay", "", 0, 0, 25.31, 55.4, None, "tower-2"])      # conflicting: none applied
    wb.save(p)
    rep = ms.apply(p, tmp_path / "seed.csv")
    assert [e.slug for e in rep.applied] == ["tower-1"]
    assert any("duplicate" in x[2] for x in rep.problems) and any("different positions" in x[2] for x in rep.problems)


def test_existing_seed_kept_unless_overwrite(tmp_path: Path) -> None:
    seed = tmp_path / "seed.csv"
    seed.write_text("slug,lat,lng,note\ntower-1,25.1,55.1,old\ntower-2,25.2,55.2,same\n", encoding="utf-8")
    sheet = _sheet(tmp_path, {1: (25.18, 55.26, None), 2: (25.2, 55.2, None)})
    rep = ms.apply(sheet, seed)
    assert rep.unchanged == ["tower-2"] and rep.applied == [] and "kept" in rep.problems[0][2]
    assert ms.read_seed(seed)["tower-1"] == (25.1, 55.1)
    rep = ms.apply(sheet, seed, overwrite=True)
    assert [e.slug for e in rep.applied] == ["tower-1"]
    assert ms.read_seed(seed) == {"tower-1": (25.18, 55.26), "tower-2": (25.2, 55.2)}


def test_dry_run_writes_nothing(tmp_path: Path) -> None:
    rep = ms.apply(_sheet(tmp_path, {1: (25.18, 55.26, None)}), tmp_path / "seed.csv", dry_run=True)
    assert len(rep.applied) == 1 and not (tmp_path / "seed.csv").exists()


def test_wrong_workbook(tmp_path: Path) -> None:
    from openpyxl import Workbook
    p = tmp_path / "x.xlsx"
    Workbook().save(p)
    with pytest.raises(SystemExit):
        ms.read_sheet(p)


def test_degree_signs_not_available_and_warnings(tmp_path: Path) -> None:
    sheet = _sheet(tmp_path, {1: ("25.039082\u00b0 ", "55.19059\u00b0", "offplan"), 2: ("not available", None, None),
                              3: ("not avaialable", None, None), 4: (25.2, 55.19059, None), 5: (25.05, 55.0, None)})
    rep = ms.apply(sheet, tmp_path / "seed.csv", dry_run=True)
    assert [e.slug for e in rep.applied] == ["tower-1", "tower-4", "tower-5"]
    assert len(rep.skipped) == 2 and rep.problems == []
    assert any("same longitude" in w[2] for w in rep.warnings)
    assert any("km from" in w[2] for w in rep.warnings)  # all towers share one community in the fixture


def test_status_sheet_roundtrip(tmp_path: Path) -> None:
    rows = [dict(ROWS[0], status="Commercial"), dict(ROWS[1], status=None)]
    p = tmp_path / "s.xlsx"
    ms.write_sheet(rows, p, with_status=True)
    wb = load_workbook(p)
    ws = wb[ms.SHEET]
    heads = [c.value for c in ws[1]]
    assert heads[6] == "Status" and ws["G2"].value == "Commercial" and ws["G3"].value is None
    assert [v.formula1 for v in ws.data_validations.dataValidation if v.type == "list"] == ['"Ready,Off plan,Commercial,Hotel,Other"']
    ws[f"H2"], ws[f"I2"], ws["G3"], ws["H3"], ws["I3"] = 25.2, 55.3, "Off plan", 25.3, 55.4
    wb.save(p)
    rep = ms.apply(p, tmp_path / "seed.csv")
    assert [e.note for e in rep.applied] == ["Commercial", "Off plan"]
    assert "tower-2,25.300000,55.400000,Off plan; user-supplied" in (tmp_path / "seed.csv").read_text()
