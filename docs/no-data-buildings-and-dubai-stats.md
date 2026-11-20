# Buildings with no data, and the Dubai-wide statistics files (2026-11-20)

## Where a building was a dead end on the map
- Priced buildings (rows in `buildings` with a position and confidence >= 0.5) were already clickable, even with 0 sales.
- The grey buildings (OpenStreetMap outlines in the OpenFreeMap tiles, `base-3d` layer) only lifted on hover; a click did nothing.
- Hosted DB, 2026-11-20 (Supabase query): 4,913 buildings, 1,553 with a position (osm 1,082, project 222, manual 106, site 93, search 50), 3,360 with none. The unplaced hold 254,754 of the 440,585 sales on record. Those have pages (search, community lists) but no dot; no position is invented for them. The hosted DB holds 106 `manual` positions, which matches `db/seeds/manual_positions.csv` (107 lines with header). PR 107 deleted the other 3,282 rows from PR 106's sheet because they were auto-generated points jittered around community centres, not real tower positions; nothing was lost by a wrong DATABASE_URL.

## What changed
Clicking a grey building opens a small "no data yet" card: community (point-in-polygon on Dubai Municipality boundaries via `/api/place`), position, OSM height when the tile has one, a plain statement that no sales or rent records are linked, and a link to the community page. No figures are shown. Arabic first pass added.

## Uploaded statistics files (all Dubai-wide, no building or community key)
- Housing units by type, urban/rural, 2025: Flat 802,274, Villa 175,285, total about 1.0M. Usable as one labelled Dubai-wide line on the home page or community-compare context. Check 2011-2025 series for gaps before charting.
- Buildings under construction by type, monthly 2026 (the two files are identical): Sep 2026 shows 101,668 residential apartments, 8,631 private villas, 12,195 investment villas, 1,378 multi-storey buildings. Useful beside the off-plan page as "Dubai-wide, not per building"; unit of the apartments row is units, others are buildings, so label each.
- Real estate by type of transactions: values carry no category labels per row (only Sales / Mortgages / Other and a sort id), so not safe to show.
- Economic indicators of real estate activities 2007-2024: output, employees, value added in unclear units. Skip.
- Housing units JSON (2023): older version of the housing units file. Skip.
None of these can fill a building's figures.

## Added to /market-context
Housing units (flats, villas 2019-2025) and buildings under construction (Mar and Sep 2026) as Dubai-wide sections with source, date and unit caveats.
