import os
from pathlib import Path

import pytest

from dpi import greenlist_towers as gt
from dpi import villa_clusters as vc

URL = os.environ.get("TEST_DATABASE_URL")


def test_dm_list():
    assert vc.dm_list("") is None
    assert vc.dm_list("-") == []
    assert vc.dm_list("631|0") == ["631", "0"]


@pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")
def test_unplaced_towers_and_clusters_on_a_real_database(tmp_path):
    import psycopg

    root = Path(__file__).resolve().parents[2]
    conn = psycopg.connect(URL)
    with conn.cursor() as cur:
        cur.execute("drop schema public cascade; create schema public")
        for f in sorted((root / "db" / "migrations").glob("*.sql")):
            cur.execute(f.read_text(encoding="utf-8"))
        cur.execute("insert into communities (dm_code, name_official) values ('999', 'Test Area'), ('998', 'Other Area')")
        cur.execute("select id from communities order by dm_code desc")
        area, other = [r[0] for r in cur.fetchall()]
        cur.execute("insert into buildings (slug, name_en, name_key, community_id, match_confidence) "
                    "values ('old-one', 'Old One Tower', 'old 1', %s, 0.9)", (area,))
        sales = [("t1", area, "Test Area", "New Heights", None), ("t2", other, "Other Area", "New Heights", None),
                 ("t3", None, "Madinat Hind 4", "ELO 2", None), ("t4", None, "Elsewhere", "ELO 2", None),
                 ("v1", area, "Test Area", None, "Club Villas"), ("v2", other, "Other Area", None, "Club Villas")]
        for ref, cid, raw_area, building, project in sales:
            cur.execute("insert into transactions (source, source_ref, source_date, txn_date, price, size_sqft, price_psf, rooms, "
                        "property_type, community_id, raw_area, raw_building, raw_project) values "
                        "('dld', %s, '2026-11-01', '2026-10-01', 1000000, 1000, 1000, 2, %s, %s, %s, %s, %s)",
                        (ref, "villa" if project else "apartment", cid, raw_area, building, project))
    conn.commit()
    towers = tmp_path / "t.csv"
    towers.write_text("name,dm_code,master_community,land_number,sale_areas\n"
                      "New Heights,999,Test Town,12,\n"
                      "ELO 2,,DAMAC Hills 2,,Madinat Hind 4\n"
                      "Old One,999,,,\n"
                      "Nowhere,,,,\n", encoding="utf-8")
    rep = gt.run(conn, towers)
    assert (rep.added, rep.sales_linked, rep.no_area, len(rep.skipped), len(rep.problems)) == (2, 2, 1, 1, 1)
    with conn.cursor() as cur:
        cur.execute("select count(*) from buildings")
        assert cur.fetchone()[0] == 1  # dry run wrote nothing
    gt.run(conn, towers, apply=True)
    assert gt.run(conn, towers, apply=True).added == 0  # a second run adds nothing
    with conn.cursor() as cur:
        cur.execute("select t.source_ref, b.slug from transactions t join buildings b on b.id = t.building_id order by 1")
        assert cur.fetchall() == [("t1", "new-heights"), ("t3", "elo-2")]
        cur.execute("update transactions set building_id = null")
        gt.relink(cur)
        cur.execute("select count(*) from transactions where building_id is not null")
        assert cur.fetchone()[0] == 2
    conn.commit()
    clusters = tmp_path / "c.csv"
    clusters.write_text("project_slug,project,dm_code,master_community,match_dm_codes,plots,records\n"
                        "club-villas,Club Villas,999,Test Town,999,4,9\n", encoding="utf-8")
    rep = vc.run(conn, clusters, apply=True)
    assert rep.without_point == 1 and rep.sales_matched == 1  # the other community's sale is not taken
    with conn.cursor() as cur:
        cur.execute("select master_community, community_id from villa_clusters")
        assert cur.fetchall() == [("Test Town", area)]
    conn.close()
