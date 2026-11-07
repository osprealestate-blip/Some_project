# CLAUDE.md

Project: Dubai building-by-building property intelligence web app.

Stack: Next.js 15 (TypeScript, Tailwind 4) in `web/`, MapLibre GL + OpenFreeMap, PostgreSQL + PostGIS
(Supabase) with SQL in `db/migrations/`, Python data pipeline in `pipeline/`, Vercel hosting.

## Rules
- Never scrape Property Finder, Bayut, agency or developer websites.
- Data sources: DLD / Dubai Data open data, KHDA, DHA (Sheryan facilities), RTA, OpenStreetMap, and our own
  data in `data/own` (the Green List: only its market fields may be shown, never owner details).
- Never expose personal data (names, phones, IDs, unit-level tenant info). Public tables carry none.
- Every displayed figure must carry its source and date. Estimates are labelled as estimates and show the
  disclaimer: "Estimate based on DLD data. Not a valuation or financial advice."
- Keep secrets in environment variables; never commit `.env`, keys, databases or raw data files.
- Show OpenFreeMap/OSM attribution on every map, plus Dubai Municipality for community boundaries.
- No nationality or demographic labelling of buildings; no conflict or security speculation.

## Current phase
Phase 1 launch, lifestyle-led. DLD data for all of Dubai is loaded; building pages are hand-checked first in
Dubai Marina (DM 392 "Marsa Dubai"), JVC (DM 681 "Al Barsha South Fourth") and Business Bay (DM 346).
Launch features: 3D map, building and community pages, fair-price checker, Nearby panel with a basic Life
Score, rent increase calculator. Free, no login. English only (layout RTL-ready). Commute, monthly cost,
Golden Visa, construction alert, currencies and Arabic are Phase 1b. Runs locally first; hosting is chosen
before launch (Vercel Hobby is non-commercial).

Photos: only free-licence images (Wikimedia Commons, Mapillary) with credit, our own photos, or a map
snapshot. Never copy photos from portals or developer sites.

## How work is split
Opus plans and reviews; Sonnet does one task sheet at a time from `docs/plan/`. A worker reads `CLAUDE.md`,
its sheet and the files the sheet lists, nothing more. See `docs/plan/README.md`.

Build order: M0 setup → M1 data spike and import → M2 building matching → M3 3D map → M4 building pages →
M5 fair-price checker → M6 Nearby + rent calculator → M7 QA and soft launch.

Before writing matching or calculation code, inspect dataset columns with `dpi profile <file>` and document
them in `docs/datasets.md`.

## Commands
Ports: web app on **3100**, database on **5433** (osp-crm uses 3000 and 5432 on the same PC). Full steps in
`README.md`.
- Database: `docker compose up -d db` (applies `db/migrations/` on first start; data persists in the `dbdata`
  volume, never run `docker compose down -v` without asking).
- Web: `cd web && npm ci && npm run dev` (http://localhost:3100) · checks: `npm run typecheck && npm test && npm run build`
- Pipeline: `cd pipeline && python -m venv .venv && .venv/bin/pip install -e '.[dev]' && .venv/bin/pytest`
- `dpi` needs `DATABASE_URL` in the environment (not read from `.env`):
  `postgresql://dpi:dpi_local_only@localhost:5433/dpi` (see `pipeline/.env.example`).
- Load data, from the repo root: `dpi load-communities` first (234 rows, 3 launch), then
  `dpi import-dld --kind sale|rent --source-date YYYY-MM-DD <file.csv>` for each part file in `data/raw/`.
  Imports upsert on the DLD reference, so re-running or resuming a file is safe.
- Profile a dataset: `dpi profile <file.csv>`.

## Reference code
osp-crm (osprealestate-blip/osp-crm) is read-only reference. Copy logic from it, never commit to it. Useful:
`backend/app/services/market_transactions.py` (DLD importer), `community_map.py` (name resolver),
`market_projects.py` (project/developer inference), `seed_data/dld_residential_sale_index.csv`.
