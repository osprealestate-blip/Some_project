from dpi.load.pois import read_khda, read_osm, read_sheryan, to_lnglat


def test_coordinates_in_any_common_form():
    assert to_lnglat(55.14, 25.08) == (55.14, 25.08)
    assert to_lnglat(25.08, 55.14) == (55.14, 25.08)  # swapped columns
    assert to_lnglat(0, 0) is None and to_lnglat(None, 25.0) is None
    # 55.14 E, 25.08 N projected with pyproj: EPSG:32640 (UTM 40N) and EPSG:3997 (Dubai Local TM)
    lng, lat = to_lnglat(312_408.396, 2_775_097.069)
    assert abs(lng - 55.14) < 1e-6 and abs(lat - 25.08) < 1e-6
    lng, lat = to_lnglat(480_495.615, 2_774_929.996)
    assert abs(lng - 55.14) < 1e-6 and abs(lat - 25.08) < 1e-6


def test_read_khda(tmp_path):
    p = tmp_path / "schools.csv"
    p.write_text("School_Name,Curriculum,Overall_Rating,Latitude,Longitude,Principal Phone\n"
                 "Marina School,British,Good,25.08,55.14,+971500000000\n"
                 "No Coords,UK,,,\n", encoding="utf-8")
    rows = read_khda(p)
    assert len(rows) == 1
    s = rows[0]
    assert s.category == "school" and s.attributes == {"curriculum": "British", "rating": "Good"}
    assert "phone" not in str(s.attributes).lower()


def test_read_sheryan(tmp_path):
    p = tmp_path / "facilities.csv"
    p.write_text("facility_name_en,facility_category_en,xcoordinate,ycoordinate\n"
                 "Marina Clinic,Clinic,55.14,25.08\nBay Pharmacy,Pharmacy,55.27,25.18\n", encoding="utf-8")
    rows = read_sheryan(p)
    assert [(r.category, r.subcategory) for r in rows] == [("health", "clinic"), ("daily_needs", "pharmacy")]


def test_read_osm():
    data = {"elements": [
        {"type": "node", "id": 1, "lat": 25.08, "lon": 55.14, "tags": {"railway": "station", "station": "subway", "name": "DMCC"}},
        {"type": "node", "id": 2, "lat": 25.08, "lon": 55.14, "tags": {"railway": "station", "name": "Freight Yard"}},
        {"type": "way", "id": 3, "center": {"lat": 25.07, "lon": 55.13}, "tags": {"leisure": "park"}},
        {"type": "node", "id": 4, "lat": 25.07, "lon": 55.13, "tags": {"amenity": "cafe"}},
        {"type": "node", "id": 5, "lat": 25.07, "lon": 55.13, "tags": {"shop": "supermarket", "name": "Spinneys"}},
    ]}
    rows = read_osm(data)
    assert [(r.subcategory, r.name) for r in rows] == [("metro", "DMCC"), ("park", "Park"), ("supermarket", "Spinneys")]
