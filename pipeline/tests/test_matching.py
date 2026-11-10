from collections import Counter

from dpi.matching.buildings import (
    Candidate, CrosswalkRow, apply_crosswalk, assign_slugs, canonical_key, collect, confidence, display_name,
    pick_dld_building, slugify, tower_number,
)
from dpi.matching.osm import OsmBuilding, best_match, name_score, name_variants, overpass_query, parse


def test_canonical_key_drops_filler_and_keeps_numbers():
    assert canonical_key("The Torch Tower") == canonical_key("TORCH") == "torch"
    assert canonical_key("Marina Gate 1") != canonical_key("Marina Gate 2")
    assert canonical_key("Al Majara Tower Two") == "al majara 2"
    assert canonical_key("Bay Square Bldg II") == "bay square 2"
    assert canonical_key("Tower") == "tower"  # never empty for a real name
    assert canonical_key("") == canonical_key(None) == canonical_key("N/A") == ""


def test_display_name_and_slug():
    assert display_name(Counter({"PRINCESS TOWER": 9, "Princess Tower": 3})) == "Princess Tower"
    assert display_name(Counter({"Marina Gate 1": 5})) == "Marina Gate 1"
    assert slugify("Burj Vista 1 (Tower A)") == "burj-vista-1-tower-a"


def test_tower_number():
    assert tower_number("marina gate 2") == 2
    assert tower_number("bay square 13") == 13
    assert tower_number("princess") is None


def test_collect_groups_spellings_and_applies_min_sales():
    rows = [
        (1, "Princess Tower", "Princess Tower", 5),
        (1, "PRINCESS TOWER", None, 2),
        (1, "Tiny Villa", None, 1),
        (None, "No Community", None, 50),
    ]
    cands = collect(rows, min_sales=3)
    assert len(cands) == 1
    c = cands[0]
    assert c.key == "princess" and c.sales == 7 and c.projects["Princess Tower"] == 5
    assert {"princess tower", "princess"} <= c.aliases


def test_crosswalk_merges_names_on_a_single_building_plot():
    a, b = Candidate(1, "elite residence", sales=50), Candidate(1, "elite", sales=10)
    a.spellings["Elite Residence"] = 50
    b.spellings["Elite"] = 10
    other = Candidate(1, "marina gate 1", sales=20)
    xw = {"elite residence": CrosswalkRow("100", 1, ["P1"]), "elite": CrosswalkRow("100", 1, ["P1"]),
          "marina gate 1": CrosswalkRow("200", 3, ["A", "B", "C"])}
    out = apply_crosswalk([a, b, other], xw)
    assert len(out) == 2
    head = next(c for c in out if c.land_number == "100")
    assert head.sales == 60 and head.key == "elite residence"
    assert confidence(head, None) == (0.9, "land_number")


def test_tower_picker_on_shared_plot():
    c = Candidate(1, "marina gate 2", land_number="200", buildings_on_plot=3, dld_property_ids=["30", "10", "20"])
    dld = {"10": {"floors": 10}, "20": {"floors": 20}, "30": {"floors": 30}}
    assert pick_dld_building(c, dld) == {"floors": 20}
    assert confidence(c, {"floors": 20}) == (0.75, "land_number_tower")
    c4 = Candidate(1, "marina gate 4", land_number="200", buildings_on_plot=3, dld_property_ids=["10", "20", "30"])
    assert pick_dld_building(c4, dld) is None


def test_slugs_are_unique_and_add_community_on_clash():
    a, b, c = Candidate(1, "x", sales=5), Candidate(2, "x", sales=3), Candidate(1, "y", sales=4)
    a.spellings["Sky Tower"] = 5
    b.spellings["Sky Tower"] = 3
    c.spellings["Burj View"] = 4
    slugs = assign_slugs([a, b, c], {1: "dubai-marina", 2: "business-bay"}, taken={"burj-view"})
    assert slugs[id(a)] == "sky-tower-dubai-marina" and slugs[id(b)] == "sky-tower-business-bay"
    assert slugs[id(c)] == "burj-view-2"


def test_osm_name_score():
    assert name_score("princess", "princess") == 1.0
    assert name_score("marina gate 1", "marina gate 2") == 0.0
    assert name_score("cayan", "cayan infinity") == 0.0  # one word is too loose
    assert name_score("marina gate 1", "emaar marina gate 1") == 0.9
    assert name_score("elite residence", "elite residance") > 0.9


def test_osm_parse_and_match():
    data = {"elements": [
        {"type": "way", "id": 5, "tags": {"building": "yes", "name": "Princess Tower", "building:levels": "101"},
         "geometry": [{"lon": 55.14, "lat": 25.08}, {"lon": 55.141, "lat": 25.08}, {"lon": 55.141, "lat": 25.081},
                      {"lon": 55.14, "lat": 25.08}]},
        {"type": "way", "id": 6, "tags": {"building": "yes"}, "geometry": []},
    ]}
    blds = parse(data)
    assert len(blds) == 1 and blds[0].height_m == round(101 * 3.3, 1) and blds[0].keys == {"princess"}
    ob, score = best_match({"princess"}, blds)
    assert ob is blds[0] and score == 1.0
    assert '"Polygon"' in blds[0].geojson()
    point = OsmBuilding(1, ["X"], [(55.0, 25.0)], None)
    assert '"Point"' in point.geojson()


def test_name_variants_drop_developer_and_tower_part():
    tower, site = name_variants("Serenz by Danube - TOWER A")
    assert tower == {"serenz by danube a", "serenz a"} and site == {"serenz", "serenz by danube"}
    tower, site = name_variants("Bayz 102 By Danube")
    assert tower == {"bayz 102 by danube", "bayz 102"} and site == set()
    tower, site = name_variants("Peninsula Four - Tower 6")
    assert "peninsula 4 6" in tower and site == {"peninsula 4"}
    assert name_variants("Princess Tower") == ({"princess"}, set())
    assert name_variants("") == (set(), set())
    # Tower numbers still never cross: tower 2 is not tower 6.
    assert name_score("peninsula 4 2", "peninsula 4 6") == 0.0


def test_osm_nodes_and_construction_sites():
    assert "nwr[landuse=construction][name]" in overpass_query((25.0, 55.0, 25.1, 55.1))
    blds = parse({"elements": [
        {"type": "node", "id": 7, "lat": 25.05, "lon": 55.2, "tags": {"building": "yes", "name": "Stax by Ellington"}},
        {"type": "way", "id": 7, "tags": {"landuse": "construction", "name": "Binghatti Aquarise"},
         "geometry": [{"lon": 55.1, "lat": 25.1}, {"lon": 55.2, "lat": 25.1}, {"lon": 55.2, "lat": 25.2}, {"lon": 55.1, "lat": 25.1}]},
    ]})
    node, way = blds
    assert node.osm_id != way.osm_id and node.centroid() == (55.2, 25.05) and "stax" in node.keys
    assert best_match({"stax"}, blds) == (node, 1.0)
    assert best_match(name_variants("Binghatti Aquarise - TOWER B")[1], blds)[0] is way


def test_tower_letters_never_cross_and_old_names_merge():
    from dpi.matching.buildings import canonical_key, display_name
    from collections import Counter
    assert name_score("serenz by danube a", "serenz by danube") == 0.0
    assert name_score("serenz by danube a", "serenz by danube b") == 0.0
    assert name_score("bloom a", "bloom a") == 1.0
    assert canonical_key("Old-Serenity Lakes 2") == canonical_key("Serenity Lakes 2") == "serenity lakes 2"
    assert canonical_key("Old Town Island") == "old town island"
    assert canonical_key("Serenity Lakes 5-old") == canonical_key("Serenity Lakes 5 - OLD") == "serenity lakes 5"
    assert canonical_key("Marina Old") == "marina old"  # no dash: part of the name
    assert display_name(Counter({"Serenity Lakes 5-old": 9, "Serenity Lakes 5": 3})) == "Serenity Lakes 5"
    assert display_name(Counter({"Old-serenity Lakes 2": 9, "Serenity Lakes 2": 3})) == "Serenity Lakes 2"
