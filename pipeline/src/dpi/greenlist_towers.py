"""`dpi load-greenlist-towers`: building pages for towers on the 2025 property list that the app does not have yet.

Input is a CSV, one row per tower: name, dm_code (official community number, empty = no official area), master_community,
land_number, sale_areas (DLD area names, separated by |, used to find sales when there is no official area).
Only names and the land number are taken from the list: no unit, owner or tenant data, and no unit counts. Pages have no
map position until a lookup finds one. A tower that already has a page in the same community (by name or alias) is
skipped. Sales are linked by an exact tower name in the same community (or the named DLD areas); sales already tied to a
building are never moved. Dry run by default: everything is done in one transaction and rolled back.
"""
from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

from dpi.matching.buildings import canonical_key, slugify
from dpi.names import name_key

METHOD = "greenlist"
CONFIDENCE = 0.6  # the same as a name-only match


@dataclass
class Report:
    dry_run: bool = True
    rows: int = 0
    added: int = 0
    skipped: list[str] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)
    no_area: int = 0
    with_sales: int = 0
    sales_linked: int = 0
    per_community: dict[str, int] = field(default_factory=dict)

    def render(self) -> str:
        out = ["DRY RUN, nothing written." if self.dry_run else "Written.",
               f"Towers read: {self.rows:,}; new pages: {self.added:,} (no map position)",
               f"With no official community: {self.no_area:,}",
               f"With DLD sales linked by exact name: {self.with_sales:,} ({self.sales_linked:,} sales)",
               "By community: " + "; ".join(f"{k} {v}" for k, v in sorted(self.per_community.items(), key=lambda x: (-x[1], x[0])))]
        for title, items in (("Skipped", self.skipped), ("Problems", self.problems)):
            if items:
                out.append(f"{title} ({len(items):,}):")
                out += [f"  - {x}" for x in items]
        return "\n".join(out)


def link_sales(cur, building_id: int, community_id: int | None, keys: set[str], areas: list[str]) -> int:
    """Tie unlinked sales to the tower: exact canonical name, same community (or the named areas when it has none)."""
    if community_id is None and not areas:
        return 0
    where = "community_id = %s" if community_id is not None else "community_id is null and raw_area = any(%s)"
    arg = community_id if community_id is not None else areas
    cur.execute(f"select distinct raw_building from transactions where building_id is null and raw_building is not null and {where}", (arg,))
    names = [r[0] for r in cur.fetchall() if canonical_key(r[0]) in keys]
    if not names:
        return 0
    cur.execute(f"update transactions set building_id = %s where building_id is null and raw_building = any(%s) and {where}",
                (building_id, names, arg))
    return cur.rowcount


def relink(cur) -> None:
    """After `match-buildings` rebuilt the links: tie these towers' sales again where nothing else claimed them."""
    cur.execute("select id, community_id, name_key, sale_areas from buildings where match_method = %s", (METHOD,))
    for bid, cid, key, areas in cur.fetchall():
        link_sales(cur, bid, cid, {key}, areas or [])


def run(conn, path: Path, apply: bool = False) -> Report:
    rep = Report(dry_run=not apply)
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = [{(k or "").strip().lower(): (v or "").strip() for k, v in r.items()} for r in csv.DictReader(f)]
    rep.rows = len(rows)
    with conn.cursor() as cur:
        cur.execute("set local statement_timeout = 0")
        cur.execute("select dm_code, id, coalesce(name_common, name_official) from communities where dm_code is not null")
        comms = {d: (i, n) for d, i, n in cur.fetchall()}
        cur.execute("select community_id, name_key, name_en, aliases from buildings")
        have: set[tuple[int | None, str]] = set()
        for cid, key, name, aliases in cur.fetchall():
            have |= {(cid, k) for k in [key, canonical_key(name), *(canonical_key(a) for a in aliases or [])] if k}
        cur.execute("select slug from buildings")
        taken = {r[0] for r in cur.fetchall()}
        for r in rows:
            name, code, master = r.get("name", ""), r.get("dm_code", ""), r.get("master_community") or None
            key = canonical_key(name)
            if not key:
                rep.problems.append(f"{name!r}: no usable name")
                continue
            if code and code not in comms:
                rep.problems.append(f"{name}: unknown community number {code}")
                continue
            if not code and not master:
                rep.problems.append(f"{name}: needs a community number or a master community")
                continue
            cid = comms[code][0] if code else None
            if (cid, key) in have:
                rep.skipped.append(f"{name}: already has a page")
                continue
            base = slugify(name)
            slug = base if base not in taken else f"{base}-{slugify(comms[code][1] if code else master)}"
            n = 2
            while slug in taken:
                slug = f"{base}-{n}"
                n += 1
            taken.add(slug)
            have.add((cid, key))
            aliases = sorted({name_key(name), key})
            areas = [a for a in r.get("sale_areas", "").split("|") if a]
            cur.execute("""insert into buildings (slug, name_en, name_key, community_id, aliases, land_number, match_confidence,
                             match_method, master_community, master_community_source, sale_areas)
                           values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id""",
                        (slug, " ".join(name.split()), key, cid, aliases, r.get("land_number") or None, CONFIDENCE, METHOD,
                         master, "name" if master else None, areas or None))
            bid = cur.fetchone()[0]
            if cid is not None:
                for a in aliases:
                    cur.execute("insert into building_aliases (alias_key, community_id, building_id) values (%s,%s,%s) "
                                "on conflict (alias_key, community_id) do nothing", (a, cid, bid))
            else:
                rep.no_area += 1
            linked = link_sales(cur, bid, cid, {key}, areas)
            rep.added += 1
            rep.with_sales += linked > 0
            rep.sales_linked += linked
            label = master or comms[code][1]
            rep.per_community[label] = rep.per_community.get(label, 0) + 1
    if apply:
        conn.commit()
    else:
        conn.rollback()
    return rep
