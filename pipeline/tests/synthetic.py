"""Synthetic DLD-shaped files for the integration test and local UI checks. Every value is made up.

Run `python tests/synthetic.py <out_dir>` to write sales.csv, rents.csv and osm_buildings.json.
"""
from __future__ import annotations

import csv
import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

# (area, project, building name spellings, base AED/sqft, lng, lat)
BUILDINGS = [
    ("Marsa Dubai", "Princess Tower", ["Princess Tower", "PRINCESS TOWER"], 1650, 55.1468, 25.0887),
    ("Marsa Dubai", "Marina Gate", ["Marina Gate 1"], 2300, 55.1411, 25.0866),
    ("Marsa Dubai", "Marina Gate", ["Marina Gate 2"], 2250, 55.1418, 25.0872),
    ("Marsa Dubai", "Torch", ["The Torch", "Torch Tower"], 1350, 55.1475, 25.0880),
    ("Al Barsha South Fourth", "Bloom Towers", ["Bloom Towers A"], 1150, 55.2071, 25.0590),
    ("Al Barsha South Fourth", "Binghatti Gems", ["Binghatti Gems"], 1050, 55.2120, 25.0620),
    ("Business Bay", "Executive Towers", ["Executive Tower B"], 1700, 55.2668, 25.1858),
    ("Business Bay", "Bay Square", ["Bay Square Building 13", "Bay Square Bldg 13"], 1500, 55.2805, 25.1858),
]
ROOMS = [("Studio", 0, 40), ("1 B/R", 1, 70), ("2 B/R", 2, 115), ("3 B/R", 3, 165)]
RENT_ROOMS = {0: "Studio", 1: "1bed room+Hall", 2: "2 bed rooms+hall", 3: "3 bed rooms+hall"}


def write(out: Path, end: date = date(2026, 10, 30), seed: int = 7) -> None:
    rnd = random.Random(seed)
    out.mkdir(parents=True, exist_ok=True)
    with open(out / "sales.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["transaction_id", "instance_date", "trans_group_en", "procedure_name_en", "reg_type_en",
                    "property_usage_en", "area_name_en", "property_type_en", "property_sub_type_en", "procedure_area",
                    "actual_worth", "rooms_en", "master_project_en", "project_name_en", "building_name_en"])
        n = 0
        for area, project, names, psf, *_ in BUILDINGS:
            for i in range(140):
                days = rnd.randint(0, 3 * 365)
                when = end - timedelta(days=days)
                growth = 1 + 0.12 * (1 - days / (3 * 365))  # newer sales a bit dearer
                label, _, sqm = rnd.choice(ROOMS)
                size = sqm * rnd.uniform(0.9, 1.15)
                price = round(size * 10.7639 * psf * growth * rnd.uniform(0.88, 1.12), -3)
                n += 1
                w.writerow([f"S{n}", when.isoformat(), "Sales", "Sell", "Existing Properties", "Residential", area,
                            "Unit", "Flat", round(size, 2), price, label, "", project, names[i % len(names)]])
    with open(out / "rents.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["contract_id", "line_number", "contract_start_date", "contract_end_date", "contract_reg_type_en",
                    "property_usage_en", "area_name_en", "ejari_property_sub_type_en", "actual_area",
                    "annual_amount", "no_of_prop", "master_project_en", "project_name_en"])
        n = 0
        for area, project, _, psf, *_ in BUILDINGS:
            for _ in range(80):
                start = end - timedelta(days=rnd.randint(0, 2 * 365))
                _, rooms, sqm = rnd.choice(ROOMS)
                rent = round(sqm * 10.7639 * psf * 0.065 * rnd.uniform(0.9, 1.1), -2)
                n += 1
                w.writerow([f"R{n}", 1, start.isoformat(), (start + timedelta(days=364)).isoformat(),
                            rnd.choice(["New", "Renew"]), "Residential", area, RENT_ROOMS[rooms], sqm, rent, 1, "", project])
    elements = []
    for i, (_, _, names, _, lng, lat) in enumerate(BUILDINGS):
        d = 0.0004
        ring = [(lng - d, lat - d), (lng + d, lat - d), (lng + d, lat + d), (lng - d, lat + d), (lng - d, lat - d)]
        elements.append({"type": "way", "id": 1000 + i, "tags": {"building": "yes", "name": names[0], "building:levels": "40"},
                         "geometry": [{"lon": x, "lat": y} for x, y in ring]})
    (out / "osm_buildings.json").write_text(json.dumps({"elements": elements}), encoding="utf-8")
    pois = [
        {"type": "node", "id": 1, "lat": 25.0870, "lon": 55.1440, "tags": {"railway": "station", "station": "subway", "name": "Marina Metro (made up)"}},
        {"type": "node", "id": 2, "lat": 25.0880, "lon": 55.1450, "tags": {"shop": "supermarket", "name": "Test Market"}},
        {"type": "node", "id": 3, "lat": 25.0860, "lon": 55.1430, "tags": {"leisure": "park", "name": "Test Park"}},
        {"type": "node", "id": 4, "lat": 25.0890, "lon": 55.1460, "tags": {"amenity": "pharmacy", "name": "Test Pharmacy"}},
        {"type": "node", "id": 5, "lat": 25.0875, "lon": 55.1470, "tags": {"amenity": "clinic", "name": "Test Clinic"}},
        {"type": "node", "id": 6, "lat": 25.0850, "lon": 55.1420, "tags": {"amenity": "school", "name": "Test School"}},
        {"type": "node", "id": 7, "lat": 25.0865, "lon": 55.1445, "tags": {"natural": "beach", "name": "Test Beach"}},
        {"type": "node", "id": 8, "lat": 25.1860, "lon": 55.2670, "tags": {"railway": "station", "station": "subway", "name": "Bay Metro (made up)"}},
    ]
    (out / "osm_pois.json").write_text(json.dumps({"elements": pois}), encoding="utf-8")


if __name__ == "__main__":
    write(Path(sys.argv[1]))
