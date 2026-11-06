"""DLD sales and rent contract importer (rules ported from osp-crm market_transactions.py).

Privacy: only the columns listed in FIELDS are ever read. Buyer, seller, owner and tenant
columns are never touched, even if the file has them. Rows that fail a cleaning rule are kept
with `excluded` set to the rule name, never dropped. Only rows with no usable reference or
date cannot be stored, and those are counted in the report.
"""
from __future__ import annotations

import csv
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable, Iterator

from dpi.names import CommunityResolver, is_blank

SQM_TO_SQFT = 10.7639
MIN_SIZE_SQFT = 10 * SQM_TO_SQFT
MIN_SALE_PRICE = 50_000
MIN_ANNUAL_RENT = 5_000
SANE_DATE_FLOOR = date(1990, 1, 1)
BATCH = 5000

FIELDS: dict[str, dict[str, list[str]]] = {
    "sale": {
        "ref": ["transaction_id", "transaction_number", "transaction_no"],
        "date": ["instance_date", "transaction_date", "date"],
        "group": ["trans_group_en", "transaction_type", "trans_group"],
        "procedure": ["procedure_name_en", "transaction_sub_type", "procedure_name"],
        "reg_type": ["reg_type_en", "registration_type", "reg_type"],
        "usage": ["property_usage_en", "usage"],
        "area": ["area_name_en", "area", "area_name"],
        "type": ["property_type_en", "property_type"],
        "sub_type": ["property_sub_type_en", "property_sub_type"],
        "size": ["procedure_area", "property_size_sq_m", "transaction_size_sq_m", "size_sq_m"],
        "price": ["actual_worth", "amount", "trans_value", "transaction_value"],
        "rooms": ["rooms_en", "room_s", "rooms"],
        "master": ["master_project_en", "master_project"],
        "project": ["project_name_en", "project", "project_name"],
        "building": ["building_name_en", "building_name", "building"],
    },
    "rent": {
        "ref": ["contract_id", "ejari_contract_number", "contract_number"],
        "line": ["line_number", "property_id"],
        "date": ["contract_start_date", "start_date", "registration_date"],
        "end": ["contract_end_date", "end_date"],
        "usage": ["property_usage_en", "usage"],
        "area": ["area_name_en", "area", "area_name"],
        "type": ["ejari_property_type_en", "property_type"],
        "sub_type": ["ejari_property_sub_type_en", "property_sub_type"],
        "size": ["actual_area", "property_size_sq_m", "size_sq_m"],
        "price": ["annual_amount", "annual_amount_aed"],
        "price_total": ["contract_amount", "contract_amount_aed"],
        "rooms": ["number_of_rooms", "rooms", "rooms_en"],
        "units": ["no_of_prop", "no_of_units"],
        "master": ["master_project_en", "master_project"],
        "project": ["project_name_en", "project", "project_name"],
        "is_new": ["contract_reg_type_en", "reg_type_en"],
    },
}
REQUIRED = {"sale": ["ref", "date", "size", "price"], "rent": ["ref", "date", "size"]}


class DldFileError(ValueError):
    pass


def header_key(h: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (h or "").strip().lower().lstrip("﻿")).strip("_")


def map_headers(fieldnames: Iterable[str], kind: str) -> dict[str, str]:
    by_key = {header_key(h): h for h in fieldnames if h}
    found = {}
    for field_, candidates in FIELDS[kind].items():
        for c in candidates:
            if c in by_key:
                found[field_] = by_key[c]
                break
    missing = [f for f in REQUIRED[kind] if f not in found]
    if "area" not in found and "master" not in found:
        missing.append("area")
    if kind == "rent" and "price" not in found and "price_total" not in found:
        missing.append("price")
    if missing:
        raise DldFileError(f"Not a DLD {kind} export, missing column(s): {', '.join(missing)}")
    return found


_DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d.%m.%Y")


def parse_date(value) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    head = text.replace("T", " ").split(" ")[0]
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(head, fmt).date()
        except ValueError:
            continue
    return None


def parse_number(value) -> float | None:
    text = str(value if value is not None else "").strip().replace(",", "").replace("AED", "").strip()
    if not text:
        return None
    try:
        n = float(text)
    except ValueError:
        return None
    return n if n == n else None


def parse_rooms(value) -> int | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    if "studio" in text:
        return 0
    m = re.match(r"^\s*(\d{1,2})\s*(b\s*/?\s*r|bed|bhk|br|room|$)", text)
    return min(int(m.group(1)), 9) if m else None


_TYPE_WORDS = [
    ("commercial vill", "commercial"), ("hotel room", "other"), ("townhouse", "townhouse"),
    ("town house", "townhouse"), ("villa", "villa"), ("plot", "land"), ("land", "land"),
    ("flat", "apartment"), ("apartment", "apartment"), ("penthouse", "apartment"),
    ("studio", "apartment"), ("bed", "apartment"), ("office", "commercial"), ("shop", "commercial"),
    ("show room", "commercial"), ("showroom", "commercial"), ("retail", "commercial"),
    ("warehouse", "commercial"), ("industrial", "commercial"), ("workshop", "commercial"),
    ("commercial", "commercial"), ("building", "building"),
]


def normalise_type(main, sub=None, usage=None) -> str:
    for text in (sub, main):
        t = (text or "").strip().lower()
        for word, kind in _TYPE_WORDS:
            if t and word in t:
                return kind
    if (main or "").strip().lower() == "unit":
        return "commercial" if (usage or "").strip().lower().startswith("commercial") else "apartment"
    return "other"


def _off_plan(value) -> bool | None:
    t = (value or "").strip().lower()
    if not t:
        return None
    if "off" in t:
        return True
    if "exist" in t or "ready" in t:
        return False
    return None


def _is_sale(group, procedure) -> bool:
    g = (group or "").strip().lower()
    if g:
        return g.startswith("sale") or g == "sell"
    p = (procedure or "").strip().lower()
    return not any(w in p for w in ("mortgage", "gift", "grant", "inherit"))


def _clean(value, limit=200) -> str | None:
    if value is None or is_blank(value):
        return None
    return (" ".join(str(value).split()))[:limit] or None


def exclusion(kind: str, size_sqft: float, price: float, when: date, today: date) -> str | None:
    if size_sqft < MIN_SIZE_SQFT:
        return "too_small"
    if price < (MIN_SALE_PRICE if kind == "sale" else MIN_ANNUAL_RENT):
        return "price_too_low"
    if when > today + timedelta(days=31):
        return "future_date"
    if when < SANE_DATE_FLOOR:
        return "date_too_early"
    return None


@dataclass
class Report:
    rows_read: int = 0
    loaded: int = 0
    excluded: Counter = field(default_factory=Counter)
    skipped: Counter = field(default_factory=Counter)  # rows that cannot be stored at all
    unmatched_areas: Counter = field(default_factory=Counter)

    def render(self) -> str:
        lines = [f"rows read: {self.rows_read}", f"rows loaded: {self.loaded}"]
        lines += [f"excluded by rule {k}: {v}" for k, v in sorted(self.excluded.items())]
        lines += [f"skipped ({k}): {v}" for k, v in sorted(self.skipped.items())]
        if self.unmatched_areas:
            lines.append("top unmatched areas (rows with no community):")
            lines += [f"  {n}  {a}" for a, n in self.unmatched_areas.most_common(15)]
        return "\n".join(lines)


def parse_rows(lines: Iterable[str], kind: str, resolver: CommunityResolver, source_date: date,
               report: Report, today: date | None = None) -> Iterator[dict]:
    today = today or date.today()
    reader = csv.DictReader(lines)
    if not reader.fieldnames:
        raise DldFileError("The file is empty")
    cols = map_headers(reader.fieldnames, kind)
    get = lambda r, f: r.get(cols[f]) if f in cols else None  # noqa: E731
    for r in reader:
        report.rows_read += 1
        if kind == "sale" and not _is_sale(get(r, "group"), get(r, "procedure")):
            report.skipped["not_a_sale"] += 1
            continue
        ref = (get(r, "ref") or "").strip()
        if kind == "rent":
            line = (get(r, "line") or "").strip()
            if line:
                ref = f"{ref}:{line}"
        when = parse_date(get(r, "date"))
        size_sqm = parse_number(get(r, "size"))
        price = parse_number(get(r, "price"))
        if kind == "rent" and price is None:
            price = parse_number(get(r, "price_total"))
        if not ref or when is None or not size_sqm or size_sqm <= 0 or not price or price <= 0:
            report.skipped["missing_values"] += 1
            continue
        size_sqft = round(size_sqm * SQM_TO_SQFT, 1)
        rule = exclusion(kind, size_sqft, price, when, today)
        if kind == "rent":
            units = parse_number(get(r, "units"))
            if rule is None and units and units > 1:
                rule = "multi_unit"
        if rule:
            report.excluded[rule] += 1
        area, master = get(r, "area"), get(r, "master")
        community_id = resolver.resolve(area, master)
        sub = get(r, "sub_type")
        rooms = parse_rooms(get(r, "rooms"))
        if rooms is None and kind == "rent":
            rooms = parse_rooms(sub)
        row = {
            "source": "dld", "source_ref": ref[:64], "source_date": source_date,
            "community_id": community_id, "raw_area": _clean(area, 150), "excluded": rule,
            "size_sqft": size_sqft, "rooms": rooms, "raw_project": _clean(get(r, "project")),
        }
        if kind == "sale":
            row.update(txn_date=when, price=round(price, 2), price_psf=round(price / size_sqft, 2),
                       property_type=normalise_type(get(r, "type"), sub, get(r, "usage")),
                       off_plan=_off_plan(get(r, "reg_type")), raw_building=_clean(get(r, "building")))
        else:
            end = parse_date(get(r, "end"))
            reg = (get(r, "is_new") or "").strip().lower()
            row.update(start_date=when, end_date=end if end and end >= when else None,
                       annual_rent=round(price, 2), is_new=reg.startswith("new") if reg else None,
                       raw_building=None)
        yield row


SALE_COLS = ["source", "source_ref", "source_date", "community_id", "raw_building", "raw_project", "raw_area",
             "txn_date", "price", "size_sqft", "price_psf", "rooms", "property_type", "off_plan", "excluded"]
RENT_COLS = ["source", "source_ref", "source_date", "community_id", "raw_building", "raw_project", "raw_area",
             "start_date", "end_date", "annual_rent", "size_sqft", "rooms", "is_new", "excluded"]


def upsert_sql(kind: str) -> str:
    table, cols = ("transactions", SALE_COLS) if kind == "sale" else ("rent_contracts", RENT_COLS)
    names = ", ".join(cols)
    params = ", ".join(f"%({c})s" for c in cols)
    sets = ", ".join(f"{c} = excluded.{c}" for c in cols if c not in ("source", "source_ref"))
    return (f"insert into {table} ({names}) values ({params}) "
            f"on conflict (source, source_ref) do update set {sets}")


def import_file(conn, path: Path, kind: str, source_date: date, resolver: CommunityResolver) -> Report:
    report = Report()
    sql = upsert_sql(kind)

    def flush(batch: list[dict]) -> None:
        if not batch:
            return
        unique = list({(r["source"], r["source_ref"]): r for r in batch}.values())
        with conn.cursor() as cur:
            cur.executemany(sql, unique)
        conn.commit()
        report.loaded += len(unique)

    with open(path, encoding="utf-8-sig", errors="replace", newline="") as fh:
        batch: list[dict] = []
        for row in parse_rows(fh, kind, resolver, source_date, report):
            batch.append(row)
            if len(batch) >= BATCH:
                flush(batch)
                batch = []
        flush(batch)
    for area, n in resolver.unmatched.items():
        report.unmatched_areas[area] += n
    return report
