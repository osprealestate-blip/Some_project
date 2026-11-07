# Dubai building intelligence

Dubai, building by building: real prices, rents and yields from official DLD open data on a 3D map.

| Folder | What it holds |
| --- | --- |
| `web/` | Next.js app (map, building pages, tools) |
| `pipeline/` | Python data pipeline (profile, import, clean, match, metrics), command `dpi` |
| `db/migrations/`, `db/seeds/` | PostgreSQL + PostGIS schema and seed data |
| `data/raw`, `data/clean`, `data/own` | Local data files, never committed |
| `web/app/` | Routes: `/` map, `/community/[code]`, `/building/[slug]`, `/tools/fair-price`, `/tools/rent-increase` (pages are placeholders until M4–M6) |
| `docs/` | Dataset notes (`datasets.md`), decisions, task sheets (`plan/`) |

See `CLAUDE.md` for project rules.

## Ports

| Service | Port | Why |
| --- | --- | --- |
| Web app (Next.js) | **3100** | 3000 is used by osp-crm |
| Database (PostGIS) | **5433** on your PC (5432 inside the container) | 5432 is used by osp-crm's database |

## What you need

- Docker Desktop (for the database)
- Node.js 22 and npm (for the web app)
- Python 3.11 or newer (for the data pipeline)

## Start the app

Run these from the repository root.

1. **Start the database.** The first start creates the tables from `db/migrations/`.

   ```bash
   docker compose up -d db
   ```

2. **Start the web app**, then open http://localhost:3100.

   ```bash
   cd web
   npm ci
   npm run dev
   ```

To stop the database: `docker compose stop db`. Your data stays in the `dbdata` Docker volume.
`docker compose down -v` deletes that volume and every loaded row, so avoid it unless you mean to reload.

## Load the data (sales, rents, communities)

The data is loaded once into the local database and stays there between restarts. You only repeat these
steps after `docker compose down -v`, or when a newer DLD export arrives.

### 1. Set up the pipeline

```bash
cd pipeline
python -m venv .venv
.venv/bin/pip install -e '.[dev]'      # Windows: .venv\Scripts\pip install -e ".[dev]"
cp .env.example .env
```

The `dpi` command reads `DATABASE_URL` from the environment, not from `.env` directly. Set it in the
terminal you run the commands in:

```bash
export DATABASE_URL=postgresql://dpi:dpi_local_only@localhost:5433/dpi
# Windows PowerShell: $env:DATABASE_URL = "postgresql://dpi:dpi_local_only@localhost:5433/dpi"
```

### 2. Load the 234 community boundaries

Run from the repository root (the default file path is relative to it):

```bash
pipeline/.venv/bin/dpi load-communities
```

It prints `communities: 234 rows, 3 launch`. The importer needs these to tie each sale and rent to a
community, so load them first.

### 3. Import DLD sales and rent contracts

Put the Dubai Pulse CSV downloads in `data/raw/` (never committed). Import each file, giving the date the
file was downloaded as `--source-date`:

```bash
pipeline/.venv/bin/dpi import-dld --kind sale --source-date 2026-11-02 data/raw/transactions_2026-11-02_17-44-57_0001.csv
pipeline/.venv/bin/dpi import-dld --kind rent --source-date 2026-10-19 data/raw/rent_contracts_2026-10-19_17-59-02_0001.csv
```

Repeat for every part of a multi-part export. Each run prints rows loaded, rows excluded by rule
(`too_small`, `price_too_low`, `future_date`, `date_too_early`, `multi_unit`) and area names that did not
match a community. Mortgages and gifts are counted and skipped, and buyer, seller, owner and tenant columns
are never read.

Re-running a file is safe: rows are keyed on the DLD reference, so nothing is added twice. That also means an
import that stopped part way can simply be started again.

Large imports need disk space. Docker stores the database on drive C on Windows; keep at least 10 GB free,
because a full drive makes Docker lock the database as read-only until Docker is restarted.

### 4. Check what loaded

```bash
docker compose exec db psql -U dpi -d dpi -c "select count(*) from transactions; select count(*) from rent_contracts;"
```

As of 7 Nov 2026 the local database held about 1.39 million sales and 1.69 million rent contracts.
About 21% of sales and 29% of rents are not yet tied to a community (name mismatches such as Palm
Jumeirah); those are fixed in the name resolver, not by hand.

### Profile a new file

Before writing matching or calculation code against a new dataset, profile it and record the columns in
`docs/datasets.md`:

```bash
pipeline/.venv/bin/dpi profile data/raw/some_file.csv
```

## Checks

```bash
cd web && npm run typecheck && npm test && npm run build
cd pipeline && .venv/bin/pytest -q
```

CI runs the same checks plus a migration check on every pull request.

## Attribution

Map data © OpenStreetMap contributors (ODbL), tiles by OpenFreeMap. Community boundaries: Dubai Municipality,
Dubai Government open data licence. Sales and rent figures: Dubai Land Department open data.
