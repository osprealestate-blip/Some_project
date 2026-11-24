#!/usr/bin/env bash
# Copies the data from Supabase into the VPS database. Run on the server, from deploy/, with the stack's db running.
# Needs the Supabase *session pooler* string (port 5432, NOT 6543) of the dpi_push login. It is typed hidden; nothing is saved.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f "$HOME/.dpi.env" ]; then
  # A file holding the line HOSTED_DATABASE_URL=... (chmod 600). Port 6543 is switched to 5432: pg_dump needs the session pooler.
  SRC="$(grep -m1 '^HOSTED_DATABASE_URL=' "$HOME/.dpi.env" | cut -d= -f2- | tr -d '\r"' | sed 's/:6543\//:5432\//')"
  [ -n "$SRC" ] || { echo "No HOSTED_DATABASE_URL line in ~/.dpi.env"; exit 1; }
else
  read -r -s -p "Paste the Supabase session-pooler connection string (dpi_push, port 5432): " SRC; echo
fi
export SRC
mkdir -p ../backups
echo "1/4 Downloading from Supabase (a few minutes)..."
docker run --rm -e SRC -v "$PWD/../backups:/out" postgres:17 sh -c '
  # Skip tables/sequences this login cannot read (for example ones created after its grants), and say which.
  EXCL=$(psql "$SRC" -Atc "select format(\"--exclude-table=public.%I\", c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=\"public\" and ((c.relkind in (\"r\",\"p\") and not has_table_privilege(c.oid,\"select\")) or (c.relkind=\"S\" and not has_sequence_privilege(c.oid,\"select\")))" | tr "\n" " ")
  echo "Skipped (no read access): ${EXCL:-none}"
  pg_dump "$SRC" --schema=public --data-only --no-owner --no-privileges --disable-triggers -Fc $EXCL -f /out/supabase-data.dump
'
echo "2/4 Loading into the VPS database..."
docker compose exec -T db pg_restore -U dpi -d dpi --data-only --disable-triggers --no-owner < ../backups/supabase-data.dump
echo "3/4 Recording the migrations so 'dpi migrate' knows they are applied..."
{
  echo "create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now());"
  for f in ../db/migrations/*.sql; do echo "insert into schema_migrations (name) values ('$(basename "$f")') on conflict do nothing;"; done
} | docker compose exec -T db psql -U dpi -d dpi -v ON_ERROR_STOP=1
echo "4/4 Updating statistics..."
docker compose exec -T db psql -U dpi -d dpi -c "analyze;"
echo "Done. Compare counts with: bash scripts/counts.sh"
