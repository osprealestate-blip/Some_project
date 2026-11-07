from datetime import date
from pathlib import Path

from dpi.importers.dld import DldFileError, Report, map_headers, parse_rooms, parse_rows, upsert_sql
from dpi.names import CommunityRef, CommunityResolver

FIX = Path(__file__).parent / "fixtures"
TODAY = date(2026, 11, 4)


def resolver():
    return CommunityResolver([
        CommunityRef(1, "Marsa Dubai", "Dubai Marina"),
        CommunityRef(2, "Business Bay", "Business Bay"),
        CommunityRef(3, "Al Barsha South Fourth", "Jumeirah Village Circle (JVC)"),
    ])


def load(name, kind):
    rep = Report()
    with open(FIX / name, encoding="utf-8") as fh:
        rows = list(parse_rows(fh, kind, resolver(), date(2026, 11, 2), rep, today=TODAY))
    return rows, rep


def test_sales_rules():
    rows, rep = load("sales_sample.csv", "sale")
    by_ref = {r["source_ref"]: r for r in rows}
    assert set(by_ref) == {"T1", "T2", "T4", "T5"}  # mortgage skipped, bad date skipped
    assert rep.skipped == {"not_a_sale": 1, "missing_values": 1}
    t1 = by_ref["T1"]
    assert t1["community_id"] == 1 and t1["rooms"] == 2 and t1["excluded"] is None
    assert t1["size_sqft"] == round(100 * 10.7639, 1) and t1["off_plan"] is False
    assert t1["raw_building"] == "Marina Gate 1" and t1["property_type"] == "apartment"
    assert by_ref["T2"]["off_plan"] is True and by_ref["T2"]["rooms"] == 0
    assert by_ref["T4"]["excluded"] == "too_small"
    assert by_ref["T5"]["excluded"] == "price_too_low" and by_ref["T5"]["community_id"] is None


def test_no_personal_fields_in_output():
    rows, _ = load("sales_sample.csv", "sale")
    rent_rows, _ = load("rent_sample.csv", "rent")
    for r in rows + rent_rows:
        assert not {"buyer", "seller", "tenant_name", "tenant", "owner"} & set(r)
        assert "Buyer A" not in str(r) and "Tenant A" not in str(r)


def test_rent_rules():
    rows, _ = load("rent_sample.csv", "rent")
    by_ref = {r["source_ref"]: r for r in rows}
    assert len(rows) == 4
    assert by_ref["C1:1"]["community_id"] == 3 and by_ref["C1:1"]["rooms"] == 1 and by_ref["C1:1"]["is_new"] is True
    assert by_ref["C2:1"]["excluded"] == "future_date" and by_ref["C2:1"]["is_new"] is False
    assert by_ref["C3:1"]["excluded"] == "multi_unit"
    assert by_ref["C4:1"]["excluded"] == "price_too_low"
    assert by_ref["C1:1"]["raw_project"] == "Some JVC Tower"


def test_header_errors_and_helpers():
    try:
        map_headers(["foo", "bar"], "sale")
        assert False
    except DldFileError as e:
        assert "missing" in str(e)
    assert parse_rooms("Studio") == 0 and parse_rooms("3 B/R") == 3 and parse_rooms("Office") is None
    assert "on conflict (source, source_ref) do update" in upsert_sql("rent")


class _FakeCursor:
    def __init__(self, raw_areas):
        self.raw_areas, self.updates, self.rowcount = raw_areas, [], 0

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def execute(self, sql, params=None):
        if sql.startswith("select"):
            self.table = sql.split(" from ")[1].split()[0]
        else:
            self.updates.append((self.table, params))
            self.rowcount = 10

    def fetchall(self):
        return [(a,) for a in self.raw_areas]


class _FakeConn:
    def __init__(self, raw_areas):
        self.cur = _FakeCursor(raw_areas)

    def cursor(self):
        return self.cur

    def commit(self):
        pass


def test_rematch_updates_only_resolvable_areas():
    from dpi.importers.dld import rematch_communities

    conn = _FakeConn(["MARSA DUBAI", "Nowhere"])
    assert rematch_communities(conn, resolver()) == {"transactions": 10, "rent_contracts": 10}
    assert conn.cur.updates == [("transactions", (1, "MARSA DUBAI")), ("rent_contracts", (1, "MARSA DUBAI"))]
