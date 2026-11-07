"""`dpi migrate`: apply new files from db/migrations to an existing database, once each.

Docker only runs the migrations on the very first start, so a database created before a new migration
was added needs this. Databases created before this command existed already have 0001 and 0002 (and
any later file whose tables exist); those are recorded as applied without running them again.
"""
from __future__ import annotations

from pathlib import Path

DEFAULT_DIR = Path(__file__).resolve().parents[3] / "db" / "migrations"


def run(conn, migrations_dir: Path = DEFAULT_DIR) -> list[str]:
    files = sorted(migrations_dir.glob("*.sql"))
    applied: list[str] = []
    with conn.cursor() as cur:
        cur.execute("create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now())")
        cur.execute("select name from schema_migrations")
        done = {n for (n,) in cur.fetchall()}
        if not done:
            cur.execute("select to_regclass('public.communities') is not null")
            if cur.fetchone()[0]:  # created by docker before this table existed
                for f in files:
                    if f.name.startswith(("0001", "0002")):
                        cur.execute("insert into schema_migrations (name) values (%s)", (f.name,))
                        done.add(f.name)
        for f in files:
            if f.name in done:
                continue
            cur.execute(f.read_text(encoding="utf-8"))
            cur.execute("insert into schema_migrations (name) values (%s)", (f.name,))
            applied.append(f.name)
    conn.commit()
    return applied
