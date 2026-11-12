"""Building photos: bulk import from a manifest CSV, and a finder for free-licence Wikimedia Commons candidates.

Rules (CLAUDE.md): only free-licence images with credit, our own photos, or a map snapshot. Never portals or
developer sites. Rows are stored as approved = false; `--approve` (or a later review) makes them visible.

Manifest columns: building (slug), url or file, source (own|wikimedia|mapillary|map), author, licence,
licence_url, source_url, title, primary (yes/no). A local `file` is uploaded to Supabase Storage when
SUPABASE_URL and SUPABASE_SERVICE_KEY are set (bucket SUPABASE_BUCKET, default building-images).
"""
from __future__ import annotations

import csv
import json
import mimetypes
import os
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

SOURCES = {"own", "wikimedia", "mapillary", "map"}
BLOCKED_HOSTS = ("propertyfinder", "bayut", "dubizzle", "emaar.com", "damacproperties", "nakheel.com", "sobha")
FREE_LICENCE = re.compile(r"^(cc[ -]?by(-sa)?[ -]?\d(\.\d)?|cc0.*|public domain.*|pd.*)$", re.I)
COMMONS_API = "https://commons.wikimedia.org/w/api.php"


@dataclass
class ImageRow:
    building: str
    url: str
    source: str
    author: str = ""
    licence: str = ""
    licence_url: str = ""
    source_url: str = ""
    title: str = ""
    primary: bool = False


@dataclass
class ImportReport:
    inserted: int = 0
    skipped: list[str] = field(default_factory=list)

    def render(self) -> str:
        out = [f"images: {self.inserted} stored (hidden until approved)"]
        out += [f"skipped: {s}" for s in self.skipped]
        return "\n".join(out)


def check_row(r: ImageRow) -> str | None:
    """Why a row may not be stored, or None when it is fine."""
    if r.source not in SOURCES:
        return f"source must be one of {sorted(SOURCES)}"
    if not r.url.startswith("https://"):
        return "url must be https"
    host = urllib.parse.urlparse(r.url).netloc.lower() + " " + r.source_url.lower()
    if any(h in host for h in BLOCKED_HOSTS):
        return "portal / developer site images are not allowed"
    if r.source != "own":
        if not r.author.strip():
            return "author credit is required"
        if not r.licence.strip() or not FREE_LICENCE.match(r.licence.strip()):
            return f"licence '{r.licence}' is not a recognised free licence"
    return None


def read_manifest(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8-sig") as f:
        return [{(k or "").strip().lower(): (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def upload_file(path: Path, building: str) -> str:
    """Upload a local photo to Supabase Storage; returns its public URL."""
    base, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not base or not key:
        raise SystemExit("Local files need SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment (never in a file in git).")
    bucket = os.environ.get("SUPABASE_BUCKET", "building-images")
    obj = f"{building}/{re.sub(r'[^A-Za-z0-9._-]', '_', path.name)}"
    req = urllib.request.Request(
        f"{base.rstrip('/')}/storage/v1/object/{bucket}/{obj}", data=path.read_bytes(), method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": mimetypes.guess_type(path.name)[0] or "image/jpeg",
                 "x-upsert": "true"})
    urllib.request.urlopen(req, timeout=60).read()
    return f"{base.rstrip('/')}/storage/v1/object/public/{bucket}/{obj}"


def import_manifest(conn, path: Path, approve: bool = False, dry_run: bool = False, upload=upload_file) -> ImportReport:
    rep = ImportReport()
    base = path.parent
    for i, row in enumerate(read_manifest(path), start=2):
        slug = row.get("building", "")
        url = row.get("url", "")
        if not url and row.get("file"):
            local = (base / row["file"])
            if not local.is_file():
                rep.skipped.append(f"line {i}: file {row['file']} not found")
                continue
            if dry_run:
                url = "https://dry-run.invalid/" + local.name
            else:
                url = upload(local, slug)
        r = ImageRow(slug, url, row.get("source", "own" if row.get("file") else ""), row.get("author", ""),
                     row.get("licence", "Own" if row.get("file") else ""), row.get("licence_url", ""),
                     row.get("source_url", ""), row.get("title", ""), row.get("primary", "").lower() in ("yes", "y", "true", "1"))
        problem = check_row(r)
        if problem:
            rep.skipped.append(f"line {i} ({slug}): {problem}")
            continue
        with conn.cursor() as cur:
            cur.execute("select id from buildings where slug = %s", (slug,))
            b = cur.fetchone()
            if not b:
                rep.skipped.append(f"line {i}: no building with slug '{slug}'")
                continue
            if not dry_run:
                cur.execute(
                    "insert into building_images (building_id, url, source, author, licence, licence_url, source_url, title, "
                    "is_primary, approved) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                    "on conflict (building_id, url) do update set author = excluded.author, licence = excluded.licence, "
                    "title = excluded.title, is_primary = excluded.is_primary",
                    (b[0], r.url, r.source, r.author or None, r.licence or None, r.licence_url or None, r.source_url or None,
                     r.title or None, r.primary, approve))
        rep.inserted += 1
    if not dry_run:
        conn.commit()
    return rep


def approve(conn, slugs: list[str] | None = None) -> int:
    """Make stored images visible: for the given building slugs, or every pending image when none are given."""
    with conn.cursor() as cur:
        if slugs:
            cur.execute("update building_images set approved = true where not approved and building_id in "
                        "(select id from buildings where slug = any(%s))", (slugs,))
        else:
            cur.execute("update building_images set approved = true where not approved")
        n = cur.rowcount
    conn.commit()
    return n


# ---------- Wikimedia Commons candidates ----------

def _strip_html(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s or "")).strip()


def commons_candidates(name: str, community: str, fetch=None, limit: int = 5) -> list[ImageRow]:
    """Free-licence photos on Commons whose title or description mentions the building. For a person to review."""
    params = {
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": "6", "gsrlimit": str(limit * 3),
        "gsrsearch": f'"{name}" {community} Dubai', "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime",
        "iiurlwidth": "1200",
    }
    url = COMMONS_API + "?" + urllib.parse.urlencode(params)
    if fetch is None:
        req = urllib.request.Request(url, headers={"User-Agent": "dubai-building-intel/0.1 (image licence check)"})
        data = json.loads(urllib.request.urlopen(req, timeout=30).read())
    else:
        data = fetch(url)
    out: list[ImageRow] = []
    pages = (data.get("query") or {}).get("pages") or {}
    for p in sorted(pages.values(), key=lambda x: x.get("index", 0)):
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        if not str(info.get("mime", "")).startswith("image/") or info.get("mime") == "image/svg+xml":
            continue
        if info.get("width", 0) < info.get("height", 0):  # portrait shots are rarely facades; keep landscape
            continue
        licence = _strip_html((meta.get("LicenseShortName") or {}).get("value", ""))
        author = _strip_html((meta.get("Artist") or {}).get("value", ""))
        row = ImageRow("", info.get("thumburl") or info.get("url", ""), "wikimedia", author, licence,
                       (meta.get("LicenseUrl") or {}).get("value", ""), info.get("descriptionurl", ""),
                       p.get("title", "").removeprefix("File:"))
        if check_row(row) is None:
            out.append(row)
        if len(out) >= limit:
            break
    return out


def write_commons_manifest(conn, out: Path, communities: list[str], per_building: int = 3,
                           limit: int | None = None, fetch=None, sleep=None) -> int:
    """Look up busy buildings on Commons and write a manifest CSV to review. Nothing is stored in the database."""
    import time

    with conn.cursor() as cur:
        cur.execute(
            "select b.slug, b.name_en, coalesce(c.name_common, c.name_official) from buildings b "
            "join communities c on c.id = b.community_id "
            "left join building_summary s on s.building_id = b.id and s.rooms = -1 "
            "where c.dm_code = any(%s) and b.match_confidence >= 0.5 "
            "order by coalesce(s.sale_count_12m, 0) desc", (communities,))
        rows = [r for r in cur.fetchall()]
    n = 0
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["building", "url", "source", "author", "licence", "licence_url", "source_url", "title", "primary"])
        for slug, name, community in rows[:limit]:
            try:
                found = commons_candidates(name, community, fetch, per_building)
            except Exception as e:  # network or API hiccup: skip this building
                print(f"{slug}: {e}")
                continue
            for i, c in enumerate(found):
                w.writerow([slug, c.url, c.source, c.author, c.licence, c.licence_url, c.source_url, c.title,
                            "yes" if i == 0 else "no"])
                n += 1
            (sleep or time.sleep)(1.0)
    return n
