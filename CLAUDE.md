# CLAUDE.md

Project: Dubai building-by-building property intelligence web app.

Stack: Next.js 15 (TypeScript, Tailwind 4) in `web/`, MapLibre GL + OpenFreeMap, PostgreSQL + PostGIS
(Supabase) with SQL in `db/migrations/`, Python data pipeline in `pipeline/`, Vercel hosting.

## Rules
- Never scrape Property Finder, Bayut, agency or developer websites.
- Data sources: DLD / Dubai Data open data, KHDA, DHA (Sheryan facilities), RTA, OpenStreetMap, and our own
  data in `data/own` (internal only until a lawyer approves public use).
- Never expose personal data (names, phones, IDs, unit-level tenant info). Public tables carry none.
- Every displayed figure must carry its source and date. Estimates are labelled as estimates and show the
  disclaimer: "Estimate based on DLD data. Not a valuation or financial advice."
- Keep secrets in environment variables; never commit `.env`, keys, databases or raw data files.
- Show OpenFreeMap/OSM attribution on every map, plus Dubai Municipality for community boundaries.
- No nationality or demographic labelling of buildings; no conflict or security speculation.

## Current phase
Phase 1 launch (about 12 weeks), communities: Dubai Marina (DM 392 "Marsa Dubai"), JVC (DM 681 "Al Barsha
South Fourth"), Business Bay (DM 346). Launch features: 3D map, building and community pages, fair-price
checker, basic Nearby panel, rent increase calculator. Commute, monthly cost, Golden Visa, construction alert,
currencies and Arabic are Phase 1b.

Build order: M0 setup → M1 data spike and import → M2 building matching → M3 3D map → M4 building pages →
M5 fair-price checker → M6 Nearby + rent calculator → M7 QA and soft launch.

Before writing matching or calculation code, inspect dataset columns with `dpi profile <file>` and document
them in `docs/datasets.md`.

## Commands
- Web: `cd web && npm ci && npm run dev` · checks: `npm run typecheck && npm test && npm run build`
- Pipeline: `cd pipeline && python -m venv .venv && .venv/bin/pip install -e '.[dev]' && .venv/bin/pytest`
- Schema: apply `db/migrations/*.sql` in order (needs PostGIS and pg_trgm).

## Reference code
osp-crm (osprealestate-blip/osp-crm) is read-only reference. Copy logic from it, never commit to it. Useful:
`backend/app/services/market_transactions.py` (DLD importer), `community_map.py` (name resolver),
`market_projects.py` (project/developer inference), `seed_data/dld_residential_sale_index.csv`.
