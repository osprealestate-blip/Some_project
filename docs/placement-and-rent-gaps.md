# Why 3,466 buildings have no map dot and 83% of rents have no building

Measured 2026-11-17 on the hosted database (read-only queries), 4,913 buildings and 729,000 counted rent contracts.
Nothing in the hosted database was changed.

## Buildings with no map position (3,466 of 4,913)

| Position source | Buildings |
| --- | ---: |
| OpenStreetMap name match (`osm`) | 1,082 |
| Same project as a placed tower (`project`) | 222 |
| Development site (`site`) | 93 |
| OpenStreetMap name search (`search`) | 50 |
| None | 3,466 |

What the data says:

- **DLD files have no coordinates.** The only position sources are OpenStreetMap, the OSM name search and hand placing.
  `db/seeds/manual_positions.csv` is empty today.
- **Most unplaced buildings are new off-plan towers.** The 40 busiest unplaced buildings (Binghatti, Azizi Venice, Damac
  Lagoons, Danube, Maybach Six and similar) are launches that OSM has not mapped under a name yet. 3,034 of the 3,466
  had a sale in the last 12 months, and 1,168 had 20 or more.
- **No building has a DLD land number in the hosted data** (0 of 4,913). The "same plot" step therefore places no one outside what the
  launch-area run already did (most likely `match-buildings` was run without the Green List crosswalk and the DLD buildings
  file for the rest of Dubai; check on the PC).
  The Green List only covers older stock, so this helps mostly resale towers, not the off-plan launches above.
- A position for the rest would have to be invented (for example the community centre). That is not done.

What is fixable, and how much:

| Fix | Effect | Status |
| --- | --- | --- |
| OSM query and reader also take `building:name`, `addr:housename`, `official_name`, `short_name`, `loc_name`, `int_name` | More named OSM features to match against. Size not measurable without Overpass access from here; run it and read the counts. | In this PR |
| `dpi unplaced-report`: unplaced buildings busiest first, in the layout of `manual_positions.csv` | Unplaced buildings hold 118,041 of the 146,157 building-linked sales of the last 12 months (81%). The 100 busiest alone hold 37,213 (25% of those linked sales), so hand placing them is the biggest single gain. | In this PR |
| Run `match-buildings` with the crosswalk and DLD buildings file for all communities | Lets buildings on a plot with a placed neighbour inherit an approximate position (`plot`). Gain unknown until run. | Command below, needs files on the PC |

## Rents with no building (606,000 of 729,000 counted)

| Why | Rents | Share | Fixable? |
| --- | ---: | ---: | --- |
| Community has no building pages (Naif, Al Karama, Al Nahda, Hor Al Anz, Muhaisanah, Mankhool and other older districts) | 288,127 | 39.5% | No. Buildings come from sale names, and rents carry none. Stays at community level. |
| DLD row has no project name | 232,692 | 31.9% | Only by exact size, which is already done (see below). |
| Project has several towers | 56,633 | 7.8% | Not honestly. The data does not say which tower. Shown at project level. |
| Project has no building page (mostly villa and townhouse projects) | 28,457 | 3.9% | Mostly no. Villa projects have no tower page. |
| Linked (one-tower project, or one tower fits the exact size) | 123,390 | 16.9% | |

Size matching is close to saturated. Backtest on 100,424 sales since 2025 in multi-tower projects, learned from older
sales in the same project, tower picked only when exactly one tower fits:

| Minimum sales of that size | Sales given a tower | Right tower |
| --- | ---: | ---: |
| 6 (current) | 4.3% | 87.7% |
| 3 | 7.5% | 85.8% |
| 2 | 9.4% | 84.8% |
| 1 | 13.8% | 80.0% |

Lowering the threshold would add a few points of coverage and lose accuracy, so it is not changed.
The one real lever is the **DLD Units file** (exact size, bedrooms and floor of every unit, 2.4 million rows), which would
also fix floors. It is not imported yet and its columns have not been profiled (`dpi profile`), so no matching code is
written for it here. Towers of one project often share layouts, so it will help less than it sounds for category 4.

## Commands for the PC (local database only; nothing here touches the hosted one)

```powershell
# from the repo root, DATABASE_URL set as in README.md
dpi rent-gaps                                   # the rent table above, on your local database
dpi unplaced-report --limit 300                 # data\clean\unplaced_buildings.csv, busiest first
# re-fetch OSM with the wider name tags for all of Dubai, then re-place (about 30 minutes with the name search)
dpi place-buildings --communities "" --fetch --save-osm data\clean\osm_buildings.json --nominatim
dpi unplaced-report --limit 300 --out data\clean\unplaced_after.csv   # compare the counts before and after
```

Then fill `lat` and `lng` in the CSV for towers you can see on OpenStreetMap or a satellite map, and copy those rows into
`db/seeds/manual_positions.csv`; re-run `place-buildings` to apply them. Rows without coordinates are ignored.
Pushing new positions to the hosted database is a separate step that needs your approval first.
