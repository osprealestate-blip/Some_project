# Building photos and off-plan projects

## Photos
Allowed (CLAUDE.md): free-licence images with credit (Wikimedia Commons, Mapillary), our own photos, or a map snapshot.
Never portals or developer sites. `dpi import-images` rejects those hosts, rows with no author credit and
non-free licences. Every image is stored hidden (`approved = false`) until a person approves it.

Bulk routes (run on the PC, `DATABASE_URL` set, migration 0006 applied with `dpi migrate`):
1. **Commons candidates.** `dpi find-commons-images --limit 100` looks up the busiest buildings and writes
   `data/clean/commons_candidates.csv` (author, licence and file page filled in). Open it, delete rows that do not
   show the building, then `dpi import-images data/clean/commons_candidates.csv --approve`.
2. **Our own photos.** Put the files in a folder with a `manifest.csv` (columns: building, file, title, primary;
   `building` is the page slug). Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in the environment (never in git) and
   create a public Storage bucket `building-images`. Then `dpi import-images manifest.csv --approve`.
   `--dry-run` checks every row without storing or uploading.
3. `dpi approve-images [slug ...]` approves what is pending. `dpi push-public` copies approved images to the hosted
   database (apply 0006 there first).

Mapillary has no manifest finder yet: it needs an API token from the owner.

## Off-plan
`/off-plan` lists towers with 3+ off-plan apartment sales in the last 12 months, from the sales already loaded
(no new source). Developer, status, % built and completion date appear once the DLD Projects file is loaded:
`dpi profile projects_*.csv`, then `dpi import-projects projects_*.csv` (joins by project name; it prints how many
matched and examples that did not). Phase-1 limits: only launch areas are on the hosted database, and towers
with no map position still appear in the list but not on the map.
