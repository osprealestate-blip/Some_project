#!/usr/bin/env bash
# One command to bring the server up to date with main. Run on the server:  bash ~/some_project/deploy/scripts/deploy.sh
# It pulls main, applies any database migration not yet recorded, rebuilds and restarts what changed, and prints the state.
# Add `metrics` to also recompute the summary figures afterwards:  bash ~/some_project/deploy/scripts/deploy.sh metrics
set -euo pipefail
cd "$(dirname "$0")/.."
git -C .. fetch origin main && git -C .. merge --ff-only origin/main
docker compose up -d db
PSQL="docker compose exec -T db psql -U dpi -d dpi -v ON_ERROR_STOP=1 -q"
$PSQL -c "create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now());"
for f in ../db/migrations/*.sql; do
  n="$(basename "$f")"
  if [ "$($PSQL -At -c "select count(*) from schema_migrations where name='$n'")" = "0" ]; then
    echo "Applying migration $n"
    $PSQL < "$f"
    $PSQL -c "insert into schema_migrations (name) values ('$n') on conflict do nothing;"
  fi
done
PROFILE=""; [ "${ROUTING_ENABLED:-$(grep -oP '(?<=^ROUTING_ENABLED=).*' .env || echo 0)}" = "1" ] && PROFILE="--profile routing"
docker compose $PROFILE up -d --build
docker image prune -f >/dev/null
[ "${1:-}" = "metrics" ] && bash scripts/dpi.sh compute-metrics
docker compose ps
