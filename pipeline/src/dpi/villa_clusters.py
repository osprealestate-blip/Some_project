"""`dpi load-villa-clusters`: villa and townhouse clusters, one map point per project (never one per villa).

Input is a CSV, one row per cluster. It joins the special-2025 audit columns with the map point found by a
2GIS or Google lookup:

  slug | project_slug      URL name (made from the name when empty)
  name | project           display name
  lng, lat                 the cluster centre; empty = listed (page, search, community) without a map dot
  point_source             2gis | google | osm | manual (required when there is a point)
  cluster_point            true (default) = the point is the centre of a cluster, not a building
  point_note               free text, kept with the point
  dm_code                  community number; when empty it is the community polygon that contains the point
  type                     Villa | Villas | Townhouse | ... -> villa | townhouse | mixed
  plots, records           counts from the audit (plots in the cluster, DLD records behind them)
  size_median              median size in sq ft from the audit, 0 or empty = unknown
  match_names              DLD project names, separated by |; the name itself is always included
  already_in_app           true = the project already has building pages: skipped, so nothing is counted twice
  master_community         the community people search for (e.g. "Tilal Al Ghaf"); optional
  match_dm_codes           community numbers, separated by |, whose sales and rents may be matched; 0 = records with
                           no official area; "-" = match nothing; empty = no restriction

Sales and rents are matched to a cluster by an exact project-name match (lower case, no punctuation). Nothing is
guessed: a cluster whose name matches no DLD project simply shows no figures. Only aggregates are stored.

Dry run by default: everything is checked, counted and reported, and the transaction is rolled back.
"""
from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path

from dpi.names import name_key

POINT_SOURCES = ("2gis", "google", "osm", "manual")
BBOX = (54.80, 24.60, 55.70, 25.50)  # lng min, lat min, lng max, lat max: Dubai emirate with a margin
MIN_COUNT = 3  # fewer counted deals than this and a median is left empty (same rule as building figures)
_TRUE = {"1", "true", "yes", "y", "t"}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name_key(text)).strip("-")


def _first(row: dict, *names: str) -> str:
    for n in names:
        v = row.get(n)
        if v is not None and str(v).strip():
            return str(v).strip()
    return ""


def _num(text: str) -> float | None:
    try:
        return float(text.replace(",", "")) if text else None
    except ValueError:
        return None


def kind_of(text: str) -> str:
    t = text.lower()
    town, villa = "town" in t, "villa" in t
    return "mixed" if town and villa else "townhouse" if town else "villa"


def dm_list(text: str) -> list[str] | None:
    """None = no restriction, [] = match nothing."""
    if not text:
        return None
    return [x.strip() for x in text.split("|") if x.strip() and x.strip() != "-"]


@dataclass
class Cluster:
    slug: str
    name: str
    kind: str = "villa"
    lng: float | None = None
    lat: float | None = None
    geom_source: str | None = None
    is_cluster_point: bool = True
    note: str | None = None
    dm_code: str | None = None
    plots: int | None = None
    records: int | None = None
    size: float | None = None
    match_names: list[str] = field(default_factory=list)
    master: str | None = None
    match_dm: list[str] | None = None


def read_rows(path: Path) -> tuple[list[Cluster], list[str], list[str]]:
    """(clusters, problems, skipped). A problem row is left out; a skipped row is valid but not wanted."""
    clusters: list[Cluster] = []
    problems: list[str] = []
    skipped: list[str] = []
    seen: dict[str, int] = {}
    with open(path, newline="", encoding="utf-8-sig") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            r = {(k or "").strip().lower(): v for k, v in row.items()}
            name = _first(r, "name", "project")
            if not name:
                problems.append(f"line {n}: no name")
                continue
            slug = slugify(_first(r, "slug", "project_slug") or name)
            if not slug:
                problems.append(f"line {n} ({name}): no usable slug")
                continue
            if slug in seen:
                problems.append(f"line {n} ({name}): slug '{slug}' already used on line {seen[slug]}")
                continue
            seen[slug] = n
            if _first(r, "already_in_app").lower() in _TRUE:
                skipped.append(f"{name}: already has building pages")
                continue
            lng, lat = _num(_first(r, "lng", "lon", "longitude")), _num(_first(r, "lat", "latitude"))
            source = _first(r, "point_source", "geom_source").lower() or None
            if (lng is None) != (lat is None):
                problems.append(f"line {n} ({name}): needs both lng and lat")
                continue
            if lng is not None:
                if not (BBOX[0] <= lng <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
                    problems.append(f"line {n} ({name}): {lat}, {lng} is outside Dubai (latitude and longitude swapped?)")
                    continue
                if source not in POINT_SOURCES:
                    problems.append(f"line {n} ({name}): point_source must be one of {', '.join(POINT_SOURCES)}")
                    continue
            else:
                source = None
            size = _num(_first(r, "size_median", "size"))
            plots, records = _num(_first(r, "plots")), _num(_first(r, "records"))
            names = [name] + [x.strip() for x in _first(r, "match_names").split("|") if x.strip()]
            clusters.append(Cluster(
                slug=slug, name=name, kind=kind_of(_first(r, "type")), lng=lng, lat=lat, geom_source=source,
                is_cluster_point=_first(r, "cluster_point").lower() not in {"0", "false", "no", "n", "f"},
                note=_first(r, "point_note", "note") or None, dm_code=_first(r, "dm_code") or None,
                plots=int(plots) if plots is not None else None, records=int(records) if records is not None else None,
                size=size if size and size > 0 else None, match_names=names,
                master=_first(r, "master_community") or None, match_dm=dm_list(_first(r, "match_dm_codes"))))
    return clusters, problems, skipped


@dataclass
class Report:
    dry_run: bool = True
    rows: int = 0
    problems: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    with_point: int = 0
    without_point: int = 0
    no_community: int = 0
    no_area: int = 0
    matched_projects: int = 0
    with_sales: int = 0
    sales_matched: int = 0
    rents_matched: int = 0
    rents_no_subtype: int = 0
    top: list[tuple[str, int]] = field(default_factory=list)
    unmatched: list[str] = field(default_factory=list)
    written: int = 0

    def render(self) -> str:
        out = ["DRY RUN, nothing written." if self.dry_run else f"Written: {self.written:,} clusters and their figures.",
               f"Clusters read: {self.rows:,}  (problem rows left out: {len(self.problems):,}, skipped: {len(self.skipped):,})",
               f"On the map (have a point): {self.with_point:,}   listed without a map dot: {self.without_point:,}",
               f"Points with no Dubai Municipality community around them: {self.no_community:,}",
               f"Listed with no official community: {self.no_area:,}",
               f"DLD project names matched exactly: {self.matched_projects:,}",
               f"Clusters with villa or townhouse sales in the last 12 months: {self.with_sales:,}",
               f"Sales (12 months) / rent contracts (12 months) behind the figures: {self.sales_matched:,} / {self.rents_matched:,}"]
        if self.rents_matched:
            out.append(f"  of those rent contracts, {self.rents_no_subtype:,} carry no property sub-type (counted: the project name is a villa project)")
        if self.top:
            out.append("Busiest clusters: " + "; ".join(f"{n} ({c:,})" for n, c in self.top))
        if self.unmatched:
            out.append(f"No DLD sales matched by name ({len(self.unmatched):,}), first 15: " + "; ".join(self.unmatched[:15]))
        for title, items in (("Problems", self.problems), ("Skipped", self.skipped), ("Warnings", self.warnings)):
            if items:
                out.append(f"{title} ({len(items):,}), first 15:")
                out += [f"  - {x}" for x in items[:15]]
        return "\n".join(out)


_SUMMARY_SALES = """
with p as (select max(txn_date) as e, max(source_date) as sd from transactions where excluded is null),
s as (
  select m.cluster_id, least(t.rooms, 4) as rooms, t.txn_date, t.price, t.price_psf, t.size_sqft
  from transactions t join vc_match m on m.raw_project = t.raw_project
  join villa_clusters v on v.id = m.cluster_id
       and (v.match_community_ids is null or coalesce(t.community_id, 0) = any(v.match_community_ids))
  where t.excluded is null and t.property_type in ('villa', 'townhouse')
)
select cluster_id, case when grouping(rooms) = 1 then -1 else rooms end as rooms,
       count(*) filter (where txn_date > (select e from p) - interval '12 months') as n12,
       percentile_cont(0.5) within group (order by price_psf) filter (where txn_date > (select e from p) - interval '12 months'),
       percentile_cont(0.5) within group (order by price) filter (where txn_date > (select e from p) - interval '12 months'),
       percentile_cont(0.5) within group (order by size_sqft) filter (where txn_date > (select e from p) - interval '12 months'),
       count(*) as n_all, max(txn_date), (select e from p), (select sd from p)
from s group by grouping sets ((cluster_id, rooms), (cluster_id))
having grouping(rooms) = 1 or rooms is not null
"""

_SUMMARY_RENTS = """
with p as (select max(txn_date) as e from transactions where excluded is null)
select m.cluster_id, case when grouping(least(r.rooms, 4)) = 1 then -1 else least(r.rooms, 4) end as rooms, count(*),
       percentile_cont(0.5) within group (order by r.annual_rent), count(*) filter (where r.sub_type is null)
from rent_contracts r join vc_match m on m.raw_project = r.raw_project
join villa_clusters v on v.id = m.cluster_id
     and (v.match_community_ids is null or coalesce(r.community_id, 0) = any(v.match_community_ids))
cross join p
where r.excluded is null and r.rooms is not null and r.start_date > p.e - interval '12 months' and r.start_date <= p.e
  and (r.sub_type is null or r.sub_type ~* '(villa|town)')
group by grouping sets ((m.cluster_id, least(r.rooms, 4)), (m.cluster_id))
"""


def run(conn, path: Path, apply: bool = False, source_date=None) -> Report:
    from datetime import date

    clusters, problems, skipped = read_rows(path)
    rep = Report(dry_run=not apply, rows=len(clusters), problems=problems, skipped=skipped)
    rep.with_point = sum(c.lng is not None for c in clusters)
    rep.without_point = len(clusters) - rep.with_point
    stamp = source_date or date.today()
    with conn.cursor() as cur:
        cur.execute("set local statement_timeout = 0")
        # 1. The clusters, upserted by slug. A cluster with no point keeps any point it already has.
        for c in clusters:
            cur.execute("""
                insert into villa_clusters (slug, name, kind, geom, geom_source, is_cluster_point, geom_note, plot_count,
                                            record_count, size_median_sqft, match_names, source_date, master_community)
                values (%(slug)s, %(name)s, %(kind)s,
                        case when %(lng)s::float8 is null then null else ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326) end,
                        %(src)s, %(cp)s, %(note)s, %(plots)s, %(records)s, %(size)s, %(names)s, %(sd)s, %(master)s)
                on conflict (slug) do update set
                  name = excluded.name, kind = excluded.kind,
                  geom = coalesce(excluded.geom, villa_clusters.geom),
                  geom_source = case when excluded.geom is null then villa_clusters.geom_source else excluded.geom_source end,
                  is_cluster_point = case when excluded.geom is null then villa_clusters.is_cluster_point else excluded.is_cluster_point end,
                  geom_note = case when excluded.geom is null then villa_clusters.geom_note else excluded.geom_note end,
                  plot_count = excluded.plot_count, record_count = excluded.record_count,
                  size_median_sqft = excluded.size_median_sqft, match_names = excluded.match_names,
                  source_date = excluded.source_date,
                  master_community = coalesce(excluded.master_community, villa_clusters.master_community)""",
                        {"slug": c.slug, "name": c.name, "kind": c.kind, "lng": c.lng, "lat": c.lat, "src": c.geom_source,
                         "cp": c.is_cluster_point, "note": c.note, "plots": c.plots, "records": c.records, "size": c.size,
                         "names": c.match_names, "sd": stamp, "master": c.master})
        # 2. Community: the number given, else the polygon that contains the point.
        for c in clusters:
            if c.dm_code:
                cur.execute("update villa_clusters v set community_id = c.id from communities c where v.slug = %s and c.dm_code = %s",
                            (c.slug, c.dm_code))
            else:
                cur.execute("""update villa_clusters v set community_id = (
                                 select c.id from communities c where c.geom is not null and ST_Contains(c.geom, v.geom) limit 1)
                               where v.slug = %s and v.geom is not null""", (c.slug,))
        cur.execute("select dm_code, id from communities where dm_code is not null")
        ids = dict(cur.fetchall())
        ids["0"] = 0
        for c in clusters:
            if c.match_dm is not None:
                cur.execute("update villa_clusters set match_community_ids = %s::int[] where slug = %s",
                            ([ids[x] for x in c.match_dm if x in ids], c.slug))
        cur.execute("select count(*) from villa_clusters where community_id is null and slug = any(%s)",
                    ([c.slug for c in clusters],))
        rep.no_area = cur.fetchone()[0]
        cur.execute("select count(*) from villa_clusters where geom is not null and community_id is null and slug = any(%s)",
                    ([c.slug for c in clusters],))
        rep.no_community = cur.fetchone()[0]
        # 3. Exact project-name matches, each DLD name given to one cluster only.
        cur.execute("select id, slug, match_names from villa_clusters where slug = any(%s)", ([c.slug for c in clusters],))
        wanted: dict[str, tuple[int, str]] = {}
        for cid, slug, names in cur.fetchall():
            for nm in names:
                k = name_key(nm)
                if not k:
                    continue
                if k in wanted and wanted[k][0] != cid:
                    rep.warnings.append(f"'{nm}' is claimed by {wanted[k][1]} and {slug}: kept with {wanted[k][1]}")
                else:
                    wanted[k] = (cid, slug)
        cur.execute("select raw_project from transactions where raw_project is not null group by raw_project")
        sale_names = [r[0] for r in cur.fetchall()]
        cur.execute("select raw_project from rent_contracts where raw_project is not null group by raw_project")
        rent_names = [r[0] for r in cur.fetchall()]
        pairs = {(raw, wanted[name_key(raw)][0]) for raw in set(sale_names) | set(rent_names) if name_key(raw) in wanted}
        rep.matched_projects = len({p[0] for p in pairs})
        cur.execute("create temp table vc_match (raw_project text, cluster_id int) on commit drop")
        with cur.copy("copy vc_match (raw_project, cluster_id) from stdin") as cp:
            for raw, cid in sorted(pairs):
                cp.write_row((raw, cid))
        cur.execute("create index on vc_match (raw_project)")
        # 4. Figures. Rebuilt for every cluster in the file, so a re-run replaces them.
        cur.execute("delete from villa_cluster_summary where cluster_id in (select id from villa_clusters where slug = any(%s))",
                    ([c.slug for c in clusters],))
        cur.execute(_SUMMARY_SALES)
        sales = cur.fetchall()
        cur.execute(_SUMMARY_RENTS)
        rents = {(cid, rooms): (n, med, nosub) for cid, rooms, n, med, nosub in cur.fetchall()}
        keys = {(r[0], r[1]) for r in sales} | set(rents)
        by_key = {(r[0], r[1]): r for r in sales}
        end = next((r[8] for r in sales), None)
        sd = next((r[9] for r in sales), None)
        if end is not None:
            for cid, rooms in sorted(keys):
                s = by_key.get((cid, rooms))
                n12, psf, price, size = (s[2], s[3], s[4], s[5]) if s else (0, None, None, None)
                rn, rmed, _ = rents.get((cid, rooms), (0, None, 0))
                ok = n12 >= MIN_COUNT
                cur.execute("""insert into villa_cluster_summary (cluster_id, rooms, sale_count_12m, sale_median_psf_12m,
                                 sale_median_price_12m, sale_median_size_12m, sale_count_all, last_sale_date, rent_count_12m,
                                 rent_median_12m, period_end, source_date)
                               values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                            (cid, rooms, n12, psf if ok else None, price if ok else None, size if ok else None,
                             s[6] if s else 0, s[7] if s else None, rn, rmed if rn >= MIN_COUNT else None, end, sd or stamp))
        cur.execute("""select v.name, s.sale_count_12m, s.rent_count_12m from villa_cluster_summary s join villa_clusters v on v.id = s.cluster_id
                        where s.rooms = -1 and v.slug = any(%s) order by s.sale_count_12m desc""", ([c.slug for c in clusters],))
        rows = cur.fetchall()
        rep.with_sales = sum(1 for r in rows if r[1] > 0)
        rep.sales_matched = sum(r[1] for r in rows)
        rep.rents_matched = sum(r[2] for r in rows)
        rep.rents_no_subtype = sum(v[2] for (cid, rooms), v in rents.items() if rooms == -1)
        rep.top = [(r[0], r[1]) for r in rows[:5] if r[1] > 0]
        have = {r[0] for r in rows if r[1] > 0}
        rep.unmatched = [c.name for c in clusters if c.name not in have]
        cur.execute("select count(*) from villa_clusters where slug = any(%s)", ([c.slug for c in clusters],))
        rep.written = cur.fetchone()[0]
    if apply:
        conn.commit()
    else:
        conn.rollback()
    return rep
