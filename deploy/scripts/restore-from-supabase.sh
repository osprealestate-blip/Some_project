#!/usr/bin/env bash
# Copies the data from Supabase into the VPS database, REPLACING what the VPS tables hold. Run on the server from deploy/,
# with the db container running. Reads the Supabase session-pooler string (dpi_push, port 5432) from ~/.dpi.env
# (line HOSTED_DATABASE_URL=...) or asks for it (hidden). Nothing is saved.
set -euo pipefail
cd "$(dirname "$0")/.."
# Only one restore at a time (two at once would overwrite each other's dump file).
exec 9>/tmp/dpi-restore.lock
flock -n 9 || { echo "Another restore is already running. Wait for it to finish."; exit 1; }
set -a; . ./.env; set +a

if [ -f "$HOME/.dpi.env" ]; then
  SRC="$(grep -m1 '^HOSTED_DATABASE_URL=' "$HOME/.dpi.env" | cut -d= -f2- | tr -d '\r"' | sed 's/:6543\//:5432\//')"
  [ -n "$SRC" ] || { echo "No HOSTED_DATABASE_URL line in ~/.dpi.env"; exit 1; }
else
  read -r -s -p "Paste the Supabase session-pooler connection string (dpi_push, port 5432): " SRC; echo
fi
export SRC
mkdir -p ../backups
DBC="$(docker compose ps -q db)"
[ -n "$DBC" ] || { echo "The db container is not running: docker compose up -d db"; exit 1; }
NET="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$DBC")"
# Dump and restore both use the postgres:17 tools: a dump file only loads with the same or a newer pg_restore.
PG="docker run --rm -i -v $PWD/../backups:/out"

echo "1/5 Downloading from Supabase (a few minutes)..."
$PG -e SRC -v "$PWD/scripts:/s:ro" postgres:17 bash /s/dump-inner.sh

echo "2/5 Emptying the VPS tables (this is a full replace)..."
docker compose exec -T db psql -U dpi -d dpi -v ON_ERROR_STOP=1 <<'SQL'
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname = 'public' and tablename not in ('spatial_ref_sys','schema_migrations') loop
    execute format('truncate table public.%I restart identity cascade', r.tablename);
  end loop;
end $$;
SQL

echo "3/5 Loading into the VPS database..."
$PG --network "$NET" -e PGPASSWORD="$DB_PASSWORD" postgres:17 \
  pg_restore -h db -U dpi -d dpi --data-only --disable-triggers --no-owner /out/supabase-data.dump

echo "4/5 Recording the migrations so 'dpi migrate' knows they are applied..."
{
  echo "create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now());"
  for f in ../db/migrations/*.sql; do echo "insert into schema_migrations (name) values ('$(basename "$f")') on conflict do nothing;"; done
} | docker compose exec -T db psql -U dpi -d dpi -v ON_ERROR_STOP=1

echo "5/5 Updating statistics..."
docker compose exec -T db psql -U dpi -d dpi -c "analyze;"
echo "Done. Compare counts with: bash scripts/counts.sh"
