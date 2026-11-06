# Matching test (T1.4), first results

Run on the owner's PC on 6 Nov 2026 with the 2 Nov DLD sales export and the Green List workbooks. Only
building names, land numbers and counts were used (no owner, phone or ID columns). The raw crosswalk file is
kept outside the repo (`new_project/outputs/building_crosswalk_launch_areas.csv`).

## Key finding

DLD's buildings file has no building name column, only `building_number`, `land_number` and project. The Green
List has both `BuildingNameEn` and `LandNumber`, so it links a sale's building name to a DLD plot and the
buildings on it. For Marina the JBR and Emaar Beachfront workbooks were added, because DLD files those under
Marsa Dubai.

## Results

| | Marina | JVC | Business Bay |
|---|---|---|---|
| Sales (all years) | 107,157 | 95,196 | 98,293 |
| Matched to a DLD building | 94.6% | 85.8% | 88.5% |
| Sales from 2024 on, matched | 79.8% | 71.9% | 70.5% |
| Matched where one building is on the plot | 45.4% | 60.5% | 56.2% |
| DLD project name only, for comparison | 34.3% | 64.6% | 52.5% |

- The rest of the matches land on plots with several buildings: the land number gives the plot, not the tower.
  Splitting those needs the tower number in the name or the units file (M2).
- Unmatched sales are mostly new off-plan towers (for example Binghatti Skyrise A to C, Peninsula One and Four,
  Bayz 102, Franck Muller Vanguard, Skyhills). Not confirmed whether they were launched after the Green List
  period or are missing from DLD's buildings file. Bluewaters needs its own workbook.

## Not solved

No file gives map positions. Land numbers have no coordinates. A footprint source is still needed
(OpenStreetMap by name, or Dubai Pulse `dsc_buildings`, not yet checked).

## Recommendation for M2

1. Build the name to plot link from the Green List (market columns and land numbers only).
2. Resolve multi-building plots with tower numbers from names and the units file.
3. Check `dsc_buildings` and OSM for footprints before doing any hand-placing.
4. Hand-check the three launch communities first.
