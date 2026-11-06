"""Database connection. DATABASE_URL comes from the environment (see pipeline/.env.example)."""
from __future__ import annotations

import os

import psycopg


def connect() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL is not set. See pipeline/.env.example.")
    return psycopg.connect(url)
