"""Hand placing towers through an Excel sheet.

`write_sheet` builds the workbook a person fills in (busiest unplaced buildings first, empty lat/lng).
`read_sheet` + `apply` read it back, check every row and append the good ones to `db/seeds/manual_positions.csv`.
Nothing here invents a position: a row is applied only if a person typed valid Dubai coordinates for it.
"""
from __future__ import annotations

import csv
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

LAT_RANGE = (24.8, 25.4)
LNG_RANGE = (54.9, 55.6)
SHEET = "Towers"
HEADERS = ["Building ID", "Building name", "Community", "Developer", "Sales (3y)", "Rents (1y)",
           "Latitude", "Longitude", "Notes", "Slug (do not edit)"]
STATUS_HEADER = "Status"
STATUSES = ["Ready", "Off plan", "Commercial", "Hotel", "Other"]
SEED_COLUMNS = ["slug", "lat", "lng", "note"]
SAME_SPOT_M = 5.0  # two different towers this close are almost surely a copy-paste slip

INSTRUCTIONS = [
    "How to fill this sheet",
    "",
    "1. Open the Towers sheet. The busiest buildings (most sales) are first. Fill as many rows as you like, in any order.",
    "2. In Google Maps, find the tower (use the name and community), right-click the middle of the building, and click the "
    "coordinates at the top of the menu. They are copied for you, like: 25.0805, 55.1403",
    "3. Paste them into the Latitude cell. If both numbers land in that one cell, that is fine: the importer splits them. "
    "Or type each number into its own cell.",
    "4. Order matters: Google Maps gives latitude first, then longitude. Dubai latitude is about 24.8 to 25.4. "
    "Dubai longitude is about 54.9 to 55.6. Do not swap them.",
    "5. Skip any tower you cannot identify with confidence. Leave its cells empty. Use Notes for anything worth remembering.",
    "6. If there is a Status column, pick Ready, Off plan, Commercial, Hotel or Other from the dropdown when you know it. "
    "It is pre-filled only where the database knows the building is commercial or a hotel.",
    "7. Do not edit, sort away or delete the Building ID and Slug columns. Save the file, then send it back.",
    "",
    "What happens next: the importer checks each row (inside Dubai, latitude and longitude not swapped, no duplicates), "
    "adds the good ones to db/seeds/manual_positions.csv and prints a report of everything it skipped and why.",
    "Counts: Sales (3y) and Rents (1y) are the DLD contracts linked to the building in the live database.",
]


def write_sheet(rows: list[dict], path: Path, with_status: bool = False) -> None:
    """rows: id, slug, name, community, developer, sales, rents (busiest first), and status when with_status.
    With with_status a Status column (dropdown) follows Rents; it is pre-filled only when a row carries a status."""
    from openpyxl import Workbook
    from openpyxl.formatting.rule import FormulaRule
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = Workbook()
    ins = wb.active
    ins.title = "Instructions"
    ins.column_dimensions["A"].width = 120
    for i, line in enumerate(INSTRUCTIONS, 1):
        c = ins.cell(row=i, column=1, value=line)
        c.alignment = Alignment(wrap_text=True, vertical="top")
        if i == 1:
            c.font = Font(bold=True, size=14)

    ws = wb.create_sheet(SHEET)
    heads = HEADERS[:6] + ([STATUS_HEADER] if with_status else []) + HEADERS[6:]
    ws.append(heads)
    for r in rows:
        mid = [r.get("status") or None] if with_status else []
        ws.append([r["id"], r["name"], r["community"], r["developer"], r["sales"], r["rents"], *mid, None, None, None, r["slug"]])
    L = {h: chr(65 + i) for i, h in enumerate(heads)}  # header -> column letter
    head_fill = PatternFill("solid", fgColor="1F3A5F")
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head_fill
        c.alignment = Alignment(vertical="center", wrap_text=True)
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:{chr(64 + len(heads))}{len(rows) + 1}"
    widths = {"Building ID": 11, "Building name": 38, "Community": 26, "Developer": 26, "Sales (3y)": 11, "Rents (1y)": 11,
              STATUS_HEADER: 14, "Latitude": 16, "Longitude": 16, "Notes": 34, "Slug (do not edit)": 34}
    for h, col in L.items():
        ws.column_dimensions[col].width = widths[h]
    entry = PatternFill("solid", fgColor="FFF8DC")
    last = len(rows) + 1
    for r in range(2, last + 1):
        for h in ("Latitude", "Longitude", "Notes") + ((STATUS_HEADER,) if with_status else ()):
            ws[f"{L[h]}{r}"].fill = entry
        ws[f"{L['Slug (do not edit)']}{r}"].font = Font(color="888888")
    # Highlight numbers outside Dubai (and a pasted "lat, long" text is left alone: the importer splits it).
    red = PatternFill("solid", bgColor="FFC7CE")
    a, o = L["Latitude"], L["Longitude"]
    ws.conditional_formatting.add(
        f"{a}2:{a}{last}", FormulaRule(formula=[f"AND(ISNUMBER({a}2),OR({a}2<{LAT_RANGE[0]},{a}2>{LAT_RANGE[1]}))"], fill=red))
    ws.conditional_formatting.add(
        f"{o}2:{o}{last}", FormulaRule(formula=[f"AND(ISNUMBER({o}2),OR({o}2<{LNG_RANGE[0]},{o}2>{LNG_RANGE[1]}))"], fill=red))
    if with_status:
        dv = DataValidation(type="list", formula1='"' + ",".join(STATUSES) + '"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"{L[STATUS_HEADER]}2:{L[STATUS_HEADER]}{last}")
    note = DataValidation(type="textLength", operator="lessThanOrEqual", formula1="200", allow_blank=True)
    ws.add_data_validation(note)
    note.add(f"{L['Notes']}2:{L['Notes']}{last}")
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


# ---------------------------------------------------------------- reading

_NUM = r"[-+]?\d+(?:[.,]\d+)?"


def _num(v) -> float | None:
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace("°", "")
    if re.fullmatch(_NUM, s):
        return float(s.replace(",", "."))
    raise ValueError(s)


def parse_pair(lat_cell, lng_cell) -> tuple[float, float] | None:
    """Both cells, or a pasted 'lat, long' in the latitude cell. None if the row has no position. ValueError if unreadable."""
    if isinstance(lat_cell, str) and lng_cell in (None, "") and not re.fullmatch(_NUM, lat_cell.strip().replace("°", "") or "x"):
        parts = [p for p in re.split(r"[,;\s]+", lat_cell.strip()) if p]
        if len(parts) == 2:
            return _num(parts[0]), _num(parts[1])  # type: ignore[return-value]
        if not parts:
            return None
        raise ValueError(lat_cell)
    lat, lng = _num(lat_cell), _num(lng_cell)
    if lat is None and lng is None:
        return None
    if lat is None or lng is None:
        raise ValueError("only one of latitude and longitude is filled")
    return lat, lng


def _is_na(v) -> bool:
    return isinstance(v, str) and bool(re.match(r"\s*(not\s+ava|n/?a\b|unknown|none\b|-+\s*$)", v, re.I))


FAR_KM = 5.0


def _warn(entries: list[Entry], rep: Report) -> None:
    """Things that are probably typos but could be right, so a person decides: shared exact latitude or longitude,
    and two towers of the same community far apart."""
    for i, a in enumerate(entries):
        for b in entries[i + 1:]:
            if a.lng == b.lng or a.lat == b.lat:
                which = "longitude" if a.lng == b.lng else "latitude"
                for x, y in ((a, b), (b, a)):
                    rep.warnings.append((x.row, x.name or x.slug, f"same {which} to 6 decimals as {y.name or y.slug} (row {y.row}); "
                                                                  "a copy-paste slip is possible"))
    by_comm: dict[str, list[Entry]] = {}
    for e in entries:
        if e.community:
            by_comm.setdefault(e.community, []).append(e)
    for comm, es in by_comm.items():
        if len(es) < 2:
            continue
        if len(es) == 2:
            km = _metres((es[0].lat, es[0].lng), (es[1].lat, es[1].lng)) / 1000
            far = es if km > FAR_KM else []
            for x in far:
                y = es[1] if x is es[0] else es[0]
                rep.warnings.append((x.row, x.name or x.slug, f"{km:.1f} km from {y.name or y.slug} although both are in {comm}; check it"))
            continue
        lats = sorted(e.lat for e in es)
        lngs = sorted(e.lng for e in es)
        mid = (lats[len(es) // 2], lngs[len(es) // 2])
        for e in es:
            km = _metres((e.lat, e.lng), mid) / 1000
            if km > FAR_KM:
                rep.warnings.append((e.row, e.name or e.slug, f"{km:.1f} km from the middle of the other {comm} towers you filled; check it"))


def _in(v: float, rng: tuple[float, float]) -> bool:
    return rng[0] <= v <= rng[1]


def _metres(a: tuple[float, float], b: tuple[float, float]) -> float:
    dy = (a[0] - b[0]) * 111_320
    dx = (a[1] - b[1]) * 111_320 * math.cos(math.radians(a[0]))
    return math.hypot(dx, dy)


@dataclass
class Entry:
    row: int
    slug: str
    name: str
    lat: float
    lng: float
    note: str = ""
    swapped: bool = False
    community: str = ""


@dataclass
class Report:
    filled: int = 0
    applied: list[Entry] = field(default_factory=list)
    unchanged: list[str] = field(default_factory=list)
    problems: list[tuple[int, str, str]] = field(default_factory=list)  # (sheet row, building, reason)
    skipped: list[tuple[int, str, str]] = field(default_factory=list)   # person wrote "not available" etc.
    warnings: list[tuple[int, str, str]] = field(default_factory=list)  # applied or applicable, but check by eye

    def render(self) -> str:
        out = [f"Rows with a position typed in: {self.filled}",
               f"Applied (added to manual_positions.csv): {len(self.applied)}"]
        fixed = [e for e in self.applied if e.swapped]
        if fixed:
            out.append(f"  of which latitude and longitude were swapped and fixed: {len(fixed)}")
        out.append(f"Already in manual_positions.csv with the same position: {len(self.unchanged)}")
        out.append(f"Marked 'not available' by you (left alone): {len(self.skipped)}")
        for row, who, why in self.skipped:
            out.append(f"  row {row}: {who}")
        out.append(f"Rejected: {len(self.problems)}")
        for row, who, why in self.problems:
            out.append(f"  row {row}: {who}: {why}")
        out.append(f"Check by eye (not blocked): {len(self.warnings)}")
        for row, who, why in self.warnings:
            out.append(f"  row {row}: {who}: {why}")
        return "\n".join(out)


def read_sheet(path: Path, fix_swapped: bool = False) -> tuple[list[Entry], Report]:
    from openpyxl import load_workbook

    wb = load_workbook(path, read_only=True, data_only=True)
    if SHEET not in wb.sheetnames:
        raise SystemExit(f"No sheet named {SHEET!r} in {path}")
    it = wb[SHEET].iter_rows(values_only=True)
    head = [str(h).strip() if h is not None else "" for h in next(it)]
    try:
        ix = {k: head.index(k) for k in ("Building name", "Latitude", "Longitude", "Notes", "Slug (do not edit)")}
        for opt in ("Community", STATUS_HEADER):
            if opt in head:
                ix[opt] = head.index(opt)
    except ValueError as e:
        raise SystemExit(f"Missing column in {path}: {e}")
    rep = Report()
    good: list[Entry] = []
    for n, row in enumerate(it, start=2):
        row = list(row) + [None] * (len(head) - len(row))
        slug = str(row[ix["Slug (do not edit)"]] or "").strip()
        name = str(row[ix["Building name"]] or "").strip()
        who = name or slug or "(no name)"
        if _is_na(row[ix["Latitude"]]) or _is_na(row[ix["Longitude"]]):
            rep.skipped.append((n, who, "not available"))
            continue
        try:
            pair = parse_pair(row[ix["Latitude"]], row[ix["Longitude"]])
        except ValueError as e:
            rep.filled += 1
            rep.problems.append((n, who, f"cannot read the coordinates ({e})"))
            continue
        if pair is None:
            continue
        rep.filled += 1
        if not slug:
            rep.problems.append((n, who, "no slug (the Slug column was edited or deleted)"))
            continue
        lat, lng = pair
        swapped = False
        if _in(lat, LNG_RANGE) and _in(lng, LAT_RANGE):
            if not fix_swapped:
                rep.problems.append((n, who, f"latitude and longitude look swapped ({lat}, {lng}); "
                                             "re-run with --fix-swapped to apply them the other way round"))
                continue
            lat, lng, swapped = lng, lat, True
        if not (_in(lat, LAT_RANGE) and _in(lng, LNG_RANGE)):
            rep.problems.append((n, who, f"({lat}, {lng}) is outside Dubai "
                                         f"(latitude {LAT_RANGE[0]}-{LAT_RANGE[1]}, longitude {LNG_RANGE[0]}-{LNG_RANGE[1]})"))
            continue
        note = str(row[ix["Notes"]] or "").strip()
        status = str(row[ix[STATUS_HEADER]] or "").strip() if STATUS_HEADER in ix else ""
        note = "; ".join(x for x in (status, note) if x)
        comm = str(row[ix["Community"]] or "").strip() if "Community" in ix else ""
        good.append(Entry(n, slug, name, round(lat, 6), round(lng, 6), note, swapped, comm))
    kept = _drop_duplicates(good, rep)
    _warn(kept, rep)
    return kept, rep


def _drop_duplicates(entries: list[Entry], rep: Report) -> list[Entry]:
    by_slug: dict[str, list[Entry]] = {}
    for e in entries:
        by_slug.setdefault(e.slug, []).append(e)
    keep: list[Entry] = []
    for slug, es in by_slug.items():
        if len({(e.lat, e.lng) for e in es}) > 1:
            for e in es:
                rep.problems.append((e.row, e.name or slug, f"listed {len(es)} times with different positions; none applied"))
        else:
            keep.append(es[0])
            for e in es[1:]:
                rep.problems.append((e.row, e.name or slug, f"duplicate of row {es[0].row} (same position), ignored"))
    # different towers at (almost) the same spot
    bad: set[str] = set()
    for i, a in enumerate(keep):
        for b in keep[i + 1:]:
            if _metres((a.lat, a.lng), (b.lat, b.lng)) < SAME_SPOT_M:
                bad.update((a.slug, b.slug))
                for x, y in ((a, b), (b, a)):
                    rep.problems.append((x.row, x.name or x.slug,
                                         f"same spot as another tower (row {y.row}, {y.name or y.slug}); neither applied"))
    return [e for e in keep if e.slug not in bad]


def read_seed(path: Path) -> dict[str, tuple[float, float]]:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8-sig", newline="") as fh:
        out = {}
        for r in csv.DictReader(fh):
            try:
                out[r["slug"].strip()] = (float(r["lat"]), float(r["lng"]))
            except (KeyError, ValueError):
                continue
        return out


def apply(sheet: Path, seed: Path, fix_swapped: bool = False, overwrite: bool = False, dry_run: bool = False) -> Report:
    entries, rep = read_sheet(sheet, fix_swapped)
    existing = read_seed(seed)
    new: list[Entry] = []
    for e in entries:
        cur = existing.get(e.slug)
        if cur is not None and _metres(cur, (e.lat, e.lng)) < 1:
            rep.unchanged.append(e.slug)
        elif cur is not None and not overwrite:
            rep.problems.append((e.row, e.name or e.slug,
                                 f"already in {seed.name} at {cur[0]}, {cur[1]}; kept (use --overwrite to replace)"))
        else:
            new.append(e)
    rep.applied = new
    if new and not dry_run:
        replace = {e.slug for e in new} & set(existing)
        lines: list[dict] = []
        if seed.exists():
            with open(seed, encoding="utf-8-sig", newline="") as fh:
                lines = [r for r in csv.DictReader(fh) if r.get("slug", "").strip() not in replace]
        lines += [{"slug": e.slug, "lat": f"{e.lat:.6f}", "lng": f"{e.lng:.6f}", "note": "; ".join(x for x in (e.note, "user-supplied") if x)}
                  for e in new]
        seed.parent.mkdir(parents=True, exist_ok=True)
        with open(seed, "w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=SEED_COLUMNS, extrasaction="ignore")
            w.writeheader()
            w.writerows(lines)
    return rep
