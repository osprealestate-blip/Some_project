# Datasets

One section per downloaded file, produced with `dpi profile <file> --title "<name>"` and then annotated by hand.
Record the download URL, the download date and the licence for each.

## Open questions (M1)
- Does Registered Freehold Units carry floor and unit numbers?
- Do transaction and rent files carry a land number or project number that links to the land registry?
- Where do DLD bulk downloads live now (Dubai Pulse vs the new Dubai Data portal), and is there an API?
- Is the DLD service charge index downloadable? Is there an RTA GTFS feed?

## Bundled files
### `web/public/data/dubai_communities.geojson`
234 community polygons copied from osp-crm (2026-10-26 fetch): 226 Dubai Municipality statistical
communities (`code` = community number) and 8 master-community outlines from OpenStreetMap (ODbL).
Confirm the Dubai Municipality licence on the official download page before launch.
