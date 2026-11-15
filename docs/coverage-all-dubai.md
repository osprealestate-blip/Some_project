# Coverage of all Dubai communities

Local database snapshot (DLD data to 2026-10-30; newest file 2026-11-02). "12m" is 2025-10-30 to 2026-10-30, outlier-excluded rows only.
Sources: DLD open data, OpenStreetMap, DHA, KHDA. Nothing here was pushed to the hosted database.
Per-community table: `data/clean/coverage_by_community.csv` (data files are normally not committed; this one is added by request) and the end of this file.

## Headline numbers

| Measure | Value |
| --- | --- |
| Communities in the database | 234 (156 have a sale in the last 12 months) |
| Communities with building pages | 71 |
| Buildings | 4,913 |
| Buildings on the map (any position) | 1,448 (29.5%): OSM 1,082, same project 223, development site 93, name search 50 |
| Buildings still unplaced | 3,465 (70.5%) |
| Buildings with floors | 1,720 (35.0%) |
| Buildings with a sale in 12m | 4,337 |
| Buildings with a gross yield | 1,539 (needs a sale and a rent in 12m for the same building and unit size) |
| Sales 12m / rents 12m | 170,970 / 748,387 |
| Sales 12m linked to a building | 85.0% |
| Rents 12m linked to a building | 16.9% (all-time 11.9%) |
| Sales / rents with no community (all time) | 1.41% / 2.87% (19,402 / 216,206 rows) |

## What was run, and what was not

Local database only. Run: `dpi rematch-communities` (0 new rows; communities were already assigned), `dpi match-buildings` (99.7% of named sales linked to a building),
`dpi place-buildings` for all of Dubai (OSM download plus Nominatim name search), `dpi compute-metrics`.
`dpi load-pois` was not re-run: nearby places are already loaded for all Dubai (17,332 from OSM, DHA Sheryan and KHDA) and no new source files exist in `data/`.

Not covered:
- No crosswalk or DLD buildings file was present, so no building has a DLD land number and floors are known for 35% of buildings only.
- 3,465 buildings have no map position. OSM has few named towers outside the launch areas, so the rest need hand positions in `db/seeds/manual_positions.csv`. The ten Golden Mile projects have towers over 1 km apart and need a hand check.
- Rents carry a project name, not a tower, so they link to a building only when the project has exactly one building page or by unit size (marked estimated).
- Villa and townhouse areas have no building pages (see below).
- Names that stay unmatched to a community (59 raw area names, no polygon in the 234): Madinat Hind 4 (12,592 sales, 31,095 rents), Al Ruwayyah (2,008 sales), Nad Al Shiba (998), Ghadeer Al Tair (979), Jabal Ali (908),
  Um Suqaim (446), Al Twar Fourth and Fifth (468 sales, 39,707 rents), Al Qusais (135 sales, 139,898 rents), Al Khawaneej (93), Al Mizhar Third and Fourth (about 900 rents), Bur Dubai (187 rents).
  They need a name-to-community mapping in `pipeline/src/dpi/names.py`.

## Villa and townhouse communities

Share = villa + townhouse sales over apartment + villa + townhouse sales in the last 12 months. 51 of 234 communities are at least 50% villa or townhouse
(10,549 sales in 12m). Those with at least 100 sales are listed; use a per-community page for them, not per-building pages.
DM communities are official areas, so named master communities such as Arabian Ranches or Damac Hills sit inside them and are not separate rows.
Mixed communities that are mainly towers (JVC, Dubai South, Wadi Al Safa 5) keep building pages.

| Code | Community | Sales 12m | Villa/townhouse share | Buildings |
| --- | --- | ---: | ---: | ---: |
| 921 | Al Yalayis 1 | 4,316 | 100.0% | 0 |
| 915 | Al Yufrah 1 | 1,874 | 80.3% | 3 |
| 665 | Wadi Al Safa 7 | 800 | 82.6% | 75 |
| 812 | Al Rowaiyah First | 743 | 100.0% | 0 |
| 513 | Saih Shuaib 1 | 633 | 100.0% | 0 |
| 677 | Al Hebiah Sixth | 585 | 96.5% | 1 |
| 394 | Al Thanyah Fourth | 471 | 100.0% | 1 |
| 664 | Wadi Al Safa 6 | 270 | 100.0% | 0 |
| 127 | Hor Al Anz | 102 | 100.0% | 0 |

Communities with at least 100 sales in 12m and no building pages: Al Yalayis 1 (921, 4,316), Al Yalayis 5 (925, 950), Al Rowaiyah First (812, 743), Me'Aisem Second (686, 661), Saih Shuaib 1 (513, 633), Wadi Al Safa 6 (664, 270), Hor Al Anz (127, 102).

## Estimated size on the hosted database

From `pg_total_relation_size` (tables plus indexes) of the local tables `push-public` copies, scaled by row share for the filtered variants.
Local: transactions 2.10 GB (1.39M rows), rent_contracts 3.10 GB (9.32M rows), all other copied tables about 0.034 GB.

| Variant | Approx. size |
| --- | ---: |
| All communities, last 10 years (the `push-public` default, every community) | about 4.3 GB (sales 1.58, rents 2.68, rest 0.03) |
| All communities, last 3 years of sales and rents | about 1.95 GB (sales 0.89, rents 1.03) |
| Last 3 years of sales, last 12 months of rents | about 1.25 GB |
| Summaries only (communities, projects, buildings, aliases, summaries, metrics, places; no sale or rent rows) | about 0.035 GB |

Only summaries-only fits Supabase's free 500 MB tier.

## Per-community table

Sorted by sales in 12m. `*` marks a launch area. Villa % blank means no residential sales in 12m.

| Code | Community | Bldgs | % map | % floors | Sales 12m | Rents 12m | Bldgs w/ sales | Bldgs w/ yield | Villa % | Sales unlinked | Rents unlinked |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 521 | Dubai South | 419 | 20.8 | 51.8 | 16,450 | 9,197 | 256 | 32 | 7.0 | 1,384 | 8,121 |
| 681 | Jumeirah Village Circle (JVC) * | 383 | 45.2 | 62.4 | 11,559 | 32,092 | 376 | 185 | 2.0 | 254 | 14,790 |
| 648 | Wadi Al Safa 5 | 122 | 1.6 | 0.8 | 8,663 | 11,903 | 121 | 28 | 11.6 | 1,227 | 10,057 |
| 645 | Wadi Al Safa 3 | 112 | 12.5 | 2.7 | 8,282 | 4,636 | 99 | 34 | 7.2 | 760 | 3,778 |
| 591 | Jabal Ali First | 246 | 10.2 | 23.2 | 7,805 | 29,787 | 235 | 46 | 2.6 | 763 | 25,453 |
| 346 | Business Bay * | 234 | 50.4 | 66.7 | 7,535 | 26,842 | 210 | 91 | 0.0 | 7 | 9,915 |
| 101 | Palm Deira | 148 | 0.7 | 0.0 | 4,775 | 19 | 143 | 1 | 0.0 | 151 | 3 |
| 921 | Al Yalayis 1 | 0 |  |  | 4,316 | 1,561 | 0 | 0 | 100.0 | 4,316 | 1,561 |
| 646 | Wadi Al Safa 4 | 61 | 1.6 | 0.0 | 4,020 | 141 | 57 | 2 | 0.9 | 71 | 67 |
| 415 | Dubai Creek Harbour | 117 | 29.1 | 67.5 | 3,963 | 6,455 | 113 | 76 | 0.0 | 3 | 4,210 |
| 673 | Al Barsha South Third | 115 | 13.0 | 71.3 | 3,892 | 14,989 | 112 | 63 | 0.0 | 26 | 9,248 |
| 684 | Al Barsha South Fifth | 73 | 9.6 | 57.5 | 3,870 | 3,546 | 68 | 21 | 2.9 | 111 | 1,997 |
| 685 | Me'Aisem First | 73 | 23.3 | 37.0 | 3,770 | 8,100 | 72 | 45 | 4.7 | 651 | 6,874 |
| 683 | Al Hebiah Fifth | 127 | 61.4 | 8.7 | 3,758 | 3,098 | 87 | 26 | 12.5 | 1,408 | 3,097 |
| 518 | Jabal Ali Industrial Second | 26 | 0.0 | 0.0 | 3,745 | 1,032 | 26 | 6 | 0.0 | 8 | 229 |
| 674 | Al Hebiah First | 89 | 57.3 | 59.6 | 3,717 | 2,496 | 84 | 7 | 0.9 | 34 | 2,014 |
| 393 | Jumeirah Lake Towers (JLT) | 107 | 60.7 | 74.8 | 3,669 | 14,043 | 103 | 36 | 7.3 | 227 | 5,247 |
| 682 | Al Hebiah Fourth | 84 | 48.8 | 0.0 | 3,573 | 10,629 | 80 | 54 | 9.1 | 463 | 2,603 |
| 321 | Madinat Dubai Al Melaheyah | 76 | 0.0 | 0.0 | 3,557 | 2,645 | 69 | 11 | 0.0 | 6 | 2,412 |
| 392 | Dubai Marina * | 255 | 58.8 | 64.3 | 3,497 | 20,318 | 238 | 92 | 0.1 | 4 | 11,262 |
| 597 | Dubai Investment Park (DIP) | 58 | 10.3 | 0.0 | 3,326 | 4,249 | 47 | 11 | 46.4 | 1,705 | 3,602 |
| 631 | Dubai Hills Estate | 110 | 5.5 | 42.7 | 2,876 | 8,023 | 99 | 49 | 8.6 | 560 | 6,058 |
| 618 | Nadd Al Shiba First | 70 | 51.4 | 57.1 | 2,778 | 2,644 | 61 | 9 | 10.5 | 572 | 2,264 |
| 347 | Al Merkadh | 138 | 53.6 | 73.2 | 2,771 | 12,748 | 128 | 98 | 1.2 | 123 | 2,270 |
| 326 | Al Jadaf | 56 | 14.3 | 0.0 | 2,646 | 9,573 | 51 | 29 | 0.0 | 32 | 6,297 |
| 345 | Downtown Dubai | 153 | 45.1 | 57.5 | 2,585 | 11,073 | 137 | 52 | 0.0 | 2 | 5,115 |
| 611 | Bu Kadra | 29 | 0.0 | 0.0 | 2,366 | 106 | 29 | 1 | 0.0 | 21 | 90 |
| 598 | Dubai Investment Park (DIP) | 96 | 3.1 | 3.1 | 2,348 | 6,401 | 45 | 6 | 38.3 | 938 | 5,971 |
| 621 | Warsan First | 298 | 17.8 | 2.3 | 2,230 | 29,628 | 277 | 43 | 2.4 | 60 | 27,844 |
| 672 | Al Barsha South Second | 23 | 21.7 | 0.0 | 2,149 | 1,707 | 23 | 10 | 0.5 | 13 | 1,300 |
| 922 | Al Yalayis 2 | 57 | 14.0 | 61.4 | 2,050 | 6,365 | 56 | 30 | 13.1 | 268 | 4,758 |
| 626 | Nadd Hessa | 92 | 51.1 | 2.2 | 2,020 | 18,971 | 86 | 54 | 1.3 | 37 | 12,689 |
| 915 | Al Yufrah 1 | 3 | 0.0 | 0.0 | 1,874 | 889 | 3 | 0 | 80.3 | 1,570 | 889 |
| 676 | Al Hebiah Third | 47 | 0.0 | 40.4 | 1,819 | 4,653 | 45 | 30 | 8.8 | 381 | 4,040 |
| 643 | Wadi Al Safa 2 | 71 | 56.3 | 2.8 | 1,678 | 5,063 | 61 | 32 | 5.1 | 127 | 2,860 |
| 624 | Warsan Fourth | 60 | 21.7 | 1.7 | 1,636 | 10,647 | 58 | 21 | 0.0 | 160 | 9,712 |
| 334 | Al Satwa | 41 | 4.9 | 0.0 | 1,477 | 6,767 | 40 | 17 | 1.1 | 38 | 6,353 |
| 675 | Al Hebiah Second | 26 | 11.5 | 0.0 | 1,452 | 2,222 | 26 | 12 | 0.4 | 8 | 1,274 |
| 343 | Al Wasl | 83 | 28.9 | 22.9 | 1,334 | 2,997 | 76 | 24 | 0.9 | 26 | 2,367 |
| 381 | Palm Jumeirah | 107 | 58.9 | 55.1 | 1,237 | 4,493 | 102 | 44 | 6.5 | 126 | 3,581 |
| 531 | Saih Shuaib 2 | 27 | 3.7 | 0.0 | 952 | 3,221 | 24 | 4 | 3.8 | 90 | 3,036 |
| 925 | Al Yalayis 5 | 0 |  |  | 950 | 1 | 0 | 0 |  | 950 | 1 |
| 665 | Wadi Al Safa 7 | 75 | 4.0 | 0.0 | 800 | 3,415 | 15 | 4 | 82.6 | 676 | 3,249 |
| 372 | Al Safouh First | 9 | 11.1 | 0.0 | 765 | 949 | 7 | 3 | 3.0 | 8 | 766 |
| 337 | Za'abeel | 13 | 46.2 | 0.0 | 763 | 1,278 | 13 | 4 | 0.0 | 3 | 710 |
| 501 | Palm Jebel Ali | 3 | 0.0 | 0.0 | 747 | 0 | 3 | 0 | 0.0 | 324 | 0 |
| 812 | Al Rowaiyah First | 0 |  |  | 743 | 267 | 0 | 0 | 100.0 | 743 | 267 |
| 686 | Me'Aisem Second | 0 |  |  | 661 | 0 | 0 | 0 |  | 661 | 0 |
| 513 | Saih Shuaib 1 | 0 |  |  | 633 | 244 | 0 | 0 | 100.0 | 633 | 244 |
| 612 | Ras Al Khor Industrial First | 9 | 0.0 | 0.0 | 593 | 935 | 9 | 0 | 0.0 | 6 | 935 |
| 677 | Al Hebiah Sixth | 1 | 0.0 | 100.0 | 585 | 1,348 | 1 | 1 | 96.5 | 566 | 1,254 |
| 388 | Al Thanyah Third | 70 | 70.0 | 27.1 | 559 | 4,593 | 64 | 17 | 8.6 | 47 | 3,714 |
| 394 | Al Thanyah Fourth | 1 | 0.0 | 0.0 | 471 | 2,579 | 0 | 0 | 100.0 | 471 | 2,579 |
| 366 | Umm Suqeim | 37 | 8.1 | 89.2 | 451 | 1,239 | 33 | 16 | 0.7 | 5 | 1,091 |
| 324 | Al Kifaf | 11 | 18.2 | 0.0 | 384 | 663 | 11 | 6 | 0.0 | 0 | 663 |
| 332 | Jumeirah | 33 | 0.0 | 72.7 | 326 | 3,441 | 33 | 12 | 7.8 | 66 | 3,293 |
| 383 | Al Thanyah First | 19 | 52.6 | 5.3 | 323 | 7,412 | 18 | 8 | 0.0 | 6 | 6,278 |
| 664 | Wadi Al Safa 6 | 0 |  |  | 270 | 1,243 | 0 | 0 | 100.0 | 270 | 1,243 |
| 382 | Al Safouh Second | 6 | 33.3 | 16.7 | 226 | 1,662 | 6 | 2 | 0.0 | 0 | 1,594 |
| 251 | Mirdif | 17 | 0.0 | 0.0 | 225 | 12,148 | 16 | 10 | 21.3 | 73 | 11,904 |
| 336 | Trade Center Second | 4 | 25.0 | 0.0 | 197 | 3,024 | 4 | 1 | 0.0 | 1 | 2,730 |
| 335 | Trade Center First | 5 | 40.0 | 0.0 | 163 | 6,064 | 5 | 1 | 0.0 | 2 | 5,622 |
| 359 | Al Qouz Fourth | 11 | 100.0 | 0.0 | 127 | 2,491 | 9 | 8 | 8.1 | 13 | 2,491 |
| 325 | Za'abeel | 6 | 0.0 | 0.0 | 116 | 173 | 6 | 2 | 0.0 | 0 | 89 |
| 342 | Jumeirah | 11 | 45.5 | 0.0 | 116 | 867 | 9 | 1 | 5.3 | 7 | 849 |
| 373 | Al Barsha | 3 | 33.3 | 0.0 | 110 | 18,208 | 3 | 3 | 2.0 | 7 | 17,477 |
| 127 | Hor Al Anz | 0 |  |  | 102 | 13,625 | 0 | 0 | 100.0 | 102 | 13,625 |
| 416 | Nadd Al Hamar | 3 | 0.0 | 0.0 | 95 | 4,387 | 3 | 2 | 10.8 | 37 | 4,222 |
| 248 | Al Qusais Industrial Fifth | 1 | 0.0 | 0.0 | 83 | 7,862 | 1 | 1 | 0.0 | 4 | 7,841 |
| 356 | Umm Suqeim | 0 |  |  | 81 | 861 | 0 | 0 | 100.0 | 81 | 861 |
| 261 | Muhaisnah First | 11 | 0.0 | 0.0 | 63 | 512 | 11 | 1 | 14.5 | 16 | 507 |
| 811 | Warsan Third | 0 |  |  | 61 | 466 | 0 | 0 |  | 61 | 466 |
| 126 | Abu Hail | 0 |  |  | 57 | 3,471 | 0 | 0 | 100.0 | 57 | 3,471 |
| 599 | Jabal Ali Industrial First | 0 |  |  | 53 | 3,940 | 0 | 0 |  | 53 | 3,940 |
| 284 | Al Ttay | 0 |  |  | 51 | 1,481 | 0 | 0 |  | 51 | 1,481 |
| 216 | Al Rashidiya | 0 |  |  | 51 | 1,480 | 0 | 0 | 100.0 | 51 | 1,480 |
| 533 | Saih Shuaib 4 | 0 |  |  | 49 | 228 | 0 | 0 |  | 49 | 228 |
| 532 | Saih Shuaib 3 | 0 |  |  | 44 | 864 | 0 | 0 |  | 44 | 864 |
| 132 | Al Wuheida | 0 |  |  | 42 | 282 | 0 | 0 | 100.0 | 42 | 282 |
| 412 | Al Kheeran | 13 | 15.4 | 0.0 | 36 | 1,082 | 8 | 1 | 5.6 | 2 | 1,058 |
| 333 | Al Bada' | 0 |  |  | 34 | 5,179 | 0 | 0 | 100.0 | 34 | 5,179 |
| 303 | World Islands | 6 | 0.0 | 0.0 | 34 | 0 | 6 | 0 | 100.0 | 9 | 0 |
| 354 | Al Qouz First | 0 |  |  | 30 | 1,040 | 0 | 0 | 100.0 | 30 | 1,040 |
| 134 | Al Mamzar | 0 |  |  | 27 | 4,964 | 0 | 0 | 100.0 | 27 | 4,964 |
| 281 | Al Khwaneej First | 0 |  |  | 26 | 230 | 0 | 0 | 100.0 | 26 | 230 |
| 129 | Port Saeed | 2 | 0.0 | 0.0 | 25 | 6,989 | 2 | 0 | 100.0 | 8 | 6,989 |
| 616 | Nadd Al Shiba Third | 0 |  |  | 23 | 978 | 0 | 0 |  | 23 | 978 |
| 367 | Umm Al Sheif | 0 |  |  | 23 | 467 | 0 | 0 | 100.0 | 23 | 467 |
| 318 | Al Karama | 0 |  |  | 23 | 16,379 | 0 | 0 |  | 23 | 16,379 |
| 511 | Hessyan First | 8 | 100.0 | 0.0 | 22 | 616 | 7 | 1 | 18.2 | 4 | 616 |
| 118 | Naif | 0 |  |  | 22 | 18,143 | 0 | 0 | 100.0 | 22 | 18,143 |
| 123 | Al Muteena | 0 |  |  | 20 | 8,955 | 0 | 0 | 100.0 | 20 | 8,955 |
| 302 | Jumeira Bay | 7 | 14.3 | 100.0 | 19 | 73 | 6 | 1 | 35.7 | 10 | 73 |
| 376 | Al Barsha | 0 |  |  | 18 | 478 | 0 | 0 | 100.0 | 18 | 478 |
| 312 | Al Souq Al Kabeer | 0 |  |  | 17 | 11,750 | 0 | 0 | 100.0 | 17 | 11,750 |
| 323 | Al Jafiliya | 0 |  |  | 17 | 871 | 0 | 0 | 100.0 | 17 | 871 |
| 263 | Al Mizhar Second | 0 |  |  | 17 | 85 | 0 | 0 | 100.0 | 17 | 85 |
| 352 | Jumeirah | 0 |  |  | 15 | 1,025 | 0 | 0 | 100.0 | 15 | 1,025 |
| 375 | Al Barsha | 0 |  |  | 14 | 363 | 0 | 0 | 100.0 | 14 | 363 |
| 423 | Al Warqa'A Third | 0 |  |  | 14 | 218 | 0 | 0 | 100.0 | 14 | 218 |
| 262 | Al Mizhar First | 0 |  |  | 14 | 366 | 0 | 0 | 100.0 | 14 | 366 |
| 247 | Al Qusais Industrial Fourth | 1 | 0.0 | 0.0 | 13 | 1,448 | 1 | 1 | 0.0 | 3 | 1,392 |
| 117 | Al Murar | 0 |  |  | 13 | 13,494 | 0 | 0 | 100.0 | 13 | 13,494 |
| 113 | Al Daghaya | 0 |  |  | 13 | 3,745 | 0 | 0 | 100.0 | 13 | 3,745 |
| 124 | Al Muraqqabat | 0 |  |  | 12 | 13,552 | 0 | 0 |  | 12 | 13,552 |
| 227 | Al Twar Second | 0 |  |  | 12 | 63 | 0 | 0 | 100.0 | 12 | 63 |
| 241 | Al Nahda Second | 0 |  |  | 12 | 16,002 | 0 | 0 |  | 12 | 16,002 |
| 421 | Al Warqa'A First | 0 |  |  | 12 | 10,499 | 0 | 0 |  | 12 | 10,499 |
| 313 | Al Hamriya | 0 |  |  | 11 | 4,664 | 0 | 0 | 100.0 | 11 | 4,664 |
| 231 | Al Nahda First | 0 |  |  | 11 | 12,487 | 0 | 0 |  | 11 | 12,487 |
| 362 | Umm Suqeim | 0 |  |  | 11 | 1,027 | 0 | 0 | 100.0 | 11 | 1,027 |
| 316 | Al Raffa | 0 |  |  | 11 | 8,145 | 0 | 0 |  | 11 | 8,145 |
| 122 | Al Baraha | 0 |  |  | 11 | 3,625 | 0 | 0 | 100.0 | 11 | 3,625 |
| 357 | Al Safa Second | 0 |  |  | 10 | 501 | 0 | 0 | 100.0 | 10 | 501 |
| 226 | Al Twar First | 0 |  |  | 10 | 745 | 0 | 0 | 100.0 | 10 | 745 |
| 315 | Umm Hurair Second | 3 | 33.3 | 0.0 | 9 | 1,290 | 2 | 0 | 0.0 | 3 | 1,286 |
| 125 | Riggat Al Buteen | 2 | 0.0 | 0.0 | 8 | 1,481 | 2 | 0 | 0.0 | 1 | 1,481 |
| 424 | Al Warqa'A Fourth | 0 |  |  | 8 | 114 | 0 | 0 | 100.0 | 8 | 114 |
| 244 | Muhaisanah Third | 0 |  |  | 8 | 71 | 0 | 0 | 100.0 | 8 | 71 |
| 422 | Al Warqa'A Second | 0 |  |  | 8 | 133 | 0 | 0 | 100.0 | 8 | 133 |
| 112 | Al Ras | 0 |  |  | 8 | 3,441 | 0 | 0 |  | 8 | 3,441 |
| 128 | Al Khabaisi | 0 |  |  | 7 | 5,625 | 0 | 0 |  | 7 | 5,625 |
| 671 | Al Barsha South First | 0 |  |  | 7 | 161 | 0 | 0 | 100.0 | 7 | 161 |
| 133 | Hor Al Anz East | 0 |  |  | 7 | 5,627 | 0 | 0 | 100.0 | 7 | 5,627 |
| 271 | Wadi Alamardi | 0 |  |  | 6 | 92 | 0 | 0 |  | 6 | 92 |
| 116 | Ayal Nasir | 0 |  |  | 6 | 4,038 | 0 | 0 |  | 6 | 4,038 |
| 363 | Al Manara | 0 |  |  | 6 | 552 | 0 | 0 | 100.0 | 6 | 552 |
| 282 | Al Khwaneej Second | 0 |  |  | 6 | 393 | 0 | 0 |  | 6 | 393 |
| 114 | Al Buteen | 0 |  |  | 5 | 3,298 | 0 | 0 |  | 5 | 3,298 |
| 228 | Al Twar Third | 0 |  |  | 5 | 111 | 0 | 0 | 100.0 | 5 | 111 |
| 721 | Al Awir Second | 0 |  |  | 5 | 90 | 0 | 0 | 100.0 | 5 | 90 |
| 245 | Muhaisanah Fourth | 0 |  |  | 4 | 13,712 | 0 | 0 |  | 4 | 13,712 |
| 622 | Warsan Second | 0 |  |  | 4 | 195 | 0 | 0 |  | 4 | 195 |
| 317 | Mankhool | 0 |  |  | 4 | 12,101 | 0 | 0 |  | 4 | 12,101 |
| 615 | Nadd Al Shiba Second | 0 |  |  | 4 | 83 | 0 | 0 | 100.0 | 4 | 83 |
| 617 | Nadd Al Shiba Fourth | 0 |  |  | 3 | 104 | 0 | 0 | 100.0 | 3 | 104 |
| 319 | Oud Metha | 0 |  |  | 3 | 5,394 | 0 | 0 |  | 3 | 5,394 |
| 711 | Al Awir First | 0 |  |  | 3 | 367 | 0 | 0 |  | 3 | 367 |
| 214 | Al Garhoud | 0 |  |  | 3 | 3,688 | 0 | 0 |  | 3 | 3,688 |
| 215 | Umm Ramool | 0 |  |  | 3 | 1,295 | 0 | 0 |  | 3 | 1,295 |
| 213 | Nadd Shamma | 0 |  |  | 3 | 21 | 0 | 0 | 100.0 | 3 | 21 |
| 314 | Umm Hurair First | 0 |  |  | 2 | 1,292 | 0 | 0 |  | 2 | 1,292 |
| 358 | Al Qouz Third | 0 |  |  | 2 | 4,280 | 0 | 0 |  | 2 | 4,280 |
| 364 | Al Qouz IndustrialFirst | 0 |  |  | 2 | 1,657 | 0 | 0 |  | 2 | 1,657 |
| 119 | Al Rigga | 0 |  |  | 2 | 4,195 | 0 | 0 |  | 2 | 4,195 |
| 264 | Muhaisanah Second | 0 |  |  | 1 | 1,128 | 0 | 0 |  | 1 | 1,128 |
| 368 | Al Qouz IndustrialThird | 0 |  |  | 1 | 985 | 0 | 0 |  | 1 | 985 |
| 614 | Ras Al Khor Industrial Third | 0 |  |  | 1 | 6,000 | 0 | 0 |  | 1 | 6,000 |
| 322 | Al Hudaiba | 0 |  |  | 1 | 2,055 | 0 | 0 | 100.0 | 1 | 2,055 |
| 365 | Al Qouz IndustrialSecond | 0 |  |  | 1 | 8,407 | 0 | 0 |  | 1 | 8,407 |
| 731 | Lehbab First | 0 |  |  | 1 | 113 | 0 | 0 |  | 1 | 113 |
| 243 | Al Qusais Industrial Second | 0 |  |  | 1 | 1,974 | 0 | 0 |  | 1 | 1,974 |
| 353 | Al Safa First | 0 |  |  | 1 | 1,414 | 0 | 0 | 100.0 | 1 | 1,414 |
| 115 | Al Sabkha | 0 |  |  | 1 | 1,523 | 0 | 0 |  | 1 | 1,523 |
| 613 | Ras Al Khor Industrial Second | 0 |  |  | 1 | 1,634 | 0 | 0 |  | 1 | 1,634 |
| 845 | Al Maha | 0 |  |  | 1 | 44 | 0 | 0 |  | 1 | 44 |
| 246 | Al Qusais Industrial Third | 0 |  |  | 0 | 849 | 0 | 0 |  | 0 | 849 |
| 945 | Al Fagaa | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 727 | Al Wohoosh | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 384 | Al Thanyah Second | 0 |  |  | 0 | 5 | 0 | 0 |  | 0 | 5 |
| 931 | Al Lesaily | 0 |  |  | 0 | 516 | 0 | 0 |  | 0 | 516 |
| 234 | Al Qusais Third | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 516 | Jabal Ali Industrial Third | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 413 | Ras Al Khor | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 304 | Jumeira Island 2 | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 267 | Muhaisanah Fifth | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 736 | Nazwah | 0 |  |  | 0 | 1 | 0 | 0 |  | 0 | 1 |
|  | The Springs | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | The Meadows | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | Jumeirah Park | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | Dubai Production City | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | Jumeirah Golf Estates | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | City of Arabia | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | Al Barari | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 951 | Saih Al Salam | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 913 | Umm Nahad Third | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 594 | Mena Jabal Ali | 0 |  |  | 0 | 11 | 0 | 0 |  | 0 | 11 |
| 911 | Umm Nahad First | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 912 | Umm Nahad Second | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 814 | Al Rowaiyah Third | 0 |  |  | 0 | 253 | 0 | 0 |  | 0 | 253 |
| 967 | Ghadeer Barashy | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 987 | Al Layan 1 | 0 |  |  | 0 | 37 | 0 | 0 |  | 0 | 37 |
| 991 | Hefair | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 857 | Margab | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 851 | Remah | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 233 | Al Qusais Second | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 924 | Al Yalayis 4 | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 431 | Wadi Alshabak | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 919 | Al Yufrah 4 | 0 |  |  | 0 | 1 | 0 | 0 |  | 0 | 1 |
| 724 | Enkhali | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 981 | Mugatrah | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 978 | Saih Shua'Alah | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 835 | Umm Al Mo'Meneen | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 841 | Margham | 0 |  |  | 0 | 168 | 0 | 0 |  | 0 | 168 |
| 988 | Al Layan 2 | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 961 | Al Selal | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 975 | Al O'shoosh | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 252 | Mushraif | 0 |  |  | 0 | 16 | 0 | 0 |  | 0 | 16 |
| 824 | Umm Al Daman | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 956 | Al Hathmah | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 268 | Oud Al Muteena Third | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 861 | Yaraah | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 232 | Al Qusais First | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 502 | Al Wajeha Al Bahriah | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 221 | Dubai International Airport | 0 |  |  | 0 | 275 | 0 | 0 |  | 0 | 275 |
| 923 | Al Yalayis 3 | 0 |  |  | 0 | 1 | 0 | 0 |  | 0 | 1 |
| 355 | Al Qouz Second | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
|  | Jumeirah Islands | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 941 | Grayteesah | 0 |  |  | 0 | 48 | 0 | 0 |  | 0 | 48 |
| 425 | Al Warqa'A Fifth | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 891 | Hatta | 0 |  |  | 0 | 316 | 0 | 0 |  | 0 | 316 |
| 971 | Saih Al Dahal | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 111 | Al Corniche | 0 |  |  | 0 | 1,617 | 0 | 0 |  | 0 | 1,617 |
| 512 | Hessyan Second | 0 |  |  | 0 | 2 | 0 | 0 |  | 0 | 2 |
| 242 | Al Qusais Industrial First | 0 |  |  | 0 | 2,763 | 0 | 0 |  | 0 | 2,763 |
| 813 | Al Rowaiyah Second | 0 |  |  | 0 | 6 | 0 | 0 |  | 0 | 6 |
| 826 | Le Hemaira | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 735 | Al Meryal | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 311 | Al Shindagha | 0 |  |  | 0 | 28 | 0 | 0 |  | 0 | 28 |
| 831 | Lehbab Second | 0 |  |  | 0 | 137 | 0 | 0 |  | 0 | 137 |
| 916 | Al Yufrah 2 | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 918 | Al Yufrah 3 | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 369 | Al Qouz IndustrialFourth | 0 |  |  | 0 | 805 | 0 | 0 |  | 0 | 805 |
| 265 | Oud Al Muteena First | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 592 | Jabal Ali Second | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 283 | Aleyas | 0 |  |  | 0 | 25 | 0 | 0 |  | 0 | 25 |
| 917 | Al Marmoom | 0 |  |  | 0 | 49 | 0 | 0 |  | 0 | 49 |
| 593 | Jabal Ali Third | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 266 | Oud Al Muteena Second | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 131 | Al Hamriya Port | 0 |  |  | 0 | 226 | 0 | 0 |  | 0 | 226 |
| 914 | Umm Nahad Fourth | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 847 | Umm Eselay | 0 |  |  | 0 | 1 | 0 | 0 |  | 0 | 1 |
| 821 | Mereiyeel | 0 |  |  | 0 | 0 | 0 | 0 |  | 0 | 0 |
| 121 | Corniche Deira | 0 |  |  | 0 | 133 | 0 | 0 |  | 0 | 133 |
