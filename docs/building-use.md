# Commercial vs residential buildings

## How a building gets its class
`dpi classify-buildings` writes `buildings.building_type`: residential, commercial, mixed, hotel or unknown.
Unknown is shown as nothing in the app. A name is never used to guess.

Evidence, strongest first:
1. DLD sales linked to the building. Each row has a sub-type (Flat, Office, Shop, Hotel Apartment ...) and a usage.
   Migration 0008 stores both; until sales are re-imported only the coarse `property_type` is there (apartment vs commercial).
2. DLD rent contracts linked through a one-tower project (exact links only; size estimates are skipped as they come from apartment sales).
3. OpenStreetMap `building=` tag, only when DLD has fewer than 3 usable records.
4. `db/seeds/manual_building_types.csv` (hand check; always wins).

Rules: at least 3 records; one class with 90%+ of records wins; residential and commercial each 10%+ (smaller side 2+ records) = mixed; otherwise unknown.

## Test on the hosted copy (3 launch areas, 2026-11-16, property type only)
865 buildings: residential 755 (87%), commercial 63 (7%), mixed 30 (3%), unknown 17 (2%). 98% classified.
This is before the re-import; hotel apartments are still counted as residential until sub-types are stored.

## App
Filter "Building use" (Residential, Commercial, Mixed-use) in the map Filters menu; a small label on building pages;
commercial and mixed pages say price and rent figures cover residential units only (they do: sales use apartments, rents need bedrooms).

## 2GIS (not used; nothing scraped)
From 2GIS docs (docs.2gis.com): an official Places API exists (demo key for one month, then paid subscription priced per successful
request; extra fields on request for an extra cost). Buildings are searchable, with floors and year built as on-demand fields, but the
docs list no residential/commercial field in the API (the 2GIS Pro desktop product has a "Purpose: building type" filter; export unclear).
UAE/Dubai coverage, price and storage/redistribution rights are not stated on those pages; the Services Use Agreement (law.2gis.com) was not read.
Scraping is not mentioned, and project rules forbid it. Recommendation: do not use 2GIS now. DLD already classifies ~98% of the launch
buildings. If more is needed, email 2GIS to ask about Dubai coverage, price and whether results can be stored and shown.
Cheaper next step: load the DLD Units file (sub-type per unit) for the remaining unknowns.
