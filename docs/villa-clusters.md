# Villa and townhouse clusters

One map point per villa or townhouse **project** (a cluster), never one per villa. Built from the special-2025 audit
(870 clusters) plus a map point found by a 2GIS or Google lookup.

## What the app shows
- A cluster without a map point still has its page, search result, community listing and sitemap entry; it only has no dot.
- Map: an amber ring (halo = "this is an area") from zoom 10.5, clearly different from the coloured towers. A tap opens a card
  (`?villa=<slug>` in the URL): sales in 12 months, median price and price per sq ft, median rent where there are 3+ contracts,
  bedroom mix of the sales, plots in the cluster, sources with dates, and a link to its community.
- Page `/villas/<slug>`, search results ("Villa cluster"), the official community page (list of its clusters), the sitemap.
- No per-villa or unit data, no personal data, nothing invented: a cluster with no DLD sales matched by name shows no figures.

## Data
- Migration `0014_villa_clusters.sql`: `villa_clusters` (point, `geom_source` 2gis|google|osm|manual, `is_cluster_point`, audit counts,
  `match_names`) and `villa_cluster_summary` (12-month medians per bedroom count, same rules as `building_summary`).
- Sales are matched to a cluster by an exact project-name match (lower case, no punctuation) on `transactions.raw_project`,
  `property_type` villa or townhouse, `excluded is null`. Rents match `rent_contracts.raw_project`; a rent with no sub-type is counted
  (older imports have none), a rent whose sub-type is not villa/town is not.

## Loading
Input CSV columns: `project_slug, project, lng, lat, point_source, cluster_point, point_note, dm_code, type, plots, records,
size_median, already_in_app, match_names` (the audit CSV plus the lookup columns). Rows with `already_in_app=True` are skipped.
```
dpi migrate                                   # applies 0014
dpi load-villa-clusters clusters.csv          # dry run: checks, counts, matches, writes nothing
dpi load-villa-clusters clusters.csv --apply  # upsert clusters and rebuild their figures
```
The community is the given `dm_code`, else the Dubai Municipality polygon that contains the point. Re-running is safe; a row with no
point keeps a point already stored. Run it against the VPS database only after the dry run has been reviewed.

`master_community` and `match_dm_codes` (migration 0015) put a cluster on its community page when no single official area
is known, and stop a short project name matching another community's sales. To add map points later, fill `lng`, `lat`
and `point_source` in the same CSV and load it again: figures are rebuilt and stored points are kept.

## New towers from the property list
`dpi load-greenlist-towers towers.csv [--apply]` (columns `name, dm_code, master_community, land_number, sale_areas`)
adds a page with no map position for a tower that has none, and links DLD sales by exact name. Names only: no unit,
owner or tenant data. Dry run unless `--apply`.
