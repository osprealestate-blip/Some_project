from dpi.importers import service_charges as sc


def row(aid, name, year, cat, cost, usage="Residential", project="UNSPECIFIED PROJECT"):
    return {"property_group_id": aid, "property_group_name_en": name, "project_name": project,
            "master_community_name_en": "Dubai Marina", "usage_name_en": usage, "budget_year": str(year),
            "service_cost": str(cost), "service_category_name_en": cat, "management_company_name_en": "X"}


CATS = ["Services", "Maintenance", "Management Services", "Utilities Services", "Insurance", "Reserved Fund"]


def tower(aid, name, year=2026, each=3.0, extra=()):
    return [row(aid, name, year, c, each) for c in CATS] + list(extra)


def test_parking_is_left_out_and_ac_kept_apart():
    rows = tower("1", "Marina Pinnacle") + [row("1", "Marina Pinnacle", 2026, "Parking", 1260),
                                            row("1", "Marina Pinnacle", 2026, "Unit A/C (Charges)", 4.5),
                                            row("1", "Marina Pinnacle", 2026, "Income", -2)]
    a = sc.aggregate(rows)["1"]
    assert a.total == 18.0 and a.ac == 4.5 and a.complete


def test_non_residential_old_and_thin_rows():
    rows = tower("1", "A", 2026) + tower("1", "A", 2024, 9) + [row("2", "Shop", 2026, "Services", 5, usage="Retail")]
    rows += [row("3", "Thin", 2026, "Improvement", 0.2)]
    out = sc.aggregate(rows)
    assert set(out) == {"1", "3"} and out["1"].year == 2026 and not out["3"].complete


def test_implausible_total_is_not_complete():
    assert not sc.aggregate(tower("1", "Hotel", each=20))["1"].complete


def test_exact_unique_match_links_and_similar_goes_to_review():
    assocs = sc.aggregate(tower("1", "Cayan Tower") + tower("2", "Silverene B") + tower("3", "Elite Residences 6"))
    bs = [sc.Building(10, "Cayan", "cayan", "Marina"), sc.Building(11, "Silverene", "silverene", "Marina"),
          sc.Building(12, "Nowhere", "nowhere", "Marina")]
    res = sc.match(bs, assocs)
    assert [(b.id, a.assoc_id) for b, a in res.auto] == [(10, "1")]
    assert [(r["building_id"], r["assoc_id"]) for r in res.review] == [(11, "2")]
    assert res.unmatched == 1


def test_same_name_twice_is_never_auto_linked():
    assocs = sc.aggregate(tower("1", "Silver") + tower("2", "Silver"))
    res = sc.match([sc.Building(1, "Silver", "silver", "JLT")], assocs)
    assert res.auto == [] and len(res.review) == 2
