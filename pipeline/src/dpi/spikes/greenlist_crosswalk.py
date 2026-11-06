"""T1.4 spike: link DLD sale building names to DLD buildings through the Green List workbooks.

DLD's buildings file has no building name, only land_number. The Green List workbooks carry both
BuildingNameEn and LandNumber, so they bridge: sale building name -> land number -> DLD building(s).

Only market columns are ever read from the workbooks (see MARKET_COLUMNS). Owner names, phones, IDs and
birth dates are never loaded. Outputs go outside the repo (raw-derived data is never committed).

Usage:
    python -m dpi.spikes.greenlist_crosswalk --dld-dir <io2> --greenlist-dir <Special 2025> --out <dir>
Needs pandas and openpyxl (pip install -e '.[spikes]').
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from pathlib import Path

from dpi.names import is_blank, name_key

# Header names, across all workbook layouts, that hold market data. Nothing else is read.
NAME_COLUMNS = ("BuildingNameEn", "BuildingName 2", "Building 1")
MARKET_COLUMNS = frozenset(NAME_COLUMNS + ("LandNumber",))

SALES_FILES = "transactions_2026-11-02_17-44-57_000*.csv"
BUILDINGS_FILE = "buildings_2026-11-02_17-41-49_0001.csv"


def to_land(value) -> int | None:
    try:
        n = int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None
    return n if n > 0 else None


def read_greenlist(path: Path):
    """Yield (name_key, land_number) from every sheet. Only MARKET_COLUMNS are touched."""
    import openpyxl

    wb = openpyxl.load_workbook(path, read_only=True)
    try:
        for ws in wb.worksheets:
            rows = ws.iter_rows(values_only=True)
            header = next(rows, None)
            if not header:
                continue
            idx = {str(h).strip(): i for i, h in enumerate(header) if h is not None and str(h).strip() in MARKET_COLUMNS}
            if "LandNumber" not in idx or not any(c in idx for c in NAME_COLUMNS):
                continue
            for row in rows:
                land = to_land(row[idx["LandNumber"]]) if idx["LandNumber"] < len(row) else None
                if land is None:
                    continue
                for col in NAME_COLUMNS:
                    i = idx.get(col)
                    raw = row[i] if i is not None and i < len(row) else None
                    if isinstance(raw, str) and not is_blank(raw):
                        yield name_key(raw), land
                        break
    finally:
        wb.close()


def build_name_index(pairs) -> dict[str, Counter]:
    index: dict[str, Counter] = defaultdict(Counter)
    for key, land in pairs:
        index[key][land] += 1
    return index


def pick_land(counts: Counter | None, valid_lands: set[int]) -> int | None:
    """Most frequent Green List land for this name that is a real DLD plot in the sale's area."""
    if not counts:
        return None
    for land, _ in counts.most_common():
        if land in valid_lands:
            return land
    return None


def run(dld_dir: Path, gl_dir: Path, out_dir: Path) -> None:
    import pandas as pd

    books = sorted(p for p in gl_dir.glob("*.xlsx") if not p.name.startswith(("~$", "_$")))
    pairs = []
    for book in books:
        pairs.extend(read_greenlist(book))
    index = build_name_index(pairs)
    print(f"Green List: {len(books)} workbooks, {len(pairs):,} rows with name and land, {len(index):,} names")

    cols = ["area_name_en", "trans_group_en", "building_name_en", "instance_date"]
    parts = []
    for f in sorted(dld_dir.glob(SALES_FILES)):
        for chunk in pd.read_csv(f, usecols=cols, chunksize=500_000, low_memory=False):
            parts.append(chunk[chunk.trans_group_en == "Sales"])
    sales = pd.concat(parts)
    sales["key"] = sales.building_name_en.map(lambda s: "" if is_blank(s) else name_key(s))
    sales["year"] = pd.to_datetime(sales.instance_date, errors="coerce", format="mixed").dt.year

    bld = pd.read_csv(dld_dir / BUILDINGS_FILE, usecols=["area_name_en", "land_number", "property_id"], low_memory=False)
    lands_by_area = bld.groupby("area_name_en").land_number.agg(set).to_dict()
    per_plot = bld.groupby(["area_name_en", "land_number"]).size().to_dict()
    ids_by_plot = bld.groupby(["area_name_en", "land_number"]).property_id.agg(lambda s: ";".join(map(str, s))).to_dict()

    named = sales[sales.key != ""]
    grouped = named.groupby(["area_name_en", "key"]).agg(sales=("key", "size"), recent=("year", lambda y: int((y >= 2024).sum())))
    rows = []
    for (area, key), g in grouped.iterrows():
        land = pick_land(index.get(key), lands_by_area.get(area, set()))
        rows.append({
            "area": area, "sale_building_name": key, "sales": int(g.sales), "sales_2024_on": int(g.recent),
            "land_number": land if land is not None else "",
            "buildings_on_plot": per_plot.get((area, land), 0) if land is not None else 0,
            "dld_property_ids": ids_by_plot.get((area, land), "") if land is not None else "",
        })
    xw = pd.DataFrame(rows)
    xw["matched"] = xw.land_number != ""

    s = xw.assign(single=xw.matched & (xw.buildings_on_plot == 1))
    def pct(num, den):
        return round(100 * num / den, 1) if den else 0.0
    summary = s.groupby("area").apply(lambda d: pd.Series({
        "sales": int(d.sales.sum()),
        "matched_pct": pct(d.sales[d.matched].sum(), d.sales.sum()),
        "matched_2024_on_pct": pct(d.sales_2024_on[d.matched].sum(), d.sales_2024_on.sum()),
        "single_building_plot_pct": pct(d.sales[d.single].sum(), d.sales.sum()),
        "names": len(d), "names_matched": int(d.matched.sum()),
    }), include_groups=False).sort_values("sales", ascending=False)
    total = {
        "sales_with_name": int(xw.sales.sum()), "matched_pct": pct(xw.sales[xw.matched].sum(), xw.sales.sum()),
        "matched_2024_on_pct": pct(xw.sales_2024_on[xw.matched].sum(), xw.sales_2024_on.sum()),
        "single_building_plot_pct": pct(s.sales[s.single].sum(), s.sales.sum()),
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    xw.drop(columns="matched").sort_values(["area", "sales"], ascending=[True, False]).to_csv(out_dir / "building_crosswalk.csv", index=False)
    summary.to_csv(out_dir / "crosswalk_summary_by_area.csv")
    unmatched = xw[~xw.matched].sort_values("sales", ascending=False).head(40)
    unmatched[["area", "sale_building_name", "sales", "sales_2024_on"]].to_csv(out_dir / "crosswalk_top_unmatched.csv", index=False)
    print("All Dubai:", total)
    print(summary.head(25).to_string())


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--dld-dir", type=Path, required=True)
    p.add_argument("--greenlist-dir", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args(argv)
    run(a.dld_dir, a.greenlist_dir, a.out)


if __name__ == "__main__":
    main()
