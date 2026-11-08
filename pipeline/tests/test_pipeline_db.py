"""End-to-end pipeline run on a real PostGIS database with synthetic files.

Skipped unless TEST_DATABASE_URL points at an empty, throwaway database (CI sets it). The test drops and
recreates the public schema, so never point it at a database with real data.
"""
import json
import os
from datetime import date
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
    # Each tower has its own flat sizes, so Marina Gate rents are placed by size (estimated) in the right tower.
    assert rep.rents_project == 8 * 80 and rep.rents_estimated == 2 * 80 and rep.rents_linked == 8 * 80
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
