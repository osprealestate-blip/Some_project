"""DLD Projects dataset (developer, status, percent completed, dates) onto the `projects` table.

Projects are created by `match-buildings` from the names in sales and rents; this adds the facts the Projects
file holds, joined by normalised project name. Column names differ between downloads, so each field accepts
several spellings; run `dpi profile <file>` first and the error below lists the headers found.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

from dpi.names import name_key

ALIASES = {
    "name": ["project_name_en", "project_name", "project_name_english", "name_en", "project"],
    "number": ["project_number", "project_id", "project_no"],
    "developer": ["developer_name_en", "developer_name", "developer_en", "developer"],
    "status": ["project_status", "status", "project_status_en"],
    "percent": ["percent_completed", "percentage_completed", "completion_percentage", "percent_complete"],
    "launch": ["start_date", "project_start_date", "launch_date"],
    "completion": ["completion_date", "end_date", "project_end_date", "expected_completion_date"],
}


@dataclass
class ProjectsReport:
    rows: int = 0
    matched: int = 0
    unmatched_sample: list[str] = field(default_factory=list)

    def render(self) -> str:
        s = f"projects file: {self.rows:,} rows, {self.matched:,} matched to projects already in the database"
        if self.unmatched_sample:
            s += "\nnot matched (examples): " + "; ".join(self.unmatched_sample[:10])
        return s


def _parse_date(v: str) -> date | None:
    v = (v or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S", "%d-%m-%Y"):
        try:
            d = datetime.strptime(v[:19] if "%H" in fmt else v[:10], fmt).date()
            return d if 1990 <= d.year <= 2100 else None
        except ValueError:
            continue
    return None


def _pick(header: dict[str, str], keys: list[str]) -> str | None:
    return next((header[k] for k in keys if k in header), None)


def import_file(conn, path: Path) -> ProjectsReport:
    rep = ProjectsReport()
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        header = {(h or "").strip().lower(): h for h in (reader.fieldnames or [])}
        cols = {k: _pick(header, v) for k, v in ALIASES.items()}
        if not cols["name"]:
            raise SystemExit(f"No project name column. Headers found: {sorted(header)}")
        with conn.cursor() as cur:
            for row in reader:
                rep.rows += 1
                key = name_key(row.get(cols["name"]))
                if not key:
                    continue
                pct = None
                try:
                    pct = float(row[cols["percent"]]) if cols["percent"] and row.get(cols["percent"]) not in (None, "") else None
                except ValueError:
                    pass
                if pct is not None and not 0 <= pct <= 100:
                    pct = None
                cur.execute(
                    "update projects set project_number = coalesce(%s, project_number), developer_name = coalesce(%s, developer_name), "
                    "dld_status = coalesce(%s, dld_status), percent_completed = coalesce(%s, percent_completed), "
                    "launch_date = coalesce(%s, launch_date), completion_date = coalesce(%s, completion_date) "
                    "where name_key = %s",
                    ((row.get(cols["number"]) or "").strip() or None if cols["number"] else None,
                     (row.get(cols["developer"]) or "").strip() or None if cols["developer"] else None,
                     (row.get(cols["status"]) or "").strip().upper().replace(" ", "_") or None if cols["status"] else None,
                     pct,
                     _parse_date(row.get(cols["launch"], "")) if cols["launch"] else None,
                     _parse_date(row.get(cols["completion"], "")) if cols["completion"] else None,
                     key))
                if cur.rowcount:
                    rep.matched += 1
                elif len(rep.unmatched_sample) < 10:
                    rep.unmatched_sample.append(row.get(cols["name"], ""))
    conn.commit()
    return rep
