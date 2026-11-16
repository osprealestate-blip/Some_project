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

# Statuses listed on community pages. FINISHED projects are left out on purpose.
PIPELINE_STATUSES = ("ACTIVE", "NOT_STARTED", "PENDING")


def _int(v: str | None) -> int | None:
    try:
        n = int(float((v or "").strip()))
    except ValueError:
        return None
    return n if n > 0 else None


def parse_pipeline(rows, resolver, source_date: date) -> tuple[list[tuple], dict[str, int]]:
    """Rows of the DLD Projects file -> dld_projects tuples for projects not yet finished, in communities we hold.

    The file names projects in Arabic, so the key is `project_number`. Rows with no number, no name, a status
    outside PIPELINE_STATUSES or an area we cannot place are skipped and counted (never guessed).
    """
    out: dict[str, tuple] = {}
    skipped = {"no_number_or_name": 0, "other_status": 0, "no_community": 0}
    for r in rows:
        num = (r.get("project_number") or "").strip()
        name = " ".join((r.get("project_name") or "").split())
        if not num or not name:
            skipped["no_number_or_name"] += 1
            continue
        status = (r.get("project_status") or "").strip().upper().replace(" ", "_")
        if status not in PIPELINE_STATUSES:
            skipped["other_status"] += 1
            continue
        cid = resolver.resolve(r.get("area_name_en"))
        if cid is None:
            skipped["no_community"] += 1
            continue
        try:
            pct = float(r["percent_completed"]) if r.get("percent_completed") not in (None, "") else None
        except ValueError:
            pct = None
        if pct is not None and not 0 <= pct <= 100:
            pct = None
        out[num] = (num, cid, name, (r.get("master_project_en") or "").strip() or None,
                    (r.get("developer_name") or "").strip() or None, status, pct,
                    _parse_date(r.get("project_start_date", "")), _parse_date(r.get("project_end_date", "")),
                    _parse_date(r.get("completion_date", "")), _int(r.get("no_of_units")),
                    _int(r.get("no_of_buildings")), source_date)
    return list(out.values()), skipped


def import_pipeline(conn, path: Path, resolver, source_date: date) -> str:
    with path.open(newline="", encoding="utf-8-sig") as f:
        rows, skipped = parse_pipeline(csv.DictReader(f), resolver, source_date)
    with conn.cursor() as cur:
        cur.execute("truncate dld_projects")
        cur.executemany(
            "insert into dld_projects (project_number, community_id, name, master_project, developer_name, dld_status, "
            "percent_completed, start_date, end_date, completion_date, no_of_units, no_of_buildings, source_date) "
            "values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", rows)
    conn.commit()
    return (f"dld_projects: {len(rows):,} not-finished projects stored (skipped: "
            + ", ".join(f"{k.replace('_', ' ')} {v:,}" for k, v in skipped.items()) + ")")


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
