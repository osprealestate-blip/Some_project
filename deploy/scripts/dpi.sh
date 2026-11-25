#!/usr/bin/env bash
# Runs the `dpi` pipeline command against the VPS database, in a throwaway Python container (nothing installed on the host).
# Use from anywhere on the server:  bash ~/some_project/deploy/scripts/dpi.sh compute-metrics
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
DBC="$(docker compose ps -q db)"
NET="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$DBC")"
docker run --rm --network "$NET" -e DATABASE_URL="postgresql://dpi:${DB_PASSWORD}@db:5432/dpi" \
  -v "$PWD/..:/repo" -w /repo python:3.12-slim bash -c \
  'pip install -q --no-cache-dir -e pipeline >/dev/null 2>&1 && dpi "$@"' _ "$@"
