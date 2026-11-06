# T1.4 Matching test: part A (sale names to DLD buildings)

Run on 6 Nov 2026 with `pipeline/src/dpi/spikes/greenlist_crosswalk.py`, the 2 Nov DLD export (`io2`) and the
98 Green List workbooks ("Special 2025" folder: 2024 and 2025 files). Only the market columns `BuildingNameEn`,
`Building 1`, `BuildingName 2` and `LandNumber` were read; no personal column was loaded. Outputs
(crosswalk, per-area summary, top unmatched) were written outside the repo.

## Why the Green List is needed

The DLD buildings file has **no building name**. It has `land_number`, `building_number` and project. Sales have
a building name but no land number. The Green List rows carry both name and land number, so they bridge the two:

sale `building_name_en` → Green List `LandNumber` → DLD `buildings` rows on that plot (same area) → units, floors.

For each name, the most frequent Green List land number that is a real DLD plot in the sale's area is used.
Within the launch areas, the median name maps to a single land number in 100% of its Green List rows.

## Results

Share of sales (all years, sales with a building name) linked to a DLD plot:

| Area (DLD name) | Sales | Matched | Matched, 2024 on | Plot holds one building |
| --- | --- | --- | --- | --- |
| Marsa Dubai (Marina, JBR, Emaar Beachfront) | 106,903 | 96.8% | 82.1% | 45.4% |
| Business Bay | 98,117 | 88.5% | 70.5% | 56.2% |
| Al Barsha South Fourth (JVC) | 88,064 | 85.8% | 71.9% | 60.5% |
| **All Dubai** | 1,068,527 | 59.9% | 41.0% | 31.0% |

For comparison, matching the sale name to the DLD project name alone gets 34% (Marina), 65% (JVC) and 53% (Business Bay).

Across Dubai, 11 areas reach 90% or more (310,724 sales) and 25 areas reach 50% or more (699,066 sales).
Areas near 0% are communities with no Green List workbook (for example Nadd Hessa, Wadi Al Safa 5, Al Jadaf).

## What fails

1. **New off-plan towers.** All or most of their sales are from 2024 on and they are not in the Green List:
   Binghatti Skyrise A–C, Elite, Hillviews, Vintage, Circle; Peninsula One and Four; Bayz 102; Timez by Danube;
   Franck Muller Vanguard. This is why the 2024-on rate is lower.
2. **Communities without a workbook.** Silicon Gates and Palace Tower (Nadd Hessa) and Skycourts A–F
   (Wadi Al Safa 5) are older towers with no workbook.
3. **Plots with several buildings.** The land number gives the plot. Only 45–60% of matched launch-area sales are
   on a single-building plot. The rest need the tower picked from the name ("Tower 2") against `building_number`,
   or through the units file.

## Not solved by this

No DLD file or Green List column has coordinates. Part B (footprints: OpenStreetMap names inside the community
polygon, or Dubai Pulse `dsc_buildings`) is still needed to place buildings on the map.

## Recommendation for M2

- Build M2 on the land-number bridge for every area that has a workbook; it is far stronger than name matching alone.
- Add a tower picker for multi-building plots (name suffix to `building_number`, then units).
- Hand-place the new off-plan towers in the launch areas (about 20 names cover most unmatched launch sales).
- Run part B before M3 to get map positions.
