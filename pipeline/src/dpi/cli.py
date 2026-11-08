"""Command line entry point: `dpi profile <file.csv>` prints a column profile as Markdown."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dpi.profile import profile_csv, to_markdown


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dpi")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("profile", help="Profile a CSV's columns for docs/datasets.md")
    p.add_argument("path", type=Path)
    p.add_argument("--title", default=None)
    p.add_argument("--limit", type=int, default=200_000, help="rows to read (default 200,000)")
    lc = sub.add_parser("load-communities", help="Load community polygons into the database")
    lc.add_argument("--path", type=Path, default=Path("web/public/data/dubai_communities.geojson"))
    imp = sub.add_parser("import-dld", help="Import a DLD sales or rent contracts CSV")
    imp.add_argument("--kind", choices=["sale", "rent"], required=True)
    imp.add_argument("--source-date", required=True, help="YYYY-MM-DD, the date of the downloaded file")
    imp.add_argument("path", type=Path)
    mg = sub.add_parser("migrate", help="Apply new db/migrations files to an existing database")
    mg.add_argument("--dir", type=Path, default=None)
    mb = sub.add_parser("match-buildings", help="M2: build buildings from sale names and link sales and rents")
    mb.add_argument("--crosswalk", type=Path, help="building_crosswalk.csv from the Green List spike (optional)")
    mb.add_argument("--dld-buildings", type=Path, help="DLD buildings CSV, for floors (optional)")
    mb.add_argument("--min-sales", type=int, default=3)
    pb = sub.add_parser("place-buildings", help="Map positions from OpenStreetMap, hand placing and shared plots")
    pb.add_argument("--osm-json", type=Path, help="saved Overpass JSON (named buildings)")
    pb.add_argument("--fetch", action="store_true", help="download named OSM buildings from Overpass")
    pb.add_argument("--save-osm", type=Path, help="where to save the downloaded Overpass JSON")
    pb.add_argument("--manual", type=Path, default=Path("db/seeds/manual_positions.csv"))
    pb.add_argument("--communities", default="392,681,346", help="DM codes to place (comma separated, empty = all)")
    sub.add_parser("compute-metrics", help="Trailing 12-month medians, yields and monthly series")
    sub.add_parser("rent-backtest", help="How often rents placed by unit size land in the right tower (read-only)")
    lp = sub.add_parser("load-pois", help="Nearby places: KHDA schools, DHA facilities, OpenStreetMap")
    lp.add_argument("--khda", type=Path)
    lp.add_argument("--sheryan", type=Path)
    lp.add_argument("--osm-json", type=Path)
    lp.add_argument("--fetch-osm", action="store_true")
    lp.add_argument("--save-osm", type=Path)
    lp.add_argument("--source-date", required=True, help="YYYY-MM-DD of the files (or of the OSM download)")
    sub.add_parser("rematch-communities",
                   help="Fill the community for stored sales and rents that have none, using the latest name fixes")
    pp = sub.add_parser("push-public", help="Copy the public tables the web app reads to a hosted database")
    pp.add_argument("--target-env", default="HOSTED_DATABASE_URL",
                    help="environment variable holding the target connection string (never pass it on the command line)")
    pp.add_argument("--communities", default="392,681,346", help="DM codes whose sales and rents are copied")
    pp.add_argument("--years", type=int, default=10)
    args = parser.parse_args(argv)

    if args.cmd == "profile":
        cols = profile_csv(args.path, args.limit)
        sys.stdout.write(to_markdown(args.title or args.path.name, cols))
    elif args.cmd == "load-communities":
        from dpi import communities
        from dpi.db import connect

        with connect() as conn:
            total, launch = communities.load(conn, args.path)
        print(f"communities: {total} rows, {launch} launch")
    elif args.cmd == "import-dld":
        from datetime import date

        from dpi.db import connect
        from dpi.importers import dld

        with connect() as conn:
            resolver = _resolver(conn)
            report = dld.import_file(conn, args.path, args.kind, date.fromisoformat(args.source_date), resolver)
        print(report.render())
    elif args.cmd == "migrate":
        from dpi import migrate
        from dpi.db import connect

        with connect() as conn:
            done = migrate.run(conn, args.dir) if args.dir else migrate.run(conn)
        print("applied: " + (", ".join(done) if done else "nothing new"))
    elif args.cmd == "match-buildings":
        from dpi.db import connect
        from dpi.matching import buildings

        with connect() as conn:
            print(buildings.run(conn, args.crosswalk, args.dld_buildings, args.min_sales).render())
    elif args.cmd == "place-buildings":
        import json

        from dpi.db import connect
        from dpi.matching import osm

        codes = [c.strip() for c in args.communities.split(",") if c.strip()]
        with connect() as conn:
            data = None
            if args.osm_json:
                data = json.loads(args.osm_json.read_text(encoding="utf-8"))
            elif args.fetch:
                data = osm.fetch(osm.community_bbox(conn, codes))
                if args.save_osm:
                    args.save_osm.write_text(json.dumps(data), encoding="utf-8")
            print(osm.place(conn, data, args.manual, codes).render())
    elif args.cmd == "compute-metrics":
        from dpi.db import connect
        from dpi.metrics import compute

        with connect() as conn:
            print(compute.run(conn).render())
    elif args.cmd == "rent-backtest":
        from dpi.db import connect
        from dpi.matching import rents

        with connect() as conn:
            print(rents.backtest(conn).render())
    elif args.cmd == "load-pois":
        import json
        from datetime import date

        from dpi.db import connect
        from dpi.load import pois

        sd = date.fromisoformat(args.source_date)
        with connect() as conn:
            if args.khda:
                print("KHDA schools:", pois.replace_source(conn, "khda", sd, pois.read_khda(args.khda)))
            if args.sheryan:
                print("DHA facilities:", pois.replace_source(conn, "dha_sheryan", sd, pois.read_sheryan(args.sheryan)))
            data = None
            if args.osm_json:
                data = json.loads(args.osm_json.read_text(encoding="utf-8"))
            elif args.fetch_osm:
                data = pois.fetch_osm()
                if args.save_osm:
                    args.save_osm.write_text(json.dumps(data), encoding="utf-8")
            if data:
                print("OpenStreetMap places:", pois.replace_source(conn, "osm", sd, pois.read_osm(data)))
    elif args.cmd == "rematch-communities":
        from dpi.db import connect
        from dpi.importers import dld

        with connect() as conn:
            resolver = _resolver(conn)
            updated = dld.rematch_communities(conn, resolver)
        for table, n in updated.items():
            print(f"{table}: {n} rows now have a community")
        if resolver.unmatched:
            print("still unmatched (distinct raw areas):", len(resolver.unmatched))
    elif args.cmd == "push-public":
        import os

        import psycopg

        from dpi import push_public
        from dpi.db import connect

        target_url = os.environ.get(args.target_env)
        if not target_url:
            raise SystemExit(f"{args.target_env} is not set.")
        codes = [c.strip() for c in args.communities.split(",") if c.strip()]
        with connect() as src, psycopg.connect(target_url) as dst:
            print(push_public.run(src, dst, codes, args.years).render())
    return 0


def _resolver(conn):
    from dpi.names import CommunityRef, CommunityResolver

    with conn.cursor() as cur:
        cur.execute("select id, name_official, name_common from communities")
        resolver = CommunityResolver([CommunityRef(*r) for r in cur.fetchall()])
    if not resolver._by_key:
        raise SystemExit("No communities loaded. Run `dpi load-communities` first.")
    return resolver


if __name__ == "__main__":
    raise SystemExit(main())
