"""End-to-end pipeline run on a real PostGIS database with synthetic files.

Skipped unless TEST_DATABASE_URL points at an empty, throwaway database (CI sets it). The test drops and
recreates the public schema, so never point it at a database with real data.
"""
import json
import os
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")
ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="module")
def conn(tmp_path_factory):
    import psycopg

    from synthetic import write

    c = psycopg.connect(URL)
    with c.cursor() as cur:
        cur.execute("drop schema public cascade; create schema public")
        for f in sorted((ROOT / "db" / "migrations").glob("*.sql")):
            cur.execute(f.read_text(encoding="utf-8"))
    c.commit()
    out = tmp_path_factory.mktemp("synthetic")
    write(out)
    c.info_dir = out  # type: ignore[attr-defined]
    yield c
    c.close()


def test_full_pipeline(conn):
    from dpi import communities
    from dpi.importers import dld
    from dpi.load import pois
    from dpi.matching import buildings, osm
    from dpi.metrics import compute
    from dpi.names import CommunityRef, CommunityResolver

    out = conn.info_dir
    total, launch = communities.load(conn, ROOT / "web" / "public" / "data" / "dubai_communities.geojson")
    assert launch == 3
    with conn.cursor() as cur:
        cur.execute("select id, name_official, name_common from communities")
        resolver = CommunityResolver([CommunityRef(*r) for r in cur.fetchall()])
    sd = date(2026, 11, 2)
    assert dld.import_file(conn, out / "sales.csv", "sale", sd, resolver).loaded == 8 * 140
    assert dld.import_file(conn, out / "rents.csv", "rent", sd, resolver).loaded == 8 * 80

    rep = buildings.run(conn, source_date=sd)
    assert rep.buildings == 8  # spellings merged: Princess/PRINCESS, The Torch/Torch Tower, Bay Square variants
    assert rep.sales_linked == rep.sales_named == 8 * 140
    # Marina Gate has two towers, so its rents have no exact tower; every other project is one tower.
    # Each tower has its own flat sizes, so Marina Gate rents are placed by size (estimated) in the right tower,
    # except layouts the tower has sold fewer than MIN_SUPPORT times, which stay at project level.
    assert rep.rents_project == 8 * 80 and 0.7 * 2 * 80 < rep.rents_estimated < 2 * 80
    assert rep.rents_linked == 6 * 80 + rep.rents_estimated
    truth = json.loads((out / "rents_truth.json").read_text())
    with conn.cursor() as cur:
        cur.execute("select r.source_ref, b.name_en from rent_contracts r join buildings b on b.id = r.building_id "
                    "where r.building_match = 'size'")
        placed = cur.fetchall()
    assert placed and all(truth[ref.split(":")[0]] == name for ref, name in placed)

    from dpi.matching import rents as rent_match
    bt = rent_match.backtest(conn, cutoff=date(2026, 1, 1))
    assert bt.rents_predicted == bt.rents_correct > 0  # single-tower rents, project hidden: always the right tower
    assert bt.sales_correct == bt.sales_predicted > 0

    # Re-running keeps slugs stable.
    with conn.cursor() as cur:
        cur.execute("select slug from buildings order by slug")
        slugs = [s for (s,) in cur.fetchall()]
    buildings.run(conn, source_date=sd)
    with conn.cursor() as cur:
        cur.execute("select slug from buildings order by slug")
        assert [s for (s,) in cur.fetchall()] == slugs
    assert "princess-tower" in slugs and ("the-torch" in slugs or "torch-tower" in slugs)

    place = osm.place(conn, json.loads((out / "osm_buildings.json").read_text()), None)
    assert place.osm == 8 and place.unplaced == 0

    m = compute.run(conn)
    with conn.cursor() as cur:
        cur.execute("select max(txn_date) from transactions where excluded is null")
        assert m.period_end == cur.fetchone()[0]  # window ends on the newest sale, not today
    with conn.cursor() as cur:
        cur.execute("select s.sale_count_12m, s.sale_median_psf_12m, s.rent_level, s.sale_count_all "
                    "from building_summary s join buildings b on b.id = s.building_id "
                    "where b.slug = 'princess-tower' and s.rooms = -1")
        n12, psf, level, n_all = cur.fetchone()
        assert 0 < n12 < 140 and n_all == 140 and 1400 < psf < 2200 and level == "building"
        cur.execute("select rent_level from building_summary s join buildings b on b.id = s.building_id "
                    "where b.slug = 'marina-gate-1' and s.rooms = -1")
        assert cur.fetchone()[0] == "estimated"
        cur.execute("select count(*) from building_summary where gross_yield is not null and gross_yield between 0.02 and 0.12")
        assert cur.fetchone()[0] > 0
        cur.execute("select count(*) from community_summary cs join communities c on c.id = cs.community_id "
                    "where c.dm_code in ('392', '681', '346') and cs.rooms = -1")
        assert cur.fetchone()[0] == 3

    n = pois.replace_source(conn, "osm", sd, pois.read_osm(json.loads((out / "osm_pois.json").read_text())))
    assert n == 8
    with conn.cursor() as cur:
        cur.execute("select count(*) from pois p join buildings b on b.slug = 'princess-tower' "
                    "where ST_DWithin(p.geom::geography, ST_Centroid(b.geom)::geography, 1000)")
        assert cur.fetchone()[0] == 7


def test_rent_size_typos_do_not_break_the_estimate(conn):
    from dpi.matching import rents

    with conn.transaction(force_rollback=True), conn.cursor() as cur:
        cur.execute("select id from communities limit 1")
        community = cur.fetchone()[0]
        cur.execute("""insert into rent_contracts (source, source_ref, source_date, community_id, start_date,
                         annual_rent, size_sqft, rooms)
                       values ('test', 'huge', '2026-01-01', %s, '2026-01-01', 90000, 1.0e10, 1)""", (community,))
        rents.estimate(cur)
        cur.execute("select building_id from rent_contracts where source_ref = 'huge'")
        assert cur.fetchone()[0] is None


def test_odd_records_are_set_aside_and_cleared_on_rerun(conn):
    from dpi.metrics import compute, outliers

    with conn.transaction(force_rollback=True), conn.cursor() as cur:
        cur.execute("select b.id, b.community_id, b.project_id, max(t.txn_date) from buildings b "
                    "join transactions t on t.building_id = b.id where b.slug = 'princess-tower' group by 1, 2, 3")
        building, community, project, day = cur.fetchone()
        # An AED 46 per sq ft "sale" and a studio "rented" for a million, next to normal records.
        cur.execute("""insert into transactions (source, source_ref, source_date, community_id, building_id, project_id,
                         txn_date, price, size_sqft, price_psf, rooms, property_type, off_plan)
                       values ('test', 'odd-sale', %s, %s, %s, %s, %s, 60000, 1300, 46, 1, 'apartment', false)""",
                    (day, community, building, project, day))
        cur.execute("""insert into rent_contracts (source, source_ref, source_date, community_id, project_id, start_date,
                         annual_rent, size_sqft, rooms)
                       values ('test', 'odd-rent', %s, %s, %s, %s, 1000000, 400, 0)""", (day, community, project, day))
        rep = outliers.flag(cur)
        assert rep.sales >= 1 and rep.rents >= 1
        cur.execute("select excluded from transactions where source_ref = 'odd-sale'")
        assert cur.fetchone()[0] == outliers.SALE_RULE
        cur.execute("select excluded from rent_contracts where source_ref = 'odd-rent'")
        assert cur.fetchone()[0] == outliers.RENT_RULE
        # Normal records stay counted: almost nothing else in the synthetic data is flagged.
        cur.execute("select count(*) from transactions where excluded is not null")
        assert cur.fetchone()[0] <= 1 + 0.01 * 8 * 140
        # A re-run clears old flags before setting new ones.
        cur.execute("delete from transactions where source_ref = 'odd-sale'")
        cur.execute("delete from rent_contracts where source_ref = 'odd-rent'")
        cur.execute("update transactions set excluded = %s where source_ref = (select min(source_ref) from transactions)",
                    (outliers.SALE_RULE,))
        outliers.flag(cur)
        cur.execute("select count(*) from transactions where excluded = %s", (outliers.SALE_RULE,))
        assert cur.fetchone()[0] <= 0.01 * 8 * 140

    compute.run(conn)  # leaves the summaries as the full test computed them
    with conn.cursor() as cur:
        cur.execute("select cs.sale_count_ready_12m + cs.sale_count_offplan_12m, cs.sale_count_12m, cs.like_for_like_towers "
                    "from community_summary cs join communities c on c.id = cs.community_id "
                    "where c.dm_code = '392' and cs.rooms = -1")
        split, total, towers = cur.fetchone()
        assert split == total and towers >= 3


def test_more_towers_placed_and_approximate_positions_rebuilt(conn):
    from dpi.matching import osm

    full = json.loads((conn.info_dir / "osm_buildings.json").read_text())
    # OSM without Marina Gate 2 and Princess Tower: Gate 2 takes Gate 1's spot (same project, approximate),
    # Princess Tower is found by OpenStreetMap's name search instead, with a developer suffix in the answer.
    partial = {"elements": [e for e in full["elements"] if e["tags"]["name"] not in ("Marina Gate 2", "Princess Tower")]}
    asked = []
    with conn.cursor() as cur:
        cur.execute("update buildings set geom = null, geom_source = null, osm_id = null")

    def lookup(q, bbox):
        asked.append(q)
        s, w, n, e = bbox
        assert s < 25.0887 < n and w < 55.1468 < e
        if q == "Princess Tower":
            return [{"lat": "25.0887", "lon": "55.1468", "name": "Princess Tower by Tameer"},
                    {"lat": "25.0800", "lon": "55.1400", "name": "Princess Plaza"}]
        return []

    rep = osm.place(conn, partial, None, ["392"], lookup)
    assert rep.osm == 2 and rep.nominatim == 1 and rep.project == 1 and rep.unplaced == 0
    assert "Princess Tower" in asked and "Marina Gate 1" not in asked  # only unplaced towers are looked up
    with conn.cursor() as cur:
        cur.execute("select slug, geom_source, round(ST_X(ST_PointOnSurface(geom))::numeric, 4) from buildings "
                    "where slug in ('princess-tower', 'marina-gate-2') order by slug")
        assert cur.fetchall() == [("marina-gate-2", "project", _gate1_x(cur)), ("princess-tower", "osm", Decimal("55.1468"))]

    # With full OSM data the approximate spot is replaced by the exact one.
    rep = osm.place(conn, full, None, None)
    assert rep.osm == 8 and rep.project == 0 and rep.unplaced == 0
    with conn.cursor() as cur:
        cur.execute("select geom_source from buildings where slug = 'marina-gate-2'")
        assert cur.fetchone()[0] == "osm"


def _gate1_x(cur):
    cur.execute("select round(ST_X(ST_PointOnSurface(geom))::numeric, 4) from buildings where slug = 'marina-gate-1'")
    return cur.fetchone()[0]


def test_shared_search_hits_are_approximate_and_far_apart_towers_flagged(conn, tmp_path):
    from dpi.matching import osm

    full = json.loads((conn.info_dir / "osm_buildings.json").read_text())
    partial = {"elements": [e for e in full["elements"] if not e["tags"]["name"].startswith("Marina Gate")]}
    with conn.cursor() as cur:
        cur.execute("update buildings set geom = null, geom_source = null, osm_id = null")

    def lookup(q, bbox):  # the search answers both towers with the same spot: the development, not each tower
        return [{"lat": "25.0869", "lon": "55.1414", "name": q}] if q.startswith("Marina Gate") else []

    rep = osm.place(conn, partial, None, ["392"], lookup)
    assert rep.nominatim == 0 and rep.site == 2 and rep.unplaced == 0
    with conn.cursor() as cur:
        cur.execute("select distinct geom_source from buildings where slug like 'marina-gate-%'")
        assert cur.fetchall() == [("site",)]

    manual = tmp_path / "manual.csv"
    manual.write_text("slug,lat,lng\nmarina-gate-1,25.0866,55.1411\nmarina-gate-2,25.1050,55.1600\n")
    rep = osm.place(conn, full, manual, None)
    assert rep.spread == ["Marina Gate 1, Marina Gate 2"] and "check by hand" in rep.render()
    with conn.cursor() as cur:  # put the synthetic towers back where the other tests expect them
        cur.execute("update buildings set geom = null, geom_source = null where geom_source = 'manual'")
    osm.place(conn, full, None, None)
