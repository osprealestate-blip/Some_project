import os
from pathlib import Path

import pytest

from dpi import villa_clusters as vc

HEADER = "project_slug,project,lng,lat,point_source,plots,records,size_median,type,already_in_app,match_names\n"


def write(tmp_path, body):
    p = tmp_path / "c.csv"
    p.write_text(HEADER + body, encoding="utf-8")
    return p


def test_reads_valid_rows_and_leaves_out_bad_ones(tmp_path):
    p = write(tmp_path, "\n".join([
        "natura,Natura,55.25,25.0,google,333,333,0.0,Villas,False,",
        "maple,Maple,,,,200,210,2400,Townhouses,False,Maple 1|Maple 2",
        "old,Old Tower,55.1,25.1,2gis,5,5,0,Villa,True,",
        "swap,Swapped,25.0,55.25,google,1,1,0,Villa,False,",
        "nosrc,No Source,55.2,25.0,,1,1,0,Villa,False,",
        "half,Half,55.2,,google,1,1,0,Villa,False,",
        "natura,Dupe,55.25,25.0,google,1,1,0,Villa,False,",
    ]))
    rows, problems, skipped = vc.read_rows(p)
    assert [r.slug for r in rows] == ["natura", "maple"]
    assert rows[0].lng == 55.25 and rows[0].geom_source == "google" and rows[0].size is None
    assert rows[1].lng is None and rows[1].geom_source is None and rows[1].kind == "townhouse"
    assert rows[1].match_names == ["Maple", "Maple 1", "Maple 2"] and rows[1].size == 2400
    assert skipped == ["Old Tower: already has building pages"]
    assert len(problems) == 4
    assert any("outside Dubai" in x for x in problems) and any("point_source" in x for x in problems)


def test_kind_of():
    assert vc.kind_of("Villas") == "villa"
    assert vc.kind_of("Townhouses") == "townhouse"
    assert vc.kind_of("Villas and Town houses") == "mixed"
    assert vc.kind_of("") == "villa"


URL = os.environ.get("TEST_DATABASE_URL")


@pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")
def test_dry_run_and_apply_on_a_real_database(tmp_path):
    import psycopg

    root = Path(__file__).resolve().parents[2]
    conn = psycopg.connect(URL)
    with conn.cursor() as cur:
        cur.execute("drop schema public cascade; create schema public")
        for f in sorted((root / "db" / "migrations").glob("*.sql")):
            cur.execute(f.read_text(encoding="utf-8"))
        cur.execute("insert into communities (dm_code, name_official, geom) values ('999', 'Test Area', "
                    "ST_Multi(ST_MakeEnvelope(55.0, 25.0, 55.5, 25.5, 4326)))")
        rows = []
        for i in range(5):  # five counted villa sales, one apartment sale, one excluded sale, one old sale
            rows.append(("s%d" % i, "2026-10-%02d" % (i + 1), 3_000_000 + i * 100_000, 3000.0, 1000 + i * 10, 3, "villa", None, "Natura"))
        rows.append(("a1", "2026-10-05", 900_000, 800.0, 1100, 1, "apartment", None, "Natura"))
        rows.append(("x1", "2026-10-06", 9_000_000, 3000.0, 3000, 3, "villa", "outlier", "Natura"))
        rows.append(("o1", "2024-01-06", 2_000_000, 2000.0, 1000, 3, "villa", None, "NATURA!"))
        rows.append(("m1", "2026-10-07", 1_000_000, 500.0, 2000, 4, "townhouse", None, "Maple Towns"))
        for ref, d, price, psf, size, rooms, ptype, excl, proj in rows:
            cur.execute("insert into transactions (source, source_ref, source_date, txn_date, price, size_sqft, price_psf, rooms, "
                        "property_type, excluded, raw_project) values ('dld', %s, '2026-11-01', %s, %s, %s, %s, %s, %s, %s, %s)",
                        (ref, d, price, size, price / size, rooms, ptype, excl, proj))
        for i in range(4):
            cur.execute("insert into rent_contracts (source, source_ref, source_date, start_date, annual_rent, rooms, raw_project, sub_type) "
                        "values ('dld', %s, '2026-11-01', '2026-09-01', %s, 3, 'Natura', %s)", ("r%d" % i, 200_000 + i * 10_000, "Villa" if i else None))
        cur.execute("insert into rent_contracts (source, source_ref, source_date, start_date, annual_rent, rooms, raw_project, sub_type) "
                    "values ('dld', 'rf', '2026-11-01', '2026-09-01', 50000, 1, 'Natura', 'Flat')")
    conn.commit()
    p = write(tmp_path, "\n".join([
        "natura,Natura,55.25,25.25,google,333,333,0.0,Villas,False,",
        "maple,Maple Towns,,,,200,210,2400,Townhouses,False,",
        "ghost,Ghost Villas,55.3,25.3,2gis,10,10,0,Villa,False,",
    ]))
    rep = vc.run(conn, p, apply=False)
    assert rep.rows == 3 and rep.with_point == 2 and rep.without_point == 1 and rep.matched_projects == 3
    assert rep.sales_matched == 6 and rep.rents_matched == 4 and "Ghost Villas" in rep.unmatched
    with conn.cursor() as cur:
        cur.execute("select count(*) from villa_clusters")
        assert cur.fetchone()[0] == 0  # dry run wrote nothing
    rep = vc.run(conn, p, apply=True)
    assert rep.no_community == 0
    with conn.cursor() as cur:
        cur.execute("select v.slug, c.dm_code, v.is_cluster_point, v.geom_source from villa_clusters v left join communities c on c.id = v.community_id order by v.slug")
        assert cur.fetchall() == [("ghost", "999", True, "2gis"), ("maple", None, True, None), ("natura", "999", True, "google")]
        cur.execute("select rooms, sale_count_12m, sale_median_price_12m, sale_count_all, rent_count_12m, rent_median_12m "
                    "from villa_cluster_summary s join villa_clusters v on v.id = s.cluster_id where v.slug = 'natura' order by rooms")
        got = cur.fetchall()
        assert got[0][:2] == (-1, 5) and got[0][2] == 3_200_000 and got[0][3] == 6 and got[0][4:] == (4, 215_000)
        assert got[1][0] == 3
        cur.execute("select sale_count_12m, sale_median_psf_12m from villa_cluster_summary s join villa_clusters v on v.id = s.cluster_id "
                    "where v.slug = 'maple' and rooms = -1")
        assert cur.fetchone() == (1, None)  # fewer than 3 sales: no median
    # a second run with no point keeps the point already stored, and does not duplicate anything
    p2 = write(tmp_path, "natura,Natura,,,,333,333,0,Villas,False,")
    vc.run(conn, p2, apply=True)
    with conn.cursor() as cur:
        cur.execute("select count(*), count(geom) from villa_clusters where slug = 'natura'")
        assert cur.fetchone() == (1, 1)
        cur.execute("select count(*) from villa_cluster_summary s join villa_clusters v on v.id = s.cluster_id where v.slug = 'natura' and rooms = -1")
        assert cur.fetchone()[0] == 1
    conn.close()
