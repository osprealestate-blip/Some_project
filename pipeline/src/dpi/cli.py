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
    args = parser.parse_args(argv)

    if args.cmd == "profile":
        cols = profile_csv(args.path, args.limit)
        sys.stdout.write(to_markdown(args.title or args.path.name, cols))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
