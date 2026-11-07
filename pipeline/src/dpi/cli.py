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
    sub.add_parser("rematch-communities",
                   help="Fill the community for stored sales and rents that have none, using the latest name fixes")
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
