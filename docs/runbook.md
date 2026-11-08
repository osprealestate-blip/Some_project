# Runbook: load the data and run the app

Order matters. Every step can be re-run safely. Commands run from the repo root with the pipeline venv
(`pipeline/.venv/bin/dpi`, or `pipeline\.venv\Scripts\dpi` on Windows) and `DATABASE_URL` set
(see `pipeline/.env.example`; the local database listens on port 5433).

| Step | Command | What it does |
| --- | --- | --- |
| 1 | `dpi migrate` | Applies new files in `db/migrations/` (0003 adds matching and summary tables). Needed once on a database made before 0003. |
| 2 | `dpi load-communities` | Community polygons (already done on the dev PC). |
| 3 | `dpi import-dld --kind sale --source-date 2026-11-02 <sales csv>` (each part) | DLD sales (already done). |
| 4 | `dpi import-dld --kind rent --source-date <date> <rent csv>` (each part) | Ejari rents (already done). |
| 4b | `dpi rematch-communities` | Fills communities for stored rows using the latest name fixes (from PR #6). Run before step 5. |
| 5 | `dpi match-buildings [--crosswalk <building_crosswalk.csv>] [--dld-buildings <buildings csv>]` | M2: one building per sale name in each community, aliases, project links, rents per project. The crosswalk from `python -m dpi.spikes.greenlist_crosswalk` adds DLD land numbers; the DLD buildings file then adds floors. Both are optional. |
| 6 | `dpi place-buildings --fetch --save-osm data/clean/osm_buildings.json` | Map positions from named OpenStreetMap buildings in the launch areas (default `--communities 392,681,346`; pass `--communities ""` for all of Dubai). Next time, `--osm-json data/clean/osm_buildings.json` re-uses the download. Hand positions in `db/seeds/manual_positions.csv` (slug, lat, lng) always win. |
| 7 | `dpi compute-metrics` | 12-month medians, year-on-year change, yields per building and community, monthly community series. Re-run after every import. |
| 8 | `dpi load-pois --source-date <date> --khda <school_search csv> --sheryan <sheryan_facility_detail csv> --fetch-osm --save-osm data/clean/osm_pois.json` | Nearby places for the Life Score. |
| 9 | `cd web && npm ci && npm run dev` with `DATABASE_URL` in `web/.env.local` | App on http://localhost:3100 |

Each command prints counts. Check after step 5 that the launch areas have most sales linked, and after step 6
how many buildings are still unplaced: those are the ones to hand-place (step 6's CSV).

## Copying to a hosted database (temporary online site)

The hosted site reads its own database. `dpi push-public` copies only the public tables the web app reads:
all communities, community figures and nearby places, plus buildings, building figures and the last 10 years of
sales and rents for the launch areas. Sales and rent rows carry no buyer, seller, owner or tenant fields (the
importer never reads them). It empties those tables on the target first, so it can be re-run after each refresh.

1. Create the schema on the hosted database once (apply `db/migrations/*.sql` in order).
2. Put the hosted connection string in `pipeline/.env.hosted` (never committed, never pasted in chat).
3. Run, with `DATABASE_URL` pointing at the local database:

   ```bash
   export HOSTED_DATABASE_URL="$(grep -oP '(?<=HOSTED_DATABASE_URL=).*' pipeline/.env.hosted)"
   pipeline/.venv/bin/dpi push-public            # --communities 392,681,346 --years 10 by default
   ```

## Hand-checking a launch area (M7)

1. Open `/community/392` (then 681, 346) and go down the building list.
2. For each building: is the name right, is the dot on the map on the right tower, do the figures look sane?
3. Wrong position: add `slug,lat,lng,note` to `db/seeds/manual_positions.csv` and re-run step 6.
4. Two pages for one tower (spelling variants): note both slugs; a merge list is the next pipeline change.
5. Set `verified_at` on checked buildings: `update buildings set verified_at = now(), verified_by = '<initials>' where slug = '...'`.

## Tests

- Web: `cd web && npm run typecheck && npm test && npm run build`
- Pipeline: `cd pipeline && .venv/bin/pytest`. The end-to-end test runs only with `TEST_DATABASE_URL` pointing at an
  empty throwaway PostGIS database (it drops the schema). CI provides one.
- Synthetic data for a quick UI look (all values made up): `python pipeline/tests/synthetic.py <dir>`, then steps 3 to 8
  with those files on a throwaway database.
