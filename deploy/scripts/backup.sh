#!/usr/bin/env bash
# Nightly database backup, keeps the last 7. Installed by the runbook as a cron job.
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${BACKUP_DIR:-$HOME/backups}"; mkdir -p "$DIR"
OUT="$DIR/dpi-$(date +%Y%m%d-%H%M).dump"
docker compose exec -T db pg_dump -U dpi -d dpi -Fc > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
ls -1t "$DIR"/dpi-*.dump | tail -n +8 | xargs -r rm --
echo "Backup written: $OUT"
