# Building kind (what a building is)

`dpi classify-buildings` now writes two things for every building: the coarse class (`building_type`: residential,
commercial, mixed, hotel, unknown; see `building-use.md`) and a finer **kind** (`building_kind`) with its source and
confidence. A building with no evidence has no kind and shows nothing: no guessing from names.

Kinds: apartment building, villas and townhouses, hotel apartments, office, retail or shops, warehouse or industrial,
commercial (DLD says commercial but not which), mixed-use, school, hospital, clinic, police station, fire station,
government building, petrol station, mosque.

## Evidence, strongest first
1. `db/seeds/manual_building_types.csv`, optional `building_kind` column. Hand check, high confidence, never overwritten.
2. DLD sale records, plus exact one-tower rent links. The sub-type of each record (Flat, Villa, Town House, Hotel Apartment,
   Office, Shop, Warehouse ...). Needs 3+ records and 80%+ of them. 10+ records = high confidence, 3 to 9 = medium.
3. A place within 40 m: KHDA (schools), DHA Sheryan (hospitals, clinics) or OpenStreetMap (police, petrol station, mosque,
   fire station, government office, hospital, school). Only when DLD sales say nothing, because a tower with a petrol
   station underneath is still a tower. Medium within 15 m of exact coordinates, otherwise low (KHDA/DHA positions marked
   approximate are always low).
4. The OpenStreetMap `building=` tag on the building, low confidence.

The building page shows the kind with a line such as "Source: DLD sale and rent records (124 records, 2026-11-10). High
confidence." The map Filters menu has Homes / Work and shops / Public places groups (`?f=kind:fuel` etc.). English and Arabic.

## Audit of what exists today (local database, 2026-11-24, before this change)
- 4,913 buildings, 2,421 with a map position. Coarse class: residential 4,430, mixed 246, commercial 214, unknown 22, hotel 1.
  Source: DLD 4,889, OSM 2, none 22. Raw OSM `building=` on 967 buildings (apartments 474, residential 176, yes 166, construction 93,
  commercial 33, hotel 14, office 6).
- `transactions.usage` and `sub_type`: **0 of 1,385,240 rows filled**. `rent_contracts.usage`/`sub_type`: 0 of 9,321,897. The
  importer already reads them (`importers/dld.py`), but the loaded data predates migration 0008, so only the coarse
  `property_type` exists (apartment 981,080, villa 188,742, land 111,782, commercial 73,216, building 16,190, townhouse 362).
  So today hotel apartments, offices, shops and warehouses cannot be told apart, and villa sales are not linked to any building.
- `pois` holds schools (KHDA 222, OSM 394), hospitals (DHA 162, OSM 131), clinics, pharmacies, shops, transit. It holds **no**
  police, petrol station, mosque, fire station, government office or hotel places (all dated 2026-11-02).
- `dld_projects` is empty locally (it has no usage column anyway).
- The VPS database was not checked.

## What fills the gaps (steps for the PC session; the VPS is only touched through it)
1. `dpi migrate` (applies 0013).
2. Re-import the sale and rent part files so sub-types are stored: `dpi import-dld --kind sale|rent --source-date ... <file>` for
   each file in `data/raw/`. It upserts on the DLD reference and never touches building links, so it is safe to resume.
3. `dpi load-pois --fetch-osm --source-date YYYY-MM-DD` (needs Overpass access) for police, petrol stations, mosques, fire
   stations, government offices and hotels.
4. `dpi classify-buildings`, then `dpi compute-metrics` if needed; for the VPS, dump/restore or push the `buildings` table
   columns and `pois` the same way earlier data was moved.

## Not used on purpose
Property Finder, Bayut and Google Maps: their terms forbid copying their data and the project rules forbid scraping them.
DLD sub-types, OpenStreetMap, KHDA and DHA cover the same question from open sources.
