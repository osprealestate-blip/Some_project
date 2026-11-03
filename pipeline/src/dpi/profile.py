"""Profile a raw dataset's columns, the first step of M1.

Before any importer or matching code is written, every downloaded file gets a column profile:
name, how often it is filled, a few distinct example values and a guessed type. The output is
Markdown that goes into docs/datasets.md, so the team can see, for example, whether the
Registered Freehold Units file carries floor and unit numbers.

Example values are taken only from columns whose names do not look personal (owner, name,
phone, email, ID numbers), so a profile can be shared without leaking personal data.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

PERSONAL = re.compile(r"(owner|buyer|seller|tenant|lessor|lessee|name(?!_en|_ar)|phone|mobile|email|passport|emirates_?id|\bid_?no)", re.I)
MAX_EXAMPLES = 5


@dataclass
class ColumnProfile:
    name: str
    filled: int = 0
    total: int = 0
    examples: list[str] = field(default_factory=list)
    numeric: bool = True
    personal: bool = False

    def add(self, value: str | None) -> None:
        self.total += 1
        v = (value or "").strip()
        if not v:
            return
        self.filled += 1
        if self.numeric and not _is_number(v):
            self.numeric = False
        if not self.personal and len(self.examples) < MAX_EXAMPLES and v not in self.examples:
            self.examples.append(v[:60])

    @property
    def kind(self) -> str:
        if self.filled == 0:
            return "empty"
        return "number" if self.numeric else "text"

    @property
    def fill_rate(self) -> float:
        return self.filled / self.total if self.total else 0.0


def _is_number(v: str) -> bool:
    try:
        float(v.replace(",", ""))
        return True
    except ValueError:
        return False


def profile_rows(header: list[str], rows: Iterable[list[str]], limit: int | None = None) -> list[ColumnProfile]:
    cols = [ColumnProfile(name=h.strip(), personal=bool(PERSONAL.search(h))) for h in header]
    for i, row in enumerate(rows):
        if limit is not None and i >= limit:
            break
        for j, col in enumerate(cols):
            col.add(row[j] if j < len(row) else None)
    return cols


def profile_csv(path: Path, limit: int | None = 200_000) -> list[ColumnProfile]:
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        return profile_rows(header, reader, limit)


def to_markdown(title: str, cols: list[ColumnProfile]) -> str:
    rows_seen = cols[0].total if cols else 0
    lines = [
        f"### {title}",
        "",
        f"{len(cols)} columns, {rows_seen:,} rows profiled.",
        "",
        "| Column | Type | Filled | Examples |",
        "| --- | --- | --- | --- |",
    ]
    for c in cols:
        ex = "(hidden: personal)" if c.personal else ", ".join(f"`{e}`" for e in c.examples)
        lines.append(f"| `{c.name}` | {c.kind} | {c.fill_rate:.0%} | {ex} |")
    return "\n".join(lines) + "\n"
