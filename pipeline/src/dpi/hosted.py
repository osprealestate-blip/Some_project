"""Logins for the hosted database whose passwords never leave this computer.

`dpi hosted-login` makes a random password, writes the full connection string to
pipeline/.env.hosted (git-ignored) and prints only a SCRAM-SHA-256 verifier. The verifier
is what Postgres stores for a password: it lets the server check a login but cannot be
turned back into the password, so it is safe to hand to whoever creates the role.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from pathlib import Path
from urllib.parse import quote

ITERATIONS = 4096


def scram_verifier(password: str, salt: bytes | None = None, iterations: int = ITERATIONS) -> str:
    salt = salt or secrets.token_bytes(16)
    salted = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    client_key = hmac.new(salted, b"Client Key", hashlib.sha256).digest()
    stored_key = hashlib.sha256(client_key).digest()
    server_key = hmac.new(salted, b"Server Key", hashlib.sha256).digest()
    b64 = lambda b: base64.b64encode(b).decode()  # noqa: E731
    return f"SCRAM-SHA-256${iterations}:{b64(salt)}${b64(stored_key)}:{b64(server_key)}"


def pooler_url(role: str, project_ref: str, password: str, host: str) -> str:
    """Supabase Session pooler string (port 5432, works over IPv4)."""
    return f"postgresql://{role}.{project_ref}:{quote(password, safe='')}@{host}:5432/postgres?sslmode=require"


def set_env_line(path: Path, name: str, value: str) -> None:
    """Add or replace NAME=value in a dotenv file, keeping the other lines."""
    lines = path.read_text().splitlines() if path.exists() else []
    lines = [ln for ln in lines if not ln.startswith(f"{name}=")] + [f"{name}={value}"]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n")


def read_env_line(path: Path, name: str) -> str | None:
    if not path.exists():
        return None
    for ln in path.read_text().splitlines():
        if ln.startswith(f"{name}="):
            return ln.split("=", 1)[1].strip()
    return None
