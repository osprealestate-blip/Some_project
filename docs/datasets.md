# Datasets

Column names, row counts and join checks below come from the files the owner supplied on 4 Nov 2026
(Dubai Pulse downloads in `io2`, plus the "Special 2025" workbooks). Raw files are never committed.
Sample values are left out of this document on purpose.

## Summary (T1.1 findings)

- **Floors are available.** The Units file has `floor`, `unit_number`, `actual_area`, `rooms_en` and a parent
  building for every unit. Floor is filled for 98% of units in Dubai Marina, 100% in JVC and 97% in Business Bay,
  so the floor-band view is possible.
- **Sales link to units through the project.** Sales have `project_number`, which matches `projects.project_number`
  and then `units.project_id`. This works for 65% of Marina sales, 93% of JVC and 92% of Business Bay. Sales
  have no unit id and no land number, so the rest must be matched by building name.
- **Building names are always there for sales in the launch areas** (`building_name_en`: 100% Marina,
  93% JVC, 100% Business Bay), but names are messy (257 distinct in Marina sales vs 455 rows in the buildings table).
- **Rent contracts have no building name.** Only `project_name_en` and `master_project_en`, so rents can be shown
  per project, not per tower, unless a project is a single tower.
- **No file has coordinates for buildings or plots.** Buildings, Land Registry and Units carry `land_number` and
  `parcel_id` but no latitude, longitude or polygon. Putting buildings on the map still needs a footprint source
  (OpenStreetMap by name, or a Dubai Municipality dataset; Dubai Pulse lists a `dsc_buildings` dataset, not yet checked).
  This is the main risk for the matching test (T1.4).
- **Service charge index and GTFS are not in the folder.** Still open.

## Files received (io2)

| File | Rows | Use | Notes |
| --- | --- | --- | --- |
| `transactions_2026-11-02_17-44-57_000{1,2}.csv` | 1,811,462 | Sales, mortgages, gifts | Newest export. Dates 1966 to 30 Oct 2026. `transaction_id` unique. 1,385,240 are sales. Older exports of 19 and 23 Oct are superseded. |
| `rent_contracts_2026-10-19_17-59-02_00{01..10}.csv` | about 9.7 million | Ejari rent contracts | Ten parts. Start dates run from 2001 to the year 2204, so bad dates must be cleaned. |
| `rent_contracts_2026-11-02_17-58-09_000{1,2}.csv` | 1,940,578 | Newer rent export | Only 2 parts and each part spans all years, so this looks like a partial download. Confirm before using. |
| `units_2026-11-02_18-43-39_000{1,2,3}.csv` | 2,385,379 | Floors, unit numbers, sizes | `property_id` unique. |
| `buildings_2026-11-02_17-41-49_0001.csv` | 259,061 | Building facts | `floors` filled for 85%, `built_up_area` 92%, `car_parks` 90%; `elevators` and `flats` under 3%. |
| `land_registry_2026-10-19_17-45-39_0001.csv` | about 265,000 | Plots | Has `land_number`, `parcel_id`, `is_free_hold`. No geometry. |
| `projects_2026-07-06_16-25-21_0001.csv` | 3,039 | Developers, status, completion | Older than the others (6 Jul). `percent_completed` 99.8% filled, `completion_date` 61%. Statuses: 1,469 finished, 865 active, 459 not started, 232 pending. |
| `school_search_2026-10-25_*.csv` | n/a | KHDA schools | Has lat/long, curriculum, rating, student count. |
| `sheryan_facility_detail_2026-02-01_*.csv` | n/a | Health facilities | Has `xcoordinate` and `ycoordinate` (coordinate system to confirm). |
| `residential_sale_index_*.csv` | n/a | Price index | Same data as the file in osp-crm. |
| `bus_routes_*.csv` | n/a | Bus stops | Names and numbers only, no coordinates. |
| `offices_*.csv/.xlsx` | n/a | Real estate offices | Agent verification (Phase 2). |
| `Economic_Indicators_*.xlsx`, `Total_Stock_of_FDI_*.xlsx`, `Real_Estate_Transactions_-_Emirate_of_Dubai_*.csv`, `workforce_*`, `household_expenditure_*` | n/a | Market context | Background and charts only. |
| `adinteract-*.csv` | n/a | Sales by project (date, community, layout, area, price) | Looks like an export from a third-party tool. Check where it came from and its terms before any public use. |

Duplicates to ignore: files ending `(1)`, `(2)`, `(3)` are byte-identical copies of the matching file (checked for
transactions, buildings and schools).

## Files not to use

These contain personal data or are outside the plan (section 5.7): `sheryan_professional_detail_*` (named health
professionals), `mrhe_land_grants_*` (birth dates), the divorce statistics workbooks, `valuator_licensing_*` (named
people), `session_agendas_*` and the court case counts, `map_requests_*` (not useful for the app).
`pms_pav_cariageway_centerlines_*.kml` is a road centreline file and may help routing later.

## Special 2025 workbooks (the Green List)

About 80 Excel files, one per community, each with a "Before April" sheet and an "April to Dec" sheet (or a single
sheet in the 2024 files). Columns include building name, project, master project, unit number, size, property type,
beds, transaction amount, municipality and land numbers, **and also** owner name, phone numbers, passport and
Emirates ID numbers, birth dates and nationality.

- Only the market columns may ever be used: date, price, size, beds, project, building, unit number.
- The personal columns must never leave internal use. Nothing was copied out of these files; only column names were read.
- Unit number plus building plus size here can fill gaps in the public Units file, but the Units file already has
  floor and unit number for most units, so these files are optional for the app.

## Linking keys

| From | To | Key | Match rate (Marina / JVC / Business Bay) |
| --- | --- | --- | --- |
| Sale | Project | `project_number` to `projects.project_number` | 65% / 93% / 92% of sales have a number; 98 to 100% of those are found |
| Project | Units | `projects.project_id` to `units.project_id` | 62% / 83% / 81% of units have a project |
| Unit | Building | `units.parent_property_id` to `buildings.property_id` | 98% / 100% / 95% |
| Building, Unit | Plot | `land_number` | 100% of units and buildings |
| Sale | Building | `building_name_en`, then fuzzy name match | names always present, spelling varies |
| Sale | Plot | `building_name_en` → Green List `BuildingNameEn` → `LandNumber` | 97% / 86% / 89% of sales (see `docs/matching-test.md`) |

The buildings file has no building name column, so the Green List name-to-land link is the main bridge.

## Still open

- Is there a downloadable service charge index, and an RTA GTFS feed?
- Source of building footprints or coordinates (see summary).
- Which rent export is complete (19 Oct or 2 Nov).
- Licence wording on Dubai Pulse: the Land Registry page says `notspecified`; confirm before launch.
- Coordinate system of the Sheryan `xcoordinate` and `ycoordinate`.

## Bundled files

### `web/public/data/dubai_communities.geojson`
234 community polygons copied from osp-crm (2026-10-26 fetch): 226 Dubai Municipality statistical
communities (`code` = community number) and 8 master-community outlines from OpenStreetMap (ODbL).
Confirm the Dubai Municipality licence on the official download page before launch.
