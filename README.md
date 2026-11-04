# Dubai building intelligence

Dubai, building by building: real prices, rents and yields from official DLD open data on a 3D map.

| Folder | What it holds |
| --- | --- |
| `web/` | Next.js app (map, building pages, tools) |
| `pipeline/` | Python data pipeline (profile, import, clean, match, metrics) |
| `db/migrations/` | PostgreSQL + PostGIS schema |
| `data/raw`, `data/clean` | Local data files, never committed |
| `docs/` | Dataset notes and decisions |

See `CLAUDE.md` for project rules and commands.

Map data © OpenStreetMap contributors (ODbL), tiles by OpenFreeMap. Community boundaries: Dubai Municipality,
Dubai Government open data licence.
